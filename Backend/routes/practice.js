const express = require('express');
const { z } = require('zod');
const { userPool, withUserContext } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { validate } = require('../middleware/validate');
const VALID_SUBJECTS = require('../subjects');
const { BASE_RATING, getBounds, updateRatings } = require('../elo');

const router = express.Router();

const attemptSchema = z.object({
  subject: z.string().min(1),
  questionId: z.string().uuid(),
  selectedAnswer: z.string(),
});
const nextQuerySchema = z.object({
  subject: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  exclude: z.string().optional(),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Fisher-Yates shuffle (returns a new array). Answers are stored with a strong
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

router.get('/me/ratings/:subject', requireAuth, async (req, res) => {
  const { subject } = req.params;
  if (!VALID_SUBJECTS.includes(subject)) {
    return res.status(400).json({ error: 'Invalid subject' });
  }
  try {
    const { rows } = await userPool.query(
      'SELECT rating FROM user_ratings WHERE user_id = $1 AND subject = $2',
      [req.user.id, subject]
    );
    res.json({ subject, rating: rows.length ? rows[0].rating : BASE_RATING });
  } catch (err) {
    console.error('Error fetching rating:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/questions/next', requireAuth, validate(nextQuerySchema, 'query'), async (req, res) => {
  const { subject, difficulty, exclude } = req.query;
  if (!VALID_SUBJECTS.includes(subject)) {
    return res.status(400).json({ error: 'Invalid subject' });
  }
  // Question ids already shown this session — only keep well-formed UUIDs.
  const seen = (exclude ? String(exclude).split(',') : []).filter((s) => UUID_RE.test(s));
  try {
    const ratingQ = await userPool.query(
      'SELECT rating FROM user_ratings WHERE user_id = $1 AND subject = $2',
      [req.user.id, subject]
    );
    const elo = ratingQ.rows.length ? ratingQ.rows[0].rating : BASE_RATING;
    const { lower, upper } = getBounds(difficulty, elo);
    const table = subject.toLowerCase();
    const cols = 'id, question, answer1, answer2, answer3, answer4, score, subject';

    // Prefer in-band + unseen; then any unseen; then any (bank exhausted → allow a repeat).
    let pick = await userPool.query(
      `SELECT ${cols} FROM ${table}
         WHERE score >= $1 AND score <= $2 AND id <> ALL($3::uuid[])
         ORDER BY random() LIMIT 1`,
      [lower, upper, seen]
    );
    if (!pick.rows.length) {
      pick = await userPool.query(
        `SELECT ${cols} FROM ${table} WHERE id <> ALL($1::uuid[]) ORDER BY random() LIMIT 1`,
        [seen]
      );
    }
    if (!pick.rows.length) {
      pick = await userPool.query(`SELECT ${cols} FROM ${table} ORDER BY random() LIMIT 1`);
    }
    if (!pick.rows.length) return res.status(404).json({ error: 'No questions found' });

    const q = pick.rows[0];
    res.json({
      id: q.id,
      question: q.question,
      answers: shuffle([q.answer1, q.answer2, q.answer3, q.answer4]),
      score: q.score,
      subject: q.subject,
    });
  } catch (err) {
    console.error('Error fetching next question:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/attempts', requireAuth, validate(attemptSchema), async (req, res) => {
  const { subject, questionId, selectedAnswer } = req.body;
  if (!VALID_SUBJECTS.includes(subject) || !questionId || selectedAnswer === undefined) {
    return res.status(400).json({ error: 'subject, questionId, selectedAnswer are required' });
  }
  const table = subject.toLowerCase();
  try {
    const out = await withUserContext(req.user.id, async (client) => {
      const qres = await client.query(
        `SELECT correctanswer, feedback, score FROM ${table} WHERE id = $1`,
        [questionId]
      );
      if (!qres.rows.length) return { notFound: true };
      const q = qres.rows[0];
      const correct = selectedAnswer === q.correctanswer;

      const ratingQ = await client.query(
        'SELECT rating FROM user_ratings WHERE user_id = $1 AND subject = $2',
        [req.user.id, subject]
      );
      const current = ratingQ.rows.length ? ratingQ.rows[0].rating : BASE_RATING;
      const newRating = updateRatings(current, q.score, correct ? 1 : 0);

      // Only the FIRST attempt at a question is rated. The UNIQUE(user_id, question_id)
      // constraint makes this atomic: under concurrent submissions the DB lets exactly one
      // insert win; the rest get DO NOTHING and leave the rating untouched (no replay farming).
      const ins = await client.query(
        `INSERT INTO answers (user_id, subject, is_correct, question_score, rating_after, question_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (user_id, question_id) DO NOTHING
           RETURNING id`,
        [req.user.id, subject, correct, q.score, newRating, questionId]
      );
      const firstAttempt = ins.rows.length > 0;

      if (firstAttempt) {
        await client.query(
          `INSERT INTO user_ratings (user_id, subject, rating, username, updated_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (user_id, subject)
             DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW()`,
          [req.user.id, subject, newRating, req.user.username]
        );
      }

      return {
        correct,
        correctAnswer: q.correctanswer,
        feedback: q.feedback,
        rating: firstAttempt ? newRating : current,
        ratingDelta: firstAttempt ? newRating - current : 0,
        alreadyAnswered: !firstAttempt,
      };
    });
    if (out.notFound) return res.status(404).json({ error: 'Question not found' });
    res.json(out);
  } catch (err) {
    console.error('Error recording attempt:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
