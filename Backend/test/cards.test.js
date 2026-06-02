require('./setup');
const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { resetDb, seedCard, pool } = require('./setup');
const app = require('../server');

const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

async function token() {
  const res = await request(app)
    .post('/auth/signup')
    .send({ name: 'A', username: 'pat', password: 'pw' });
  return res.body.accessToken;
}

test('GET /me/ratings/:pattern defaults to 1000', async () => {
  await resetDb();
  const t = await token();
  const res = await request(app)
    .get('/me/ratings/sliding-window')
    .set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { pattern: 'sliding-window', rating: 1000 });
});

test('GET /me/ratings/:pattern 400s on an invalid pattern', async () => {
  await resetDb();
  const t = await token();
  const res = await request(app).get('/me/ratings/nope').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 400);
});

test('GET /cards/next requires a token', async () => {
  await resetDb();
  const res = await request(app).get('/cards/next?pattern=sliding-window&difficulty=medium');
  assert.strictEqual(res.status, 401);
});

test('GET /cards/next returns a card WITHOUT the answer key', async () => {
  await resetDb();
  const t = await token();
  await seedCard();
  const res = await request(app)
    .get('/cards/next?pattern=sliding-window&difficulty=medium')
    .set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.id);
  assert.strictEqual(res.body.format, 'pattern_id');
  assert.strictEqual(res.body.prompt, 'Which pattern solves this?');
  assert.strictEqual(res.body.answers.length, 4);
  // answers are shuffled per serve, so assert set-equality (not order)
  assert.deepStrictEqual(
    [...res.body.answers].sort(),
    ['Binary Search', 'Greedy', 'Sliding Window', 'Two Pointers']
  );
  assert.strictEqual(res.body.correctanswer, undefined);
  assert.strictEqual(res.body.explanation, undefined);
});

test('GET /cards/next 400s on an invalid pattern', async () => {
  await resetDb();
  const t = await token();
  const res = await request(app)
    .get('/cards/next?pattern=nope&difficulty=medium')
    .set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 400);
});

test('GET /cards/next 404s when the pattern has no cards', async () => {
  await resetDb();
  const t = await token();
  const res = await request(app)
    .get('/cards/next?pattern=sliding-window&difficulty=medium')
    .set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 404);
});

test('GET /cards/next excludes the exclude ids', async () => {
  await resetDb();
  const t = await token();
  const a = await seedCard({ rating: 1000 });
  const b = await seedCard({ rating: 1000 });
  const res = await request(app)
    .get(`/cards/next?pattern=sliding-window&difficulty=medium&exclude=${a}`)
    .set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.id, b);
});

test('POST /attempts requires a token', async () => {
  await resetDb();
  const res = await request(app)
    .post('/attempts')
    .send({ cardId: ZERO_UUID, selectedAnswer: 'Sliding Window' });
  assert.strictEqual(res.status, 401);
});

