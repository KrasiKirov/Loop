require('./setup');
const { test } = require('node:test');
const assert = require('node:assert');
const { pool, resetDb } = require('./setup');
const {
  signAccessToken, verifyAccessToken,
  createRefreshToken, rotateRefreshToken, revokeRefreshToken,
} = require('../auth/tokens');

async function makeUser() {
  const { rows } = await pool.query(
    "INSERT INTO users (name, username, password) VALUES ('A','u'||floor(random()*1e9),'x') RETURNING id, username"
  );
  return rows[0];
}

test('access token round-trips', () => {
  const token = signAccessToken({ id: 7, username: 'bob' });
  const payload = verifyAccessToken(token);
  assert.strictEqual(payload.sub, 7);
  assert.strictEqual(payload.username, 'bob');
});

test('rotation issues a new token and invalidates the old', async () => {
  await resetDb();
  const user = await makeUser();
  const raw = await createRefreshToken(user.id);
  const { userId, newRefreshToken } = await rotateRefreshToken(raw);
  assert.strictEqual(userId, user.id);
  assert.notStrictEqual(newRefreshToken, raw);
  await assert.rejects(() => rotateRefreshToken(raw), (e) => e.code === 'REUSE');
});

test('reuse revokes the whole family', async () => {
  await resetDb();
  const user = await makeUser();
  const raw = await createRefreshToken(user.id);
  const { newRefreshToken } = await rotateRefreshToken(raw);
  await assert.rejects(() => rotateRefreshToken(raw), (e) => e.code === 'REUSE');
  // the newly-issued token is now also revoked
  await assert.rejects(() => rotateRefreshToken(newRefreshToken), (e) => e.code === 'REUSE');
});

test('revoke makes a token unusable', async () => {
  await resetDb();
  const user = await makeUser();
  const raw = await createRefreshToken(user.id);
  await revokeRefreshToken(raw);
  await assert.rejects(() => rotateRefreshToken(raw), (e) => e.code === 'REUSE');
});

test.after(() => pool.end());
