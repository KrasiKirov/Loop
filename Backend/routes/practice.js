const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/requireAuth');
const VALID_SUBJECTS = require('../subjects');

const router = express.Router();
const BASE_RATING = 1000;

router.get('/me/ratings/:subject', requireAuth, async (req, res) => {
  const { subject } = req.params;
  if (!VALID_SUBJECTS.includes(subject)) {
    return res.status(400).json({ error: 'Invalid subject' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT rating FROM user_ratings WHERE user_id = $1 AND subject = $2',
      [req.user.id, subject]
    );
    res.json({ subject, rating: rows.length ? rows[0].rating : BASE_RATING });
  } catch (err) {
    console.error('Error fetching rating:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/answers', requireAuth, async (req, res) => {
  const { subject, isCorrect, questionScore, rating } = req.body;
  if (
    !VALID_SUBJECTS.includes(subject) ||
    isCorrect === undefined ||
    questionScore === undefined ||
    rating === undefined
  ) {
    return res.status(400).json({ error: 'subject, isCorrect, questionScore, rating are required' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO user_ratings (user_id, subject, rating, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, subject)
         DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW()`,
      [req.user.id, subject, rating]
    );
    await client.query(
      `INSERT INTO answers (user_id, subject, is_correct, question_score, rating_after)
         VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, subject, isCorrect, questionScore, rating]
    );
    await client.query('COMMIT');
    res.status(200).json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error recording answer:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
});

module.exports = router;
