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
async function seedQuestion(over = {}) {
  const q = {
    question: '2+2?', answer1: '4', answer2: '3', answer3: '5', answer4: '1',
    correctanswer: '4', feedback: 'Basic addition.', score: 1000, subject: 'Calculus', ...over,
  };
  const { rows } = await pool.query(
    `INSERT INTO calculus (question, answer1, answer2, answer3, answer4, correctanswer, feedback, score, subject)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [q.question, q.answer1, q.answer2, q.answer3, q.answer4, q.correctanswer, q.feedback, q.score, q.subject]
  );
  return rows[0].id;
}

test('GET /me/ratings/:subject defaults to 1000', async () => {
  await resetDb();
  const t = await token();
  const res = await request(app).get('/me/ratings/Calculus').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { subject: 'Calculus', rating: 1000 });
});

test('GET /questions/next requires a token', async () => {
  await resetDb();
  const res = await request(app).get('/questions/next?subject=Calculus&difficulty=medium');
  assert.strictEqual(res.status, 401);
});

test('GET /questions/next returns a question WITHOUT the answer', async () => {
  await resetDb();
  const t = await token();
  await seedQuestion();
  const res = await request(app).get('/questions/next?subject=Calculus&difficulty=medium').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.id);
  assert.strictEqual(res.body.question, '2+2?');
  assert.deepStrictEqual(res.body.answers, ['4', '3', '5', '1']);
  assert.strictEqual(res.body.correctAnswer, undefined);
  assert.strictEqual(res.body.feedback, undefined);
});

test('GET /questions/next 400s on an invalid subject', async () => {
  await resetDb();
  const t = await token();
  const res = await request(app).get('/questions/next?subject=Nope&difficulty=medium').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 400);
});

test('GET /questions/next 404s when the subject has no questions', async () => {
  await resetDb();
  const t = await token();
  const res = await request(app).get('/questions/next?subject=Calculus&difficulty=medium').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 404);
});

test.after(() => pool.end());
