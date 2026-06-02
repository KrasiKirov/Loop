const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { authPool } = require('../db');
const {
  signAccessToken, createRefreshToken, rotateRefreshToken, revokeRefreshToken,
} = require('./tokens');
const { validate } = require('../middleware/validate');

const router = express.Router();

const signupSchema = z.object({
  name: z.string().min(1).max(255),
  username: z.string().min(1).max(255),
  password: z.string().min(1).max(255),
});
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
const SALT_ROUNDS = 10;

// A real bcrypt hash to compare against when the user doesn't exist, so login
// takes the same time whether or not the username is valid (prevents username
// enumeration via response timing).
const DUMMY_HASH = bcrypt.hashSync('unused-placeholder-password', SALT_ROUNDS);

const publicUser = (row) => ({ name: row.name, username: row.username });

const issuePair = async (user) => ({
  accessToken: signAccessToken(user),
  refreshToken: await createRefreshToken(user.id),
});

router.post('/signup', validate(signupSchema), async (req, res) => {
  const { name, username, password } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ error: 'Name, username, and password are required' });
  }
  try {
    const exists = await authPool.query('SELECT 1 FROM users WHERE username = $1', [username]);
    if (exists.rows.length) return res.status(400).json({ error: 'User already exists' });
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const { rows } = await authPool.query(
      'INSERT INTO users (name, username, password) VALUES ($1,$2,$3) RETURNING id, name, username',
      [name, username, hash]
    );
    const user = rows[0];
    const pair = await issuePair(user);
    res.status(201).json({ ...pair, user: publicUser(user) });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/login', validate(loginSchema), async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  try {
    const { rows } = await authPool.query(
      'SELECT id, name, username, password FROM users WHERE username = $1',
      [username]
    );
    const user = rows[0];
    // Always run one comparison (against a dummy hash if the user is missing) to
    // keep the response time constant regardless of whether the username exists.
    const passwordMatches = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
    if (!user || !passwordMatches) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const pair = await issuePair(user);
    res.json({ ...pair, user: publicUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/refresh', validate(refreshSchema), async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });
  try {
    const { userId, newRefreshToken } = await rotateRefreshToken(refreshToken);
    const { rows } = await authPool.query('SELECT id, username FROM users WHERE id = $1', [userId]);
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
