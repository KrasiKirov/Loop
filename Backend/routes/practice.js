const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/requireAuth');
const VALID_SUBJECTS = require('../subjects');
const { BASE_RATING, getBounds, updateRatings } = require('../elo');

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

router.post('/attempts', requireAuth, async (req, res) => {
  const { subject, questionId, selectedAnswer } = req.body;
  if (!VALID_SUBJECTS.includes(subject) || !questionId || selectedAnswer === undefined) {
    return res.status(400).json({ error: 'subject, questionId, selectedAnswer are required' });
  }
  const table = subject.toLowerCase();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const qres = await client.query(
      `SELECT correctanswer, feedback, score FROM ${table} WHERE id = $1`,
      [questionId]
    );
    if (!qres.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Question not found' });
    }
    const q = qres.rows[0];
    const correct = selectedAnswer === q.correctanswer;

    const ratingQ = await client.query(
      'SELECT rating FROM user_ratings WHERE user_id = $1 AND subject = $2',
      [req.user.id, subject]
    );
    const current = ratingQ.rows.length ? ratingQ.rows[0].rating : BASE_RATING;
    const newRating = updateRatings(current, q.score, correct ? 1 : 0);

    await client.query(
      `INSERT INTO user_ratings (user_id, subject, rating, username, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id, subject)
         DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW()`,
      [req.user.id, subject, newRating, req.user.username]
    );
    await client.query(
      `INSERT INTO answers (user_id, subject, is_correct, question_score, rating_after)
         VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, subject, correct, q.score, newRating]
    );
    await client.query('COMMIT');

    res.json({
      correct,
      correctAnswer: q.correctanswer,
      feedback: q.feedback,
      rating: newRating,
      ratingDelta: newRating - current,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error recording attempt:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
});

module.exports = router;
