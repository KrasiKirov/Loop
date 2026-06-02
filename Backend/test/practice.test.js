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

test('POST /attempts requires a token', async () => {
  await resetDb();
  const res = await request(app).post('/attempts').send({ subject: 'Calculus', questionId: '00000000-0000-0000-0000-000000000000', selectedAnswer: '4' });
  assert.strictEqual(res.status, 401);
});

test('POST /attempts grades correctly and updates the rating server-side', async () => {
  await resetDb();
  const t = await token();
  const qid = await seedQuestion({ correctanswer: '4', score: 1000 });

  const correct = await request(app).post('/attempts').set('Authorization', `Bearer ${t}`)
    .send({ subject: 'Calculus', questionId: qid, selectedAnswer: '4' });
  assert.strictEqual(correct.status, 200);
  assert.strictEqual(correct.body.correct, true);
  assert.strictEqual(correct.body.correctAnswer, '4');
  assert.strictEqual(correct.body.feedback, 'Basic addition.');
  assert.ok(correct.body.rating > 1000);
  assert.ok(correct.body.ratingDelta > 0);

  const r = await request(app).get('/me/ratings/Calculus').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(r.body.rating, correct.body.rating);

  const cnt = await pool.query('SELECT count(*)::int AS n FROM answers');
  assert.strictEqual(cnt.rows[0].n, 1);
});

test('POST /attempts marks a wrong answer and lowers the rating', async () => {
  await resetDb();
  const t = await token();
  const qid = await seedQuestion({ correctanswer: '4', score: 1000 });
  const wrong = await request(app).post('/attempts').set('Authorization', `Bearer ${t}`)
    .send({ subject: 'Calculus', questionId: qid, selectedAnswer: '3' });
  assert.strictEqual(wrong.status, 200);
  assert.strictEqual(wrong.body.correct, false);
  assert.strictEqual(wrong.body.correctAnswer, '4');
  assert.ok(wrong.body.rating < 1000);
});

test('POST /attempts 404s for an unknown question id', async () => {
  await resetDb();
  const t = await token();
  const res = await request(app).post('/attempts').set('Authorization', `Bearer ${t}`)
    .send({ subject: 'Calculus', questionId: '00000000-0000-0000-0000-000000000000', selectedAnswer: '4' });
  assert.strictEqual(res.status, 404);
});

test('POST /attempts rates only the first attempt; replays give no rating change', async () => {
  await resetDb();
  const t = await token();
  const qid = await seedQuestion({ correctanswer: '4', score: 1000 });

  const first = await request(app).post('/attempts').set('Authorization', `Bearer ${t}`)
    .send({ subject: 'Calculus', questionId: qid, selectedAnswer: '4' });
  assert.strictEqual(first.body.correct, true);
  assert.ok(first.body.ratingDelta > 0);
  const ratedTo = first.body.rating;

  // Replay the SAME question with the now-known answer.
  const replay = await request(app).post('/attempts').set('Authorization', `Bearer ${t}`)
    .send({ subject: 'Calculus', questionId: qid, selectedAnswer: '4' });
  assert.strictEqual(replay.status, 200);
  assert.strictEqual(replay.body.correct, true);       // still graded for learning
  assert.strictEqual(replay.body.ratingDelta, 0);      // but no rating change
  assert.strictEqual(replay.body.rating, ratedTo);     // rating unchanged
  assert.strictEqual(replay.body.alreadyAnswered, true);

  // only one answers row exists for that question
  const cnt = await pool.query('SELECT count(*)::int AS n FROM answers');
  assert.strictEqual(cnt.rows[0].n, 1);
});

test('POST /attempts: 10 concurrent submissions of the same question rate only once', async () => {
  await resetDb();
  const t = await token();
  const qid = await seedQuestion({ correctanswer: '4', score: 1000 });

  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      request(app).post('/attempts').set('Authorization', `Bearer ${t}`)
        .send({ subject: 'Calculus', questionId: qid, selectedAnswer: '4' })
    )
  );
  // exactly one submission was rated; the rest got ratingDelta 0
  const rated = results.filter((r) => r.body.ratingDelta !== 0);
  assert.strictEqual(rated.length, 1);
  // exactly one answers row was recorded
  const cnt = await pool.query('SELECT count(*)::int AS n FROM answers');
  assert.strictEqual(cnt.rows[0].n, 1);
});

test('GET /questions/next excludes ids passed in exclude (no repeats)', async () => {
  await resetDb();
  const t = await token();
  const q1 = await seedQuestion({ question: 'Q1' });
  const q2 = await seedQuestion({ question: 'Q2' });

  // exclude q1 -> must return the other question
  const res = await request(app)
    .get(`/questions/next?subject=Calculus&difficulty=medium&exclude=${q1}`)
    .set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.id, q2);

  // exclude both -> falls back to a repeat (one of them) rather than 404
  const both = await request(app)
    .get(`/questions/next?subject=Calculus&difficulty=medium&exclude=${q1},${q2}`)
    .set('Authorization', `Bearer ${t}`);
  assert.strictEqual(both.status, 200);
  assert.ok([q1, q2].includes(both.body.id));
});

test.after(() => pool.end());
