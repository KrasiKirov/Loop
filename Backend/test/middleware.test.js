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
