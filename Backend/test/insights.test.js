require('./setup');
const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { resetDb, pool } = require('./setup');
const app = require('../server');

async function signup(username) {
  const res = await request(app).post('/auth/signup').send({ name: 'N', username, password: 'pw' });
  return res.body.accessToken;
}
function answer(t, body) {
  return request(app).post('/answers').set('Authorization', `Bearer ${t}`).send(body);
}

test('GET /me/stats requires a token', async () => {
  await resetDb();
  const res = await request(app).get('/me/stats');
  assert.strictEqual(res.status, 401);
});

test('GET /me/stats returns empty shape for a fresh user', async () => {
  await resetDb();
  const t = await signup('fresh');
  const res = await request(app).get('/me/stats').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { overall: { answered: 0, correct: 0, accuracy: 0 }, subjects: [] });
});

test('GET /me/stats aggregates per subject + overall, with chronological trend', async () => {
  await resetDb();
  const t = await signup('learner');
  await answer(t, { subject: 'Calculus', isCorrect: true, questionScore: 800, rating: 1010 });
  await answer(t, { subject: 'Calculus', isCorrect: false, questionScore: 820, rating: 1002 });
  await answer(t, { subject: 'Anatomy', isCorrect: true, questionScore: 700, rating: 1009 });

  const res = await request(app).get('/me/stats').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body.overall, { answered: 3, correct: 2, accuracy: 0.67 });

  const calc = res.body.subjects.find((s) => s.subject === 'Calculus');
  assert.strictEqual(calc.rating, 1002);
  assert.strictEqual(calc.answered, 2);
  assert.strictEqual(calc.correct, 1);
  assert.strictEqual(calc.accuracy, 0.5);
  assert.deepStrictEqual(calc.trend, [1010, 1002]);
});

test('GET /leaderboard ranks by rating, computes my rank, 400 invalid, null when unplayed', async () => {
  await resetDb();
  const a = await signup('alice');
  const b = await signup('bob');
  const c = await signup('carol');
  await answer(a, { subject: 'Calculus', isCorrect: true, questionScore: 800, rating: 1300 });
  await answer(b, { subject: 'Calculus', isCorrect: true, questionScore: 800, rating: 1100 });
  await answer(c, { subject: 'Calculus', isCorrect: true, questionScore: 800, rating: 1200 });

  const res = await request(app).get('/leaderboard/Calculus').set('Authorization', `Bearer ${b}`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.subject, 'Calculus');
  assert.deepStrictEqual(res.body.top.map((r) => r.username), ['alice', 'carol', 'bob']);
  assert.deepStrictEqual(res.body.top.map((r) => r.rank), [1, 2, 3]);
  assert.deepStrictEqual(res.body.me, { rank: 3, rating: 1100 });

  const bio = await request(app).get('/leaderboard/Anatomy').set('Authorization', `Bearer ${b}`);
  assert.strictEqual(bio.body.me, null);

  const bad = await request(app).get('/leaderboard/Nope').set('Authorization', `Bearer ${b}`);
  assert.strictEqual(bad.status, 400);

  const noauth = await request(app).get('/leaderboard/Calculus');
  assert.strictEqual(noauth.status, 401);
});

test.after(() => pool.end());