test('POST /attempts grades a correct answer and rates on the first attempt', async () => {
  await resetDb();
  const t = await token();
  const id = await seedCard({ rating: 1000 });
  const res = await request(app)
    .post('/attempts')
    .set('Authorization', `Bearer ${t}`)
    .send({ cardId: id, selectedAnswer: 'Sliding Window' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.correct, true);
  assert.strictEqual(res.body.correctAnswer, 'Sliding Window');
  assert.ok(res.body.explanation);
  assert.ok(res.body.rating > 1000);
  assert.ok(res.body.ratingDelta > 0);
  assert.strictEqual(res.body.alreadyAnswered, false);

  const r = await request(app)
    .get('/me/ratings/sliding-window')
    .set('Authorization', `Bearer ${t}`);
  assert.strictEqual(r.body.rating, res.body.rating);

  const cnt = await pool.query('SELECT count(*)::int AS n FROM attempts');
  assert.strictEqual(cnt.rows[0].n, 1);
});

test('POST /attempts grades a wrong answer and lowers the rating', async () => {
  await resetDb();
  const t = await token();
  const id = await seedCard({ rating: 1000 });
  const res = await request(app)
    .post('/attempts')
    .set('Authorization', `Bearer ${t}`)
    .send({ cardId: id, selectedAnswer: 'Greedy' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.correct, false);
  assert.strictEqual(res.body.correctAnswer, 'Sliding Window');
  assert.ok(res.body.rating < 1000);
  assert.ok(res.body.ratingDelta < 0);
});

test('POST /attempts 404s for an unknown card id', async () => {
  await resetDb();
  const t = await token();
  const res = await request(app)
    .post('/attempts')
    .set('Authorization', `Bearer ${t}`)
    .send({ cardId: ZERO_UUID, selectedAnswer: 'Sliding Window' });
  assert.strictEqual(res.status, 404);
});

test('POST /attempts rates only the first attempt; replays give ratingDelta 0', async () => {
  await resetDb();
  const t = await token();
  const id = await seedCard({ rating: 1000 });

  const first = await request(app)
    .post('/attempts')
    .set('Authorization', `Bearer ${t}`)
    .send({ cardId: id, selectedAnswer: 'Sliding Window' });
  assert.strictEqual(first.body.alreadyAnswered, false);
  assert.ok(first.body.ratingDelta > 0);

  const replay = await request(app)
    .post('/attempts')
    .set('Authorization', `Bearer ${t}`)
    .send({ cardId: id, selectedAnswer: 'Sliding Window' });
  assert.strictEqual(replay.status, 200);
  assert.strictEqual(replay.body.ratingDelta, 0);
  assert.strictEqual(replay.body.alreadyAnswered, true);
  assert.strictEqual(replay.body.rating, first.body.rating);

  const cnt = await pool.query('SELECT count(*)::int AS n FROM attempts');
  assert.strictEqual(cnt.rows[0].n, 1);
});

test('POST /attempts writes srs_state: box 1 after correct', async () => {
  await resetDb();
  const t = await token();
  const id = await seedCard({ rating: 1000 });
  await request(app)
    .post('/attempts')
    .set('Authorization', `Bearer ${t}`)
    .send({ cardId: id, selectedAnswer: 'Sliding Window' });
  const { rows } = await pool.query('SELECT box FROM srs_state WHERE card_id = $1', [id]);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].box, 1);
});

test('POST /attempts writes srs_state: box 0 after wrong', async () => {
  await resetDb();
  const t = await token();
  const id = await seedCard({ rating: 1000 });
  await request(app)
    .post('/attempts')
    .set('Authorization', `Bearer ${t}`)
    .send({ cardId: id, selectedAnswer: 'Greedy' });
  const { rows } = await pool.query('SELECT box FROM srs_state WHERE card_id = $1', [id]);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].box, 0);
});

test('GET /patterns lists all 18 patterns with rating/mastery/due', async () => {
  await resetDb();
  const t = await token();
  const res = await request(app).get('/patterns').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.length, 18);
  const sw = res.body.find((p) => p.slug === 'sliding-window');
  assert.strictEqual(sw.rating, 1000);
  assert.ok(Math.abs(sw.mastery - (1000 - 700) / 1300) < 1e-9);
  assert.strictEqual(sw.due, 0);
  // ordered by sort_order
  assert.strictEqual(res.body[0].slug, 'arrays-hashing');
});

test('GET /patterns reflects a due SRS card after a wrong attempt', async () => {
  await resetDb();
  const t = await token();
  const id = await seedCard({ rating: 1000 });
  // wrong attempt -> box 0, due in ~10m (still in the future, not yet due)
  await request(app)
    .post('/attempts')
    .set('Authorization', `Bearer ${t}`)
    .send({ cardId: id, selectedAnswer: 'Greedy' });
  // force it due
  await pool.query("UPDATE srs_state SET due_at = now() - interval '1 minute' WHERE card_id = $1", [id]);
  const res = await request(app).get('/patterns').set('Authorization', `Bearer ${t}`);
  const sw = res.body.find((p) => p.slug === 'sliding-window');
  assert.strictEqual(sw.due, 1);
});

test('GET /patterns requires a token', async () => {
  await resetDb();
  const res = await request(app).get('/patterns');
  assert.strictEqual(res.status, 401);
});
