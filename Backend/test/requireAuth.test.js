require('./setup');
const { test } = require('node:test');
const assert = require('node:assert');
const express = require('express');
const request = require('supertest');
const requireAuth = require('../middleware/requireAuth');
const { signAccessToken } = require('../auth/tokens');

const app = express();
app.get('/protected', requireAuth, (req, res) => res.json({ id: req.user.id, username: req.user.username }));

test('rejects a request with no token', async () => {
  const res = await request(app).get('/protected');
  assert.strictEqual(res.status, 401);
});

test('rejects a malformed header', async () => {
  const res = await request(app).get('/protected').set('Authorization', 'Token abc');
  assert.strictEqual(res.status, 401);
});

test('accepts a valid token and exposes req.user', async () => {
  const token = signAccessToken({ id: 42, username: 'sam' });
  const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.id, 42);
  assert.strictEqual(res.body.username, 'sam');
});
