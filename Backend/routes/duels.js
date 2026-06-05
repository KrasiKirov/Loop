const express = require('express');
const { z } = require('zod');
const { authPool, userPool, withUserContext } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { validate } = require('../middleware/validate');
const { VALID_PATTERN_SLUGS } = require('../patterns');
const { BASE_RATING, expectedScore, updateRatings } = require('../elo');
const { shuffle } = require('../shuffle');

const router = express.Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const createSchema = z.object({
  patternSlug: z.string().optional(),
  size: z.number().int().optional(),
  opponentUsername: z.string().optional(),
});

const submitSchema = z.object({
  answers: z.array(
    z.object({
      cardId: z.string().uuid(),
      selectedAnswer: z.string(),
      ms: z.number().int().nonnegative(),
    })
  ),
});

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// The user's 'overall' duel rating (defaults to BASE_RATING when absent).
async function overallRating(client, userId) {
  const q = await client.query(
    "SELECT rating FROM user_ratings WHERE user_id = $1 AND subject = 'overall'",
    [userId]
  );
  return q.rows.length ? q.rows[0].rating : BASE_RATING;
}

// Upsert a user's 'overall' rating.
async function setOverall(client, userId, username, rating) {
  await client.query(
    `INSERT INTO user_ratings (user_id, subject, rating, username, updated_at)
       VALUES ($1, 'overall', $2, $3, NOW())
       ON CONFLICT (user_id, subject)
       DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW()`,
    [userId, rating, username]
  );
}

// Generate the ghost's score for a duel's cards, given the rating it plays at.
// Per card the ghost is correct with probability expectedScore(ghostRating, card.rating);
// each card costs 3000..6999 ms.
function ghostScore(cards, ghostRating) {
  let numCorrect = 0;
  let totalMs = 0;
  for (const c of cards) {
    if (Math.random() < expectedScore(ghostRating, c.rating)) numCorrect += 1;
    totalMs += 3000 + Math.floor(Math.random() * 4000);
  }
  return { numCorrect, totalMs };
}

// Compare two scores: higher numCorrect wins; tie broken by lower totalMs;
// exact tie (same correct AND same ms) is a draw. Returns outcome for the FIRST side.
function outcomeFor(mine, theirs) {
  if (mine.numCorrect > theirs.numCorrect) return 1;
  if (mine.numCorrect < theirs.numCorrect) return 0;
  if (mine.totalMs < theirs.totalMs) return 1;
  if (mine.totalMs > theirs.totalMs) return 0;
  return 0.5;
}

