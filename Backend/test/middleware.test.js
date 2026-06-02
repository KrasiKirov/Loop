require('./setup');
const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../server');

test('helmet sets X-Frame-Options: DENY', async () => {
  const res = await request(app).get('/me/stats'); // 401, but headers are set first
  assert.strictEqual(res.headers['x-frame-options'], 'DENY');
});

test('CORS reflects an allowed origin', async () => {
  const res = await request(app)
    .options('/auth/login')
    .set('Origin', 'http://localhost:3000')
    .set('Access-Control-Request-Method', 'POST');
  assert.strictEqual(res.headers['access-control-allow-origin'], 'http://localhost:3000');
});

test('CORS omits the header for a disallowed origin', async () => {
  const res = await request(app)
    .options('/auth/login')
    .set('Origin', 'http://evil.example')
    .set('Access-Control-Request-Method', 'POST');
  assert.strictEqual(res.headers['access-control-allow-origin'], undefined);
});

const express = require('express');
const { createLimiter } = require('../middleware/rateLimit');

test('createLimiter blocks requests past the max within the window', async () => {
  const mini = express();
  mini.use(createLimiter(3, 60000));
  mini.get('/x', (req, res) => res.json({ ok: true }));
  for (let i = 0; i < 3; i++) {
    const r = await request(mini).get('/x');
    assert.strictEqual(r.status, 200);
  }
  const blocked = await request(mini).get('/x');
  assert.strictEqual(blocked.status, 429);
});

const { resetDb } = require('./setup');

test('signup with missing fields is rejected (400)', async () => {
  await resetDb();
  const res = await request(app).post('/auth/signup').send({ username: 'x' });
  assert.strictEqual(res.status, 400);
});

test('attempts with a non-uuid questionId is rejected (400)', async () => {
  await resetDb();
  const s = await request(app).post('/auth/signup').send({ name: 'N', username: 'val', password: 'pw' });
  const tok = s.body.accessToken;
  const res = await request(app)
    .post('/attempts')
    .set('Authorization', `Bearer ${tok}`)
    .send({ subject: 'Calculus', questionId: 'not-a-uuid', selectedAnswer: '4' });
  assert.strictEqual(res.status, 400);
});

test('questions/next with a bad difficulty is rejected (400)', async () => {
  await resetDb();
  const s = await request(app).post('/auth/signup').send({ name: 'N', username: 'val2', password: 'pw' });
  const tok = s.body.accessToken;
  const res = await request(app)
    .get('/questions/next?subject=Calculus&difficulty=banana')
    .set('Authorization', `Bearer ${tok}`);
  assert.strictEqual(res.status, 400);
});
