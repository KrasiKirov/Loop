require('./setup');
const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { resetDb, pool } = require('./setup');
const app = require('../server');

async function token() {
  const res = await request(app).post('/auth/signup').send({ name: 'A', username: 'pat', password: 'pw' });
  return res.body.accessToken;
}

test('GET /me/ratings/:subject defaults to 1000 for a new subject', async () => {
  await resetDb();
  const t = await token();
  const res = await request(app).get('/me/ratings/Calculus').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { subject: 'Calculus', rating: 1000 });
});

test('GET /me/ratings requires a token', async () => {
  await resetDb();
  const res = await request(app).get('/me/ratings/Calculus');
  assert.strictEqual(res.status, 401);
});

test('GET /me/ratings rejects an invalid subject', async () => {
  await resetDb();
  const t = await token();
  const res = await request(app).get('/me/ratings/FakeSubject').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 400);
});

test('POST /answers requires a token', async () => {
  await resetDb();
  const res = await request(app)
    .post('/answers')
    .send({ subject: 'Calculus', isCorrect: true, questionScore: 800, rating: 1010 });
  assert.strictEqual(res.status, 401);
});

test('POST /answers upserts the rating and records the answer', async () => {
  await resetDb();
  const t = await token();
  const r1 = await request(app).post('/answers').set('Authorization', `Bearer ${t}`)
    .send({ subject: 'Calculus', isCorrect: true, questionScore: 800, rating: 1010 });
  assert.strictEqual(r1.status, 200);
  let g = await request(app).get('/me/ratings/Calculus').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(g.body.rating, 1010);

  const r2 = await request(app).post('/answers').set('Authorization', `Bearer ${t}`)
    .send({ subject: 'Calculus', isCorrect: false, questionScore: 820, rating: 995 });
  assert.strictEqual(r2.status, 200);
  g = await request(app).get('/me/ratings/Calculus').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(g.body.rating, 995);

  const ratings = await pool.query('SELECT count(*)::int AS n FROM user_ratings');
  assert.strictEqual(ratings.rows[0].n, 1);
  const answers = await pool.query('SELECT count(*)::int AS n FROM answers');
  assert.strictEqual(answers.rows[0].n, 2);
});

test('ratings are isolated per subject', async () => {
  await resetDb();
  const t = await token();
  await request(app).post('/answers').set('Authorization', `Bearer ${t}`)
    .send({ subject: 'Calculus', isCorrect: true, questionScore: 800, rating: 1010 });
  const bio = await request(app).get('/me/ratings/Biochemistry').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(bio.body.rating, 1000);
});

test.after(() => pool.end());