// POST /duels — create a ghost or real duel with a fixed set of random cards.
router.post('/duels', requireAuth, validate(createSchema), async (req, res) => {
  const { patternSlug, size, opponentUsername } = req.body;
  if (patternSlug !== undefined && !VALID_PATTERN_SLUGS.includes(patternSlug)) {
    return res.status(400).json({ error: 'Invalid pattern' });
  }
  const n = clamp(size === undefined ? 5 : size, 3, 10);
  try {
    // Resolve a real opponent up front (RLS-free user lookup via authPool).
    let opponentId = null;
    if (opponentUsername !== undefined) {
      const uq = await authPool.query('SELECT id FROM users WHERE username = $1', [
        opponentUsername,
      ]);
      if (!uq.rows.length) return res.status(404).json({ error: 'Opponent not found' });
      opponentId = uq.rows[0].id;
      if (opponentId === req.user.id) return res.status(400).json({ error: 'Cannot duel yourself' });
    }

    // Pick the cards (cards/patterns are public-read).
    let pickQ;
    if (patternSlug !== undefined) {
      pickQ = await userPool.query(
        `SELECT c.id FROM cards c JOIN patterns p ON p.id = c.pattern_id
          WHERE p.slug = $1 ORDER BY random() LIMIT $2`,
        [patternSlug, n]
      );
    } else {
      pickQ = await userPool.query('SELECT id FROM cards ORDER BY random() LIMIT $1', [n]);
    }
    if (pickQ.rows.length < 3) return res.status(400).json({ error: 'not enough cards' });
    const cardIds = pickQ.rows.map((r) => r.id);
    const isGhost = opponentId === null;

    const id = await withUserContext(req.user.id, async (client) => {
      const ins = await client.query(
        `INSERT INTO duels (challenger_id, opponent_id, pattern_slug, card_ids, is_ghost, status)
           VALUES ($1, $2, $3, $4, $5, 'pending')
           RETURNING id`,
        [req.user.id, opponentId, patternSlug ?? null, cardIds, isGhost]
      );
      return ins.rows[0].id;
    });

    res.json({ id, shareUrl: `/duel/${id}` });
  } catch (err) {
    console.error('Error creating duel:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /duels/mine — duels you're in, newest first.
router.get('/duels/mine', requireAuth, async (req, res) => {
  try {
    const rows = await withUserContext(req.user.id, async (client) => {
      const q = await client.query(
        `SELECT d.id, d.status, d.is_ghost, d.created_at, d.challenger_id, d.opponent_id
           FROM duels d
          ORDER BY d.created_at DESC`
      );
      return q.rows;
    });
    const names = await usernamesFor(
      rows.flatMap((d) => [d.challenger_id, d.opponent_id])
    );
    const out = rows.map((d) => {
      let opponent;
      if (d.is_ghost) opponent = 'Ghost';
      else if (d.challenger_id === req.user.id) opponent = names.get(d.opponent_id);
      else opponent = names.get(d.challenger_id);
      return {
        id: d.id,
        status: d.status,
        isGhost: d.is_ghost,
        opponent,
        createdAt: d.created_at,
      };
    });
    res.json(out);
  } catch (err) {
    console.error('Error listing duels:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Load a duel the caller participates in. Returns null if the duel isn't visible
// to the caller (RLS scopes duels SELECT to participants) or doesn't exist.
// NOTE: app_user has no SELECT on `users`, so usernames are resolved separately
// via authPool (see usernamesFor) rather than joined here.
async function loadDuel(client, duelId) {
  const q = await client.query('SELECT * FROM duels WHERE id = $1', [duelId]);
  return q.rows.length ? q.rows[0] : null;
}

// Resolve usernames for a set of user ids via the auth pool (full users access).
// Returns a Map(id -> username). Ignores nulls.
async function usernamesFor(ids) {
  const real = [...new Set(ids.filter(Boolean))];
  if (!real.length) return new Map();
  const q = await authPool.query('SELECT id, username FROM users WHERE id = ANY($1::uuid[])', [
    real,
  ]);
  return new Map(q.rows.map((r) => [r.id, r.username]));
}

// GET /duels/:id/play — the cards to play, never any answer key.
router.get('/duels/:id/play', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!UUID_RE.test(id)) return res.status(404).json({ error: 'Duel not found' });
  try {
    const out = await withUserContext(req.user.id, async (client) => {
      const duel = await loadDuel(client, id);
      if (!duel) return { notFound: true };

      const cardsQ = await client.query(
        `SELECT id, format, prompt, code, answer1, answer2, answer3, answer4, rating
           FROM cards WHERE id = ANY($1::uuid[])`,
        [duel.card_ids]
      );
      // Preserve the stored card order.
      const byId = new Map(cardsQ.rows.map((c) => [c.id, c]));
      const cards = duel.card_ids
        .map((cid) => byId.get(cid))
        .filter(Boolean)
        .map((c) => ({
          id: c.id,
          format: c.format,
          prompt: c.prompt,
          code: c.code,
          answers: shuffle([c.answer1, c.answer2, c.answer3, c.answer4]),
          rating: c.rating,
        }));

      const mineQ = await client.query(
        'SELECT 1 FROM duel_results WHERE duel_id = $1 AND user_id = $2',
        [id, req.user.id]
      );
      let opponent = 'Ghost';
      if (!duel.is_ghost) {
        const otherId =
          duel.challenger_id === req.user.id ? duel.opponent_id : duel.challenger_id;
        const names = await usernamesFor([otherId]);
        opponent = names.get(otherId);
      }

      return {
        duel: { id: duel.id, isGhost: duel.is_ghost, status: duel.status, opponent },
        cards,
        alreadySubmitted: duel.status === 'complete' || mineQ.rows.length > 0,
      };
    });
    if (out.notFound) return res.status(404).json({ error: 'Duel not found' });
    res.json(out);
  } catch (err) {
    console.error('Error loading duel play:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /duels/:id/submit — grade the caller's answers and resolve if ready.
router.post('/duels/:id/submit', requireAuth, validate(submitSchema), async (req, res) => {
  const { id } = req.params;
  if (!UUID_RE.test(id)) return res.status(404).json({ error: 'Duel not found' });
  const { answers } = req.body;
  try {
    const out = await withUserContext(req.user.id, async (client) => {
      const duel = await loadDuel(client, id);
      if (!duel) return { notFound: true };
      if (duel.status === 'complete') return { conflict: true };
      if (new Date(duel.expires_at) < new Date()) return { expired: true };

      const existing = await client.query(
        'SELECT 1 FROM duel_results WHERE duel_id = $1 AND user_id = $2',
        [id, req.user.id]
      );
      if (existing.rows.length) return { conflict: true };

      // Grade server-side against the duel's stored cards.
      const cardsQ = await client.query(
        'SELECT id, correctanswer, rating FROM cards WHERE id = ANY($1::uuid[])',
        [duel.card_ids]
      );
      const byId = new Map(cardsQ.rows.map((c) => [c.id, c]));
      const submittedBy = new Map(answers.map((a) => [a.cardId, a]));
      let numCorrect = 0;
      let totalMs = 0;
      for (const cid of duel.card_ids) {
        const card = byId.get(cid);
        const sub = submittedBy.get(cid);
        if (!sub) continue;
        if (sub.selectedAnswer === card.correctanswer) numCorrect += 1;
        totalMs += sub.ms;
      }

      await client.query(
        `INSERT INTO duel_results (duel_id, user_id, is_ghost, num_correct, total_ms)
           VALUES ($1, $2, false, $3, $4)
           ON CONFLICT (duel_id, user_id) WHERE user_id IS NOT NULL DO NOTHING`,
        [id, req.user.id, numCorrect, totalMs]
      );

      // Serialize concurrent submits on the SAME duel with a row lock. The second
      // submitter blocks on FOR UPDATE until the first commits, then (re-reading
      // under READ COMMITTED) sees the first's committed duel_results row. Without
      // this, two players could both observe "both results present" and resolve
      // twice (double-rate), or neither sees the other's uncommitted row and the
      // duel stays pending forever.
      const lockedQ = await client.query(
        'SELECT status FROM duels WHERE id = $1 FOR UPDATE',
        [id]
      );
      // Re-check status under the lock; a concurrent submit may have already resolved.
      if (lockedQ.rows.length && lockedQ.rows[0].status === 'complete') {
        return { conflict: true };
      }

      const mine = { numCorrect, totalMs };
      const cardRows = duel.card_ids.map((cid) => byId.get(cid)).filter(Boolean);

      // Determine readiness and the opponent's score.
      let opponentScore = null;
      let opponentId = null;
      let opponentName = null;
      let ready = false;
      let ghostRating = null;

      if (duel.is_ghost) {
        // Ghost plays at the challenger's current overall rating.
        ghostRating = await overallRating(client, duel.challenger_id);
        opponentScore = ghostScore(cardRows, ghostRating);
        opponentName = 'Ghost';
        ready = true;
      } else {
        opponentId =
          duel.challenger_id === req.user.id ? duel.opponent_id : duel.challenger_id;
        const names = await usernamesFor([opponentId]);
        opponentName = names.get(opponentId);
        const otherQ = await client.query(
          'SELECT num_correct, total_ms FROM duel_results WHERE duel_id = $1 AND user_id = $2',
          [id, opponentId]
        );
        if (otherQ.rows.length) {
          opponentScore = {
            numCorrect: otherQ.rows[0].num_correct,
            totalMs: otherQ.rows[0].total_ms,
          };
          ready = true;
        }
      }

      if (!ready) {
        return {
          yourScore: { numCorrect, totalMs },
          status: 'pending',
        };
      }

      // Resolve: atomically claim the duel. Belt-and-suspenders alongside the
      // FOR UPDATE lock — only the txn that flips pending->complete proceeds to
      // apply Elo, so resolution happens exactly once.
      const claimQ = await client.query(
        "UPDATE duels SET status = 'complete' WHERE id = $1 AND status = 'pending' RETURNING id",
        [id]
      );
      if (!claimQ.rows.length) {
        // Someone else resolved it first (should be precluded by the lock above).
        return { conflict: true };
      }

      const myOutcome = outcomeFor(mine, opponentScore);
      const myOverall = await overallRating(client, req.user.id);
      const myOpponentRatingForElo = duel.is_ghost
        ? ghostRating
        : await overallRating(client, opponentId);
      const myNew = updateRatings(myOverall, myOpponentRatingForElo, myOutcome);
      await setOverall(client, req.user.id, req.user.username, myNew);

      // For a real duel, the opponent already submitted — they must be rated too.
      // RLS forbids writing another user's user_ratings row in THIS context, so we
      // defer the opponent's update to a separate withUserContext(opponentId) below.
      let oppUpdate = null;
      if (!duel.is_ghost) {
        const oppOverall = await overallRating(client, opponentId);
        const oppOutcome = outcomeFor(opponentScore, mine);
        const oppNew = updateRatings(oppOverall, myOverall, oppOutcome);
        oppUpdate = { userId: opponentId, username: opponentName, rating: oppNew };
      }

      const outcomeWord = myOutcome === 1 ? 'win' : myOutcome === 0 ? 'loss' : 'draw';
      return {
        oppUpdate,
        yourScore: { numCorrect, totalMs },
        status: 'complete',
        result: {
          you: { numCorrect, totalMs, ratingDelta: myNew - myOverall },
          opponent: {
            name: opponentName,
            numCorrect: opponentScore.numCorrect,
            totalMs: opponentScore.totalMs,
          },
          outcome: outcomeWord,
        },
      };
    });
    if (out.notFound) return res.status(404).json({ error: 'Duel not found' });
    if (out.expired) return res.status(410).json({ error: 'Duel expired' });
    if (out.conflict) return res.status(409).json({ error: 'Already submitted' });

    // Apply the opponent's overall-rating update under THEIR own context (RLS:
    // user_ratings writes are self-only). This runs after the resolving txn that
    // marked the duel complete and rated the submitter.
    // Remaining rare window: if the process dies between the resolving commit and
    // this opponent update, the opponent isn't rated (the duel is still complete).
    // Acceptable for now; a SECURITY DEFINER resolver writing both ratings inside
    // the resolving txn would close it.
    if (out.oppUpdate) {
      const u = out.oppUpdate;
      await withUserContext(u.userId, async (client) => {
        await setOverall(client, u.userId, u.username, u.rating);
      });
      delete out.oppUpdate;
    }

    res.json(out);
  } catch (err) {
    console.error('Error submitting duel:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /duels/:id — a duel's summary; results only when complete.
router.get('/duels/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!UUID_RE.test(id)) return res.status(404).json({ error: 'Duel not found' });
  try {
    const out = await withUserContext(req.user.id, async (client) => {
      const duel = await loadDuel(client, id);
      if (!duel) return { notFound: true };

      let opponentName = 'Ghost';
      if (!duel.is_ghost) {
        const otherId =
          duel.challenger_id === req.user.id ? duel.opponent_id : duel.challenger_id;
        const names = await usernamesFor([otherId]);
        opponentName = names.get(otherId);
      }

      const base = {
        id: duel.id,
        status: duel.status,
        isGhost: duel.is_ghost,
        cards: duel.card_ids.length,
        you: {},
        opponent: { name: opponentName },
        winner: null,
        yourRatingDelta: null,
      };

      if (duel.status !== 'complete') return base;

      const resultsQ = await client.query(
        'SELECT user_id, is_ghost, num_correct, total_ms FROM duel_results WHERE duel_id = $1',
        [id]
      );
      const mine = resultsQ.rows.find((r) => r.user_id === req.user.id);
      // The "other" stored result row (a real opponent's). Ghosts have no row.
      const otherRow = resultsQ.rows.find((r) => r.user_id && r.user_id !== req.user.id);

      if (mine) {
        base.you = { numCorrect: mine.num_correct, totalMs: mine.total_ms };
      }
      if (!duel.is_ghost && otherRow) {
        base.opponent.numCorrect = otherRow.num_correct;
        base.opponent.totalMs = otherRow.total_ms;
        if (mine) {
          const oc = outcomeFor(
            { numCorrect: mine.num_correct, totalMs: mine.total_ms },
            { numCorrect: otherRow.num_correct, totalMs: otherRow.total_ms }
          );
          base.winner = oc === 1 ? 'you' : oc === 0 ? opponentName : 'draw';
        }
      }
      return base;
    });
    if (out.notFound) return res.status(404).json({ error: 'Duel not found' });
    res.json(out);
  } catch (err) {
    console.error('Error fetching duel:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
