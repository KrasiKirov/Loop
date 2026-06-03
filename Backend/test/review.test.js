require('./setup');
const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { resetDb, seedCard, pool } = require('./setup');
const app = require('../server');

async function token() {
  const res = await request(app)
    .post('/auth/signup')
    .send({ name: 'A', username: 'rev', password: 'pw' });
  return res.body.accessToken;
}

// Resolve the authenticated user's id from a fresh signup token, via attempts.
async function userIdFor(t) {
  const r = await request(app).get('/me/stats').set('Authorization', `Bearer ${t}`);
  // stats doesn't expose the id; read it from the users table instead.
  const u = await pool.query('SELECT id FROM users WHERE username = $1', ['rev']);
  return u.rows[0].id;
}

// Force a card due in the past by inserting/updating srs_state via the owner pool.
async function forceDue(userId, cardId) {
  await pool.query(
    `INSERT INTO srs_state (user_id, card_id, box, due_at)
       VALUES ($1, $2, 0, now() - interval '1 hour')
       ON CONFLICT (user_id, card_id)
       DO UPDATE SET due_at = now() - interval '1 hour'`,
    [userId, cardId]
  );
}

test('GET /review/next requires a token', async () => {
  await resetDb();
  const res = await request(app).get('/review/next');
  assert.strictEqual(res.status, 401);
});

test('GET /review/next returns {empty:true} when nothing is due', async () => {
  await resetDb();
  const t = await token();
  const res = await request(app).get('/review/next').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { empty: true });
});

test('GET /review/next does not return a card just answered wrong (due ~10m out)', async () => {
  await resetDb();
  const t = await token();
  const id = await seedCard({ rating: 1000 });
  await request(app)
    .post('/attempts')
    .set('Authorization', `Bearer ${t}`)
    .send({ cardId: id, selectedAnswer: 'Greedy' });
  const res = await request(app).get('/review/next').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { empty: true });
});

test('GET /review/next returns a forced-due card WITHOUT the answer key', async () => {
  await resetDb();
  const t = await token();
  const userId = await userIdFor(t);
  const id = await seedCard({ rating: 1000 });
  await forceDue(userId, id);
  const res = await request(app).get('/review/next').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.id, id);
  assert.strictEqual(res.body.pattern, 'sliding-window');
  assert.strictEqual(res.body.answers.length, 4);
  assert.deepStrictEqual(
    [...res.body.answers].sort(),
    ['Binary Search', 'Greedy', 'Sliding Window', 'Two Pointers']
  );
  assert.strictEqual(res.body.correctanswer, undefined);
  assert.strictEqual(res.body.explanation, undefined);
});

test('GET /review/next picks the most overdue card first', async () => {
  await resetDb();
  const t = await token();
  const userId = await userIdFor(t);
  const a = await seedCard({ rating: 1000 });
  const b = await seedCard({ rating: 1000 });
  await pool.query(
    `INSERT INTO srs_state (user_id, card_id, box, due_at)
       VALUES ($1, $2, 0, now() - interval '5 hours'),
              ($1, $3, 0, now() - interval '1 hour')`,
    [userId, a, b]
  );
  const res = await request(app).get('/review/next').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.body.id, a);
});

test('GET /review/queue returns due count and byPattern breakdown', async () => {
  await resetDb();
  const t = await token();
  const userId = await userIdFor(t);
  const sw1 = await seedCard({ slug: 'sliding-window', rating: 1000 });
  const sw2 = await seedCard({ slug: 'sliding-window', rating: 1000 });
  const tp = await seedCard({
    slug: 'two-pointers',
    rating: 1000,
    answer1: 'Two Pointers',
    correctanswer: 'Two Pointers',
  });
  const notDue = await seedCard({ slug: 'sliding-window', rating: 1000 });

  await forceDue(userId, sw1);
  await forceDue(userId, sw2);
  await forceDue(userId, tp);
  // notDue: future due date -> excluded
  await pool.query(
    `INSERT INTO srs_state (user_id, card_id, box, due_at)
       VALUES ($1, $2, 1, now() + interval '1 day')`,
    [userId, notDue]
  );

  const res = await request(app).get('/review/queue').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.due, 3);
  assert.deepStrictEqual(res.body.byPattern, { 'sliding-window': 2, 'two-pointers': 1 });
});

test('GET /me/stats: fresh user has streak 0, answered 0, goalDate null', async () => {
  await resetDb();
  const t = await token();
  const res = await request(app).get('/me/stats').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, {
    streak: 0,
    answered: 0,
    goalDate: null,
    daysLeft: null,
  });
});

test('GET /me/stats: after one attempt today, answered 1 and streak 1', async () => {
  await resetDb();
  const t = await token();
  const id = await seedCard({ rating: 1000 });
  await request(app)
    .post('/attempts')
    .set('Authorization', `Bearer ${t}`)
    .send({ cardId: id, selectedAnswer: 'Sliding Window' });
  const res = await request(app).get('/me/stats').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.answered, 1);
  assert.strictEqual(res.body.streak, 1);
});

test('PUT /me/goal requires a token', async () => {
  await resetDb();
  const res = await request(app).put('/me/goal').send({ goalDate: '2026-12-31' });
  assert.strictEqual(res.status, 401);
});

test('PUT /me/goal 400s on a malformed date', async () => {
  await resetDb();
  const t = await token();
  const res = await request(app)
    .put('/me/goal')
    .set('Authorization', `Bearer ${t}`)
    .send({ goalDate: 'not-a-date' });
  assert.strictEqual(res.status, 400);
});

test('PUT /me/goal sets the date; /me/stats returns it with daysLeft', async () => {
  await resetDb();
  const t = await token();
  // 10 days out from today (UTC).
  const today = new Date();
  const target = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) + 10 * 86400000);
  const goalDate = `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, '0')}-${String(target.getUTCDate()).padStart(2, '0')}`;

  const put = await request(app)
    .put('/me/goal')
    .set('Authorization', `Bearer ${t}`)
    .send({ goalDate });
  assert.strictEqual(put.status, 200);
  assert.strictEqual(put.body.goalDate, goalDate);
  assert.strictEqual(put.body.daysLeft, 10);

  const stats = await request(app).get('/me/stats').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(stats.body.goalDate, goalDate);
  assert.strictEqual(stats.body.daysLeft, 10);
});
