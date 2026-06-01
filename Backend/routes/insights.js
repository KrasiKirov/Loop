const express = require('express');
const { userPool, withUserContext } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const VALID_SUBJECTS = require('../subjects');

const router = express.Router();
const TREND_LIMIT = 30;

const accuracy = (correct, answered) =>
  answered > 0 ? Math.round((correct / answered) * 100) / 100 : 0;

router.get('/me/stats', requireAuth, async (req, res) => {
  try {
    const data = await withUserContext(req.user.id, async (client) => {
      const overallQ = await client.query(
        `SELECT count(*)::int AS answered,
                count(*) FILTER (WHERE is_correct)::int AS correct
           FROM answers WHERE user_id = $1`,
        [req.user.id]
      );
      const o = overallQ.rows[0];
      const overall = { answered: o.answered, correct: o.correct, accuracy: accuracy(o.correct, o.answered) };

      const subjQ = await client.query(
        `SELECT r.subject, r.rating,
                count(a.id)::int AS answered,
                count(a.id) FILTER (WHERE a.is_correct)::int AS correct
           FROM user_ratings r
           LEFT JOIN answers a ON a.user_id = r.user_id AND a.subject = r.subject
          WHERE r.user_id = $1
          GROUP BY r.subject, r.rating
          ORDER BY r.subject`,
        [req.user.id]
      );

      const trendQ = await client.query(
        `SELECT subject, rating_after FROM answers
          WHERE user_id = $1 ORDER BY created_at ASC, id ASC`,
        [req.user.id]
      );
      const trends = {};
      for (const row of trendQ.rows) {
        (trends[row.subject] = trends[row.subject] || []).push(row.rating_after);
      }

      const subjects = subjQ.rows.map((s) => ({
        subject: s.subject,
        rating: s.rating,
        answered: s.answered,
        correct: s.correct,
        accuracy: accuracy(s.correct, s.answered),
        trend: (trends[s.subject] || []).slice(-TREND_LIMIT),
      }));

      return { overall, subjects };
    });
    res.json(data);
  } catch (err) {
    console.error('Error building stats:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/leaderboard/:subject', requireAuth, async (req, res) => {
  const { subject } = req.params;
  if (!VALID_SUBJECTS.includes(subject)) {
    return res.status(400).json({ error: 'Invalid subject' });
  }
  try {
    const topQ = await userPool.query(
      `SELECT username, rating
         FROM user_ratings
        WHERE subject = $1
        ORDER BY rating DESC, username ASC
        LIMIT 20`,
      [subject]
    );
    const top = topQ.rows.map((row, i) => ({ rank: i + 1, username: row.username, rating: row.rating }));

    const mineQ = await userPool.query(
      'SELECT rating FROM user_ratings WHERE user_id = $1 AND subject = $2',
      [req.user.id, subject]
    );
    let me = null;
    if (mineQ.rows.length) {
      const myRating = mineQ.rows[0].rating;
      const higherQ = await userPool.query(
        'SELECT count(*)::int AS higher FROM user_ratings WHERE subject = $1 AND rating > $2',
        [subject, myRating]
      );
      me = { rank: higherQ.rows[0].higher + 1, rating: myRating };
    }

    res.json({ subject, top, me });
  } catch (err) {
    console.error('Error building leaderboard:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
