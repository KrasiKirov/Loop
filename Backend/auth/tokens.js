const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-insecure-secret';
const ACCESS_TTL = '15m';
const REFRESH_TTL_DAYS = 30;

const signAccessToken = (user) =>
  jwt.sign({ sub: user.id, username: user.username }, ACCESS_SECRET, { expiresIn: ACCESS_TTL });

const verifyAccessToken = (token) => jwt.verify(token, ACCESS_SECRET);

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const createRefreshToken = async (userId) => {
  const raw = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, hashToken(raw), expiresAt]
  );
  return raw;
};

const fail = (code) => {
  const e = new Error(code);
  e.code = code;
  return e;
};

// Validate + rotate a refresh token. Returns { userId, newRefreshToken }.
// Throws Error with .code of INVALID | EXPIRED | REUSE.
const rotateRefreshToken = async (raw) => {
  const { rows } = await pool.query('SELECT * FROM refresh_tokens WHERE token_hash = $1', [hashToken(raw)]);
  const row = rows[0];
  if (!row) throw fail('INVALID');
  if (new Date(row.expires_at) < new Date()) throw fail('EXPIRED');
  if (row.revoked) {
    await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1', [row.user_id]);
    throw fail('REUSE');
  }
  await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1', [row.id]);
  const newRefreshToken = await createRefreshToken(row.user_id);
  return { userId: row.user_id, newRefreshToken };
};

const revokeRefreshToken = async (raw) => {
  await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1', [hashToken(raw)]);
};

module.exports = {
  signAccessToken, verifyAccessToken,
  createRefreshToken, rotateRefreshToken, revokeRefreshToken, hashToken,
};
