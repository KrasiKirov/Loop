const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// Fail fast in production if the signing secret is missing; allow a dev fallback otherwise.
const ACCESS_SECRET = (() => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_ACCESS_SECRET must be set in production');
  }
  return 'dev-insecure-secret';
})();
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
//
// Rotation is atomic: a single conditional UPDATE flips revoked FALSE->TRUE, so
// under concurrent use of the same token exactly one caller can claim it (the
// row lock serializes them). The loser falls through to the diagnostic path and
// is treated as reuse — closing the check-then-act (TOCTOU) race.
const rotateRefreshToken = async (raw) => {
  const tokenHash = hashToken(raw);

  const claim = await pool.query(
    `UPDATE refresh_tokens SET revoked = TRUE
       WHERE token_hash = $1 AND revoked = FALSE AND expires_at > NOW()
       RETURNING user_id`,
    [tokenHash]
  );

  if (claim.rows.length === 1) {
    const userId = claim.rows[0].user_id;
    const newRefreshToken = await createRefreshToken(userId);
    return { userId, newRefreshToken };
  }

  // Claim failed — determine why for correct error semantics + reuse detection.
  const { rows } = await pool.query('SELECT * FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
  const row = rows[0];
  if (!row) throw fail('INVALID');
  if (new Date(row.expires_at) < new Date()) throw fail('EXPIRED');
  // Row exists, not expired, but already revoked => reuse (or lost the race). Revoke the family.
  await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1', [row.user_id]);
  throw fail('REUSE');
};

const revokeRefreshToken = async (raw) => {
  await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1', [hashToken(raw)]);
};

module.exports = {
  signAccessToken, verifyAccessToken,
  createRefreshToken, rotateRefreshToken, revokeRefreshToken, hashToken,
};
