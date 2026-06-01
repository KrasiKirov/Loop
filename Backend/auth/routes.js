const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const {
  signAccessToken, createRefreshToken, rotateRefreshToken, revokeRefreshToken,
} = require('./tokens');

const router = express.Router();
const SALT_ROUNDS = 10;
const BASE_RATING = 1000;

const publicUser = (row) => ({ name: row.name, username: row.username, elo: row.score });

const issuePair = async (user) => ({
  accessToken: signAccessToken(user),
  refreshToken: await createRefreshToken(user.id),
});

router.post('/signup', async (req, res) => {
  const { name, username, password } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ error: 'Name, username, and password are required' });
  }
  try {
    const exists = await pool.query('SELECT 1 FROM users WHERE username = $1', [username]);
    if (exists.rows.length) return res.status(400).json({ error: 'User already exists' });
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const { rows } = await pool.query(
      'INSERT INTO users (name, username, password, score) VALUES ($1,$2,$3,$4) RETURNING id, name, username, score',
      [name, username, hash, BASE_RATING]
    );
    const user = rows[0];
    const pair = await issuePair(user);
    res.status(201).json({ ...pair, user: publicUser(user) });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT id, name, username, password, score FROM users WHERE username = $1',
      [username]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const pair = await issuePair(user);
    res.json({ ...pair, user: publicUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });
  try {
    const { userId, newRefreshToken } = await rotateRefreshToken(refreshToken);
    const { rows } = await pool.query('SELECT id, username FROM users WHERE id = $1', [userId]);
    res.json({ accessToken: signAccessToken(rows[0]), refreshToken: newRefreshToken });
  } catch (err) {
    if (['INVALID', 'EXPIRED', 'REUSE'].includes(err.code)) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) await revokeRefreshToken(refreshToken).catch(() => {});
  res.status(204).end();
});

module.exports = router;
