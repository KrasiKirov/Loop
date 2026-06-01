require('./setup');
const { test } = require('node:test');
const assert = require('node:assert');
const express = require('express');
const request = require('supertest');
const { resetDb, pool } = require('./setup');
const authRoutes = require('../auth/routes');

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

const signup = (over = {}) =>
  request(app).post('/auth/signup').send({ name: 'A', username: 'amy', password: 'pw', ...over });

test('signup returns a token pair + user', async () => {
  await resetDb();
  const res = await signup();
  assert.strictEqual(res.status, 201);
  assert.ok(res.body.accessToken);
  assert.ok(res.body.refreshToken);
  assert.strictEqual(res.body.user.username, 'amy');
});

test('signup rejects a duplicate username', async () => {
  await resetDb();
  await signup();
  const res = await signup();
  assert.strictEqual(res.status, 400);
});

test('login succeeds with correct password, 401 with wrong', async () => {
  await resetDb();
  await signup();
  const ok = await request(app).post('/auth/login').send({ username: 'amy', password: 'pw' });
  assert.strictEqual(ok.status, 200);
  assert.ok(ok.body.accessToken);
  const bad = await request(app).post('/auth/login').send({ username: 'amy', password: 'nope' });
  assert.strictEqual(bad.status, 401);
});

test('login with an unknown user returns 401 (no enumeration)', async () => {
  await resetDb();
  const res = await request(app).post('/auth/login').send({ username: 'ghost', password: 'pw' });
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.error, 'Invalid username or password');
});

test('refresh rotates; old refresh token then 401s', async () => {
  await resetDb();
  const { body } = await signup();
  const r1 = await request(app).post('/auth/refresh').send({ refreshToken: body.refreshToken });
  assert.strictEqual(r1.status, 200);
  assert.ok(r1.body.accessToken);
  assert.notStrictEqual(r1.body.refreshToken, body.refreshToken);
  const reuse = await request(app).post('/auth/refresh').send({ refreshToken: body.refreshToken });
  assert.strictEqual(reuse.status, 401);
});

test('logout revokes the refresh token', async () => {
  await resetDb();
  const { body } = await signup();
  const out = await request(app).post('/auth/logout').send({ refreshToken: body.refreshToken });
  assert.strictEqual(out.status, 204);
  const after = await request(app).post('/auth/refresh').send({ refreshToken: body.refreshToken });
  assert.strictEqual(after.status, 401);
});

test.after(() => pool.end());
