const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/requireAuth');
const VALID_SUBJECTS = require('../subjects');
const { BASE_RATING, getBounds } = require('../elo');

const router = express.Router();

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

router.get('/questions/next', requireAuth, async (req, res) => {
  const { subject, difficulty } = req.query;
  if (!VALID_SUBJECTS.includes(subject)) {
    return res.status(400).json({ error: 'Invalid subject' });
  }
  try {
    const ratingQ = await pool.query(
      'SELECT rating FROM user_ratings WHERE user_id = $1 AND subject = $2',
      [req.user.id, subject]
    );
    const elo = ratingQ.rows.length ? ratingQ.rows[0].rating : BASE_RATING;
    const { lower, upper } = getBounds(difficulty, elo);
    const table = subject.toLowerCase();

    let pick = await pool.query(
      `SELECT id, question, answer1, answer2, answer3, answer4, score, subject
         FROM ${table} WHERE score >= $1 AND score <= $2 ORDER BY random() LIMIT 1`,
      [lower, upper]
    );
    if (!pick.rows.length) {
      pick = await pool.query(
        `SELECT id, question, answer1, answer2, answer3, answer4, score, subject
           FROM ${table} ORDER BY random() LIMIT 1`
      );
    }
    if (!pick.rows.length) return res.status(404).json({ error: 'No questions found' });

    const q = pick.rows[0];
    res.json({
      id: q.id,
      question: q.question,
      answers: [q.answer1, q.answer2, q.answer3, q.answer4],
      score: q.score,
      subject: q.subject,
    });
  } catch (err) {
    console.error('Error fetching next question:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
