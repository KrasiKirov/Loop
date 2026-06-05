require('./setup');
const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { resetDb, pool } = require('./setup');
const app = require('../server');

async function signup(username) {
  const res = await request(app).post('/auth/signup').send({ name: username, username, password: 'pw123456' });
  const id = (await pool.query('SELECT id FROM users WHERE username = $1', [username])).rows[0].id;
  return { token: res.body.accessToken, id, username };
}

// Seed a user_ratings row directly (owner pool bypasses RLS). `updatedAt` is a JS Date.
async function setRating(userId, username, subject, rating, updatedAt = new Date()) {
  await pool.query(
    `INSERT INTO user_ratings (user_id, subject, rating, username, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, subject) DO UPDATE SET rating = EXCLUDED.rating, updated_at = EXCLUDED.updated_at`,
    [userId, subject, rating, username, updatedAt]
  );
}

test('GET /leaderboard/:scope requires a token', async () => {
  await resetDb();
  const res = await request(app).get('/leaderboard/sliding-window');
  assert.strictEqual(res.status, 401);
});

test('GET /leaderboard/:scope 400s on an invalid scope', async () => {
  await resetDb();
  const me = await signup('lb_me');
  const res = await request(app).get('/leaderboard/not-a-pattern').set('Authorization', `Bearer ${me.token}`);
  assert.strictEqual(res.status, 400);
});

test('GET /leaderboard/:scope ranks by rating desc and includes me', async () => {
  await resetDb();
  const me = await signup('lb_me');
  const a = await signup('lb_a');
  const b = await signup('lb_b');
  await setRating(a.id, a.username, 'sliding-window', 1300);
  await setRating(b.id, b.username, 'sliding-window', 1100);
  await setRating(me.id, me.username, 'sliding-window', 1200);

  const res = await request(app).get('/leaderboard/sliding-window').set('Authorization', `Bearer ${me.token}`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body.top.map((r) => r.rating), [1300, 1200, 1100]);
  assert.deepStrictEqual(res.body.top.map((r) => r.rank), [1, 2, 3]);
  assert.strictEqual(res.body.top[0].username, 'lb_a');
  assert.deepStrictEqual(res.body.me, { rank: 2, rating: 1200 });
});

test('GET /league/current only counts players active this ISO week', async () => {
  await resetDb();
  const me = await signup('lg_me');
  const recent = await signup('lg_recent');
  const old = await signup('lg_old');
  await setRating(recent.id, recent.username, 'overall', 1100, new Date());
  await setRating(me.id, me.username, 'overall', 1300, new Date());
  await setRating(old.id, old.username, 'overall', 1500, new Date(Date.now() - 14 * 86400000));

  const res = await request(app).get('/league/current').set('Authorization', `Bearer ${me.token}`);
  assert.strictEqual(res.status, 200);
  const names = res.body.top.map((r) => r.username);
  assert.ok(names.includes('lg_me') && names.includes('lg_recent'));
  assert.ok(!names.includes('lg_old'), 'a player inactive this week must not appear');
  assert.strictEqual(res.body.top[0].rating, 1300); // me, the highest active
  assert.strictEqual(res.body.me.rank, 1);
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(res.body.weekStart));
});

test.after(() => pool.end());
