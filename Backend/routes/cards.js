const express = require('express');
const { z } = require('zod');
const { userPool, withUserContext } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { validate } = require('../middleware/validate');
const { VALID_PATTERN_SLUGS } = require('../patterns');
const { BASE_RATING, getBounds, updateRatings } = require('../elo');
const { nextSrs } = require('../srs');

const router = express.Router();

const nextQuerySchema = z.object({
  pattern: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  exclude: z.string().optional(),
});
const attemptSchema = z.object({
  cardId: z.string().uuid(),
  selectedAnswer: z.string(),
  ms: z.number().int().nonnegative().optional(),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Fisher-Yates shuffle (returns a new array). Cards are stored with a strong
// "correct option first" bias from generation; shuffling per serve removes any
// positional tell so the slot a user clicks carries no information.
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// List all patterns with the user's per-pattern rating, mastery, and due count.
router.get('/patterns', requireAuth, async (req, res) => {
  try {
    const patternsQ = await userPool.query(
      'SELECT id, slug, name, blurb, sort_order FROM patterns ORDER BY sort_order'
    );
    const ratingsQ = await userPool.query(
      'SELECT subject, rating FROM user_ratings WHERE user_id = $1',
      [req.user.id]
    );
    const ratingBySlug = new Map(ratingsQ.rows.map((r) => [r.subject, r.rating]));

    // Total cards per pattern is public (cards table) — one grouped query.
    const totalsQ = await userPool.query(
      `SELECT p.slug, count(c.id)::int AS total
         FROM patterns p LEFT JOIN cards c ON c.pattern_id = p.id
        GROUP BY p.slug`
    );
    const totalBySlug = new Map(totalsQ.rows.map((r) => [r.slug, r.total]));

    // srs_state and attempts are RLS-owner-private — read inside withUserContext.
    const { dueRows, correctRows } = await withUserContext(req.user.id, async (client) => {
      const due = await client.query(
        `SELECT p.slug, count(*)::int AS due
           FROM srs_state s
           JOIN cards c ON c.id = s.card_id
           JOIN patterns p ON p.id = c.pattern_id
          WHERE s.due_at <= now()
          GROUP BY p.slug`
      );
      // Distinct cards answered CORRECTLY per pattern, for the coverage term.
      const correct = await client.query(
        `SELECT p.slug, count(DISTINCT a.card_id)::int AS correct
           FROM attempts a
           JOIN cards c ON c.id = a.card_id
           JOIN patterns p ON p.id = c.pattern_id
          WHERE a.is_correct
          GROUP BY p.slug`
      );
      return { dueRows: due.rows, correctRows: correct.rows };
    });
    const dueBySlug = new Map(dueRows.map((r) => [r.slug, r.due]));
    const correctBySlug = new Map(correctRows.map((r) => [r.slug, r.correct]));

    const out = patternsQ.rows.map((p) => {
      const rating = ratingBySlug.has(p.slug) ? ratingBySlug.get(p.slug) : BASE_RATING;
      const total = totalBySlug.get(p.slug) || 0;
      const coverage = total > 0 ? (correctBySlug.get(p.slug) || 0) / total : 0;
      const ratingTerm = Math.max(0, Math.min(1, (rating - 700) / 1300));
      const mastery = Math.round((0.7 * ratingTerm + 0.3 * coverage) * 100) / 100;
      return {
        slug: p.slug,
        name: p.name,
        blurb: p.blurb,
        sort_order: p.sort_order,
        rating,
        mastery,
        due: dueBySlug.get(p.slug) || 0,
      };
    });
    res.json(out);
  } catch (err) {
    console.error('Error listing patterns:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// One in-band, unseen card for the pattern (answers shuffled, no answer key).
router.get('/cards/next', requireAuth, validate(nextQuerySchema, 'query'), async (req, res) => {
  const { pattern, difficulty, exclude } = req.query;
  if (!VALID_PATTERN_SLUGS.includes(pattern)) {
    return res.status(400).json({ error: 'Invalid pattern' });
  }
  // Card ids already shown this session — only keep well-formed UUIDs.
  const seen = (exclude ? String(exclude).split(',') : []).filter((s) => UUID_RE.test(s));
  try {
    const ratingQ = await userPool.query(
      'SELECT rating FROM user_ratings WHERE user_id = $1 AND subject = $2',
      [req.user.id, pattern]
    );
    const elo = ratingQ.rows.length ? ratingQ.rows[0].rating : BASE_RATING;
    const { lower, upper } = getBounds(difficulty, elo);
    const cols = 'c.id, c.format, c.prompt, c.code, c.answer1, c.answer2, c.answer3, c.answer4, c.rating';
    const from = `cards c JOIN patterns p ON p.id = c.pattern_id`;
    // No-repeat is enforced by a correlated NOT EXISTS against `attempts`. Inside
    // withUserContext the attempts RLS auto-scopes to this user, so the subquery
    // sees only their attempts — no user_id predicate or pre-fetch needed.
    const notAttempted = 'NOT EXISTS (SELECT 1 FROM attempts a WHERE a.card_id = c.id)';

    // cards/patterns are public-read, so they remain readable inside the user context.
    const pick = await withUserContext(req.user.id, async (client) => {
      // Tier 1: in-band, not excluded, not previously attempted.
      let q = await client.query(
        `SELECT ${cols} FROM ${from}
           WHERE p.slug = $1 AND c.rating >= $2 AND c.rating <= $3
             AND c.id <> ALL($4::uuid[]) AND ${notAttempted}
           ORDER BY random() LIMIT 1`,
        [pattern, lower, upper, seen]
      );
      // Tier 2: any unseen (not excluded, not attempted).
      if (!q.rows.length) {
        q = await client.query(
          `SELECT ${cols} FROM ${from}
             WHERE p.slug = $1 AND c.id <> ALL($2::uuid[]) AND ${notAttempted}
             ORDER BY random() LIMIT 1`,
          [pattern, seen]
        );
      }
      // Tier 3: any card in the pattern (bank exhausted → allow a repeat).
      if (!q.rows.length) {
        q = await client.query(
          `SELECT ${cols} FROM ${from} WHERE p.slug = $1 ORDER BY random() LIMIT 1`,
          [pattern]
        );
      }
      return q.rows;
    });
    if (!pick.length) return res.status(404).json({ error: 'No cards found' });

    const c = pick[0];
    res.json({
      id: c.id,
      format: c.format,
      prompt: c.prompt,
      code: c.code,
      answers: shuffle([c.answer1, c.answer2, c.answer3, c.answer4]),
      rating: c.rating,
    });
  } catch (err) {
    console.error('Error fetching next card:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Grade an attempt. First attempt at a card is rated; every review writes SRS.
router.post('/attempts', requireAuth, validate(attemptSchema), async (req, res) => {
  const { cardId, selectedAnswer, ms } = req.body;
  try {
    const out = await withUserContext(req.user.id, async (client) => {
      const cardQ = await client.query(
        `SELECT c.correctanswer, c.explanation, c.rating, p.slug AS pattern_slug
           FROM cards c JOIN patterns p ON p.id = c.pattern_id
          WHERE c.id = $1`,
        [cardId]
      );
      if (!cardQ.rows.length) return { notFound: true };
      const card = cardQ.rows[0];
      const correct = selectedAnswer === card.correctanswer;

      const ratingQ = await client.query(
        'SELECT rating FROM user_ratings WHERE user_id = $1 AND subject = $2',
        [req.user.id, card.pattern_slug]
      );
      const current = ratingQ.rows.length ? ratingQ.rows[0].rating : BASE_RATING;
      const newRating = updateRatings(current, card.rating, correct ? 1 : 0);

      // Only the FIRST attempt at a card is rated. The UNIQUE(user_id, card_id)
      // constraint makes this atomic: under concurrent submissions the DB lets exactly
      // one insert win; the rest get DO NOTHING (no replay farming).
      const ins = await client.query(
        `INSERT INTO attempts (user_id, card_id, pattern_slug, is_correct, rating_after, ms)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (user_id, card_id) DO NOTHING
           RETURNING id`,
        [req.user.id, cardId, card.pattern_slug, correct, newRating, ms ?? null]
      );
      const firstAttempt = ins.rows.length > 0;

      if (firstAttempt) {
        await client.query(
          `INSERT INTO user_ratings (user_id, subject, rating, username, updated_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (user_id, subject)
             DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW()`,
          [req.user.id, card.pattern_slug, newRating, req.user.username]
        );
      }

      // SRS advances on EVERY review, not just the first attempt.
      const prevQ = await client.query(
        'SELECT box, reps, lapses FROM srs_state WHERE user_id = $1 AND card_id = $2',
        [req.user.id, cardId]
      );
      const prev = prevQ.rows.length ? prevQ.rows[0] : null;
      const srs = nextSrs(prev, correct);
      await client.query(
        `INSERT INTO srs_state (user_id, card_id, box, due_at, reps, lapses, last_result, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           ON CONFLICT (user_id, card_id) DO UPDATE
             SET box = EXCLUDED.box, due_at = EXCLUDED.due_at, reps = EXCLUDED.reps,
                 lapses = EXCLUDED.lapses, last_result = EXCLUDED.last_result, updated_at = NOW()`,
        [req.user.id, cardId, srs.box, srs.dueAt, srs.reps, srs.lapses, srs.lastResult]
      );

      return {
        correct,
        correctAnswer: card.correctanswer,
        explanation: card.explanation,
        rating: firstAttempt ? newRating : current,
        ratingDelta: firstAttempt ? newRating - current : 0,
        alreadyAnswered: !firstAttempt,
      };
    });
    if (out.notFound) return res.status(404).json({ error: 'Card not found' });
    res.json(out);
  } catch (err) {
    console.error('Error recording attempt:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// The user's per-pattern skill rating (defaults to BASE_RATING).
router.get('/me/ratings/:pattern', requireAuth, async (req, res) => {
  const { pattern } = req.params;
  if (!VALID_PATTERN_SLUGS.includes(pattern)) {
    return res.status(400).json({ error: 'Invalid pattern' });
  }
  try {
    const { rows } = await userPool.query(
      'SELECT rating FROM user_ratings WHERE user_id = $1 AND subject = $2',
      [req.user.id, pattern]
    );
    res.json({ pattern, rating: rows.length ? rows[0].rating : BASE_RATING });
  } catch (err) {
    console.error('Error fetching rating:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
