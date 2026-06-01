require('./setup');
const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { resetDb, pool } = require('./setup');
const app = require('../server');

async function signupAndToken() {
  const res = await request(app).post('/auth/signup').send({ name: 'A', username: 'zoe', password: 'pw' });
  return res.body; // { accessToken, refreshToken, user }
}

test('/user/elo requires a token', async () => {
  await resetDb();
  const res = await request(app).post('/user/elo').send({ elo: 1200 });
  assert.strictEqual(res.status, 401);
});

test('/user/elo updates the authenticated user only', async () => {
  await resetDb();
  const { accessToken } = await signupAndToken();
  const res = await request(app)
    .post('/user/elo')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ elo: 1234, username: 'someone-else' }); // body identity must be ignored
  assert.strictEqual(res.status, 200);
  const { rows } = await pool.query('SELECT score FROM users WHERE username = $1', ['zoe']);
  assert.strictEqual(rows[0].score, 1234);
});

test.after(() => pool.end());
