# Auth Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace spoofable localStorage auth with JWT access tokens + DB-backed rotating refresh tokens, and derive identity server-side on every protected write.

**Architecture:** Express backend split into focused modules (`db.js`, `auth/tokens.js`, `auth/routes.js`, `middleware/requireAuth.js`). Access tokens are short-lived JWTs; refresh tokens are random opaque strings stored hashed in a `refresh_tokens` table with rotation + reuse detection. The React frontend gets a single `apiFetch` client that auto-refreshes on 401, plus an `AuthContext`.

**Tech Stack:** Node/Express, PostgreSQL (`pg`), `jsonwebtoken`, `bcryptjs`, `dotenv`; React (CRA); tests via Node's built-in `node:test` + `supertest` (backend) and Jest (frontend).

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `Backend/db.js` | Create | Shared `pg` Pool |
| `Backend/auth/tokens.js` | Create | Sign/verify access tokens; create/rotate/revoke refresh tokens |
| `Backend/middleware/requireAuth.js` | Create | Bearer-token guard → `req.user` |
| `Backend/auth/routes.js` | Create | `/auth/signup`, `/login`, `/refresh`, `/logout` |
| `Backend/server.js` | Modify | Wire routers + middleware; guard `/questions`, `/user/elo`; export app |
| `Backend/schema.sql` | Modify | Add `refresh_tokens` table |
| `Backend/migrate-refresh-tokens.sql` | Create | Migration for existing DB |
| `Backend/test/setup.js` | Create | Test DB pool + reset helper |
| `Backend/test/*.test.js` | Create | Integration/unit tests |
| `src/api/client.js` | Create | `apiFetch` + token storage helpers |
| `src/api/client.test.js` | Create | Refresh-and-retry test |
| `src/AuthContext.js` | Create | Replaces `UserContext.js` (`useUser`, `login`, `signup`, `logout`) |
| `src/UserContext.js` | Delete | Replaced by AuthContext |
| `src/components/PrivateRoute.jsx` | Modify | Gate on access token |
| `src/pages/LoginForm.js` | Modify | Use `login()` |
| `src/pages/SignupForm.js` | Modify | Use `signup()` |
| `src/pages/Navbar.js` | Modify | Use `logout()` |
| `src/pages/Quiz.js` | Modify | `apiFetch('/user/elo')`, no username in body |
| `src/index.js` | Modify | Import provider from AuthContext |

---

## Task 1: Project setup — deps, test DB, secret, scripts

**Files:**
- Modify: `Backend/package.json`
- Modify: `Backend/.env`

- [ ] **Step 1: Install dependencies**

Run from `Backend/`:
```bash
cd Backend && npm install jsonwebtoken dotenv && npm install --save-dev supertest
```
Expected: packages added, no errors.

- [ ] **Step 2: Create the test database**

```bash
createdb adaptive_learning_test 2>/dev/null || true
```
Expected: no output (created, or already exists).

- [ ] **Step 3: Add the JWT secret to `Backend/.env`**

Append to `Backend/.env`:
```
JWT_ACCESS_SECRET=dev-only-change-in-production-8f3a1c9e2b
```

- [ ] **Step 4: Add the test script in `Backend/package.json`**

Replace the `"test"` line in the `scripts` block:
```json
  "scripts": {
    "test": "node --test test/",
    "start": "node server.js"
  },
```

- [ ] **Step 5: Commit**

```bash
git add Backend/package.json Backend/package-lock.json
git commit -m "chore: add jsonwebtoken, dotenv, supertest; test script + test DB"
```

---

## Task 2: Extract the shared DB pool

**Files:**
- Create: `Backend/db.js`
- Modify: `Backend/server.js`

This is a refactor with no behavior change — it lets every module share one pool.

- [ ] **Step 1: Create `Backend/db.js`**

```js
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'adaptive_learning',
  user: process.env.DB_USER || process.env.USER,
  password: process.env.DB_PASSWORD || '',
});

module.exports = pool;
```

- [ ] **Step 2: Replace the pool definition in `Backend/server.js`**

At the very top of `Backend/server.js`, the first lines become:
```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./db');
```

Delete the old `const { Pool } = require('pg');` line, the entire `const pool = new Pool({ ... });` block, and the `bcrypt` require if present at top (bcrypt now lives in `auth/routes.js`). Keep the rest of the file for now.

- [ ] **Step 3: Verify the server still starts**

```bash
cd Backend && node -e "require('./db'); console.log('pool ok')"
```
Expected: `pool ok`

- [ ] **Step 4: Commit**

```bash
git add Backend/db.js Backend/server.js
git commit -m "refactor: extract pg pool into db.js"
```

---

## Task 3: `refresh_tokens` table + migration

**Files:**
- Modify: `Backend/schema.sql`
- Create: `Backend/migrate-refresh-tokens.sql`

- [ ] **Step 1: Add the table to `Backend/schema.sql`**

Insert immediately after the `users` table definition:
```sql
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked    BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);
```

- [ ] **Step 2: Create `Backend/migrate-refresh-tokens.sql`**

```sql
-- Adds the refresh_tokens table to an already-seeded database.
-- Run once: psql -d adaptive_learning -f migrate-refresh-tokens.sql

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked    BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);
```

- [ ] **Step 3: Apply the migration to the dev database**

```bash
cd Backend && psql -d adaptive_learning -f migrate-refresh-tokens.sql
```
Expected: `CREATE TABLE` then `CREATE INDEX`.

- [ ] **Step 4: Commit**

```bash
git add Backend/schema.sql Backend/migrate-refresh-tokens.sql
git commit -m "feat: add refresh_tokens table + migration"
```

---

## Task 4: Token module (`auth/tokens.js`)

**Files:**
- Create: `Backend/test/setup.js`
- Create: `Backend/auth/tokens.js`
- Create: `Backend/test/tokens.test.js`

- [ ] **Step 1: Create the test harness `Backend/test/setup.js`**

```js
// Must run before any module that reads these env vars or requires ./db.
process.env.DB_NAME = process.env.TEST_DB_NAME || 'adaptive_learning_test';
process.env.JWT_ACCESS_SECRET = 'test-secret';

const pool = require('../db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  score INTEGER DEFAULT 1000
);
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
`;

async function resetDb() {
  await pool.query(SCHEMA);
  await pool.query('TRUNCATE refresh_tokens, users RESTART IDENTITY CASCADE');
}

module.exports = { pool, resetDb };
```

- [ ] **Step 2: Write the failing test `Backend/test/tokens.test.js`**

```js
require('./setup');
const { test } = require('node:test');
const assert = require('node:assert');
const { pool, resetDb } = require('./setup');
const {
  signAccessToken, verifyAccessToken,
  createRefreshToken, rotateRefreshToken, revokeRefreshToken,
} = require('../auth/tokens');

async function makeUser() {
  const { rows } = await pool.query(
    "INSERT INTO users (name, username, password) VALUES ('A','u'||floor(random()*1e9),'x') RETURNING id, username"
  );
  return rows[0];
}

test('access token round-trips', () => {
  const token = signAccessToken({ id: 7, username: 'bob' });
  const payload = verifyAccessToken(token);
  assert.strictEqual(payload.sub, 7);
  assert.strictEqual(payload.username, 'bob');
});

test('rotation issues a new token and invalidates the old', async () => {
  await resetDb();
  const user = await makeUser();
  const raw = await createRefreshToken(user.id);
  const { userId, newRefreshToken } = await rotateRefreshToken(raw);
  assert.strictEqual(userId, user.id);
  assert.notStrictEqual(newRefreshToken, raw);
  await assert.rejects(() => rotateRefreshToken(raw), (e) => e.code === 'REUSE');
});

test('reuse revokes the whole family', async () => {
  await resetDb();
  const user = await makeUser();
  const raw = await createRefreshToken(user.id);
  const { newRefreshToken } = await rotateRefreshToken(raw);
  await assert.rejects(() => rotateRefreshToken(raw), (e) => e.code === 'REUSE');
  // the newly-issued token is now also revoked
  await assert.rejects(() => rotateRefreshToken(newRefreshToken), (e) => e.code === 'REUSE');
});

test('revoke makes a token unusable', async () => {
  await resetDb();
  const user = await makeUser();
  const raw = await createRefreshToken(user.id);
  await revokeRefreshToken(raw);
  await assert.rejects(() => rotateRefreshToken(raw), (e) => e.code === 'REUSE');
});

test.after(() => pool.end());
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
cd Backend && npm test
```
Expected: FAIL — `Cannot find module '../auth/tokens'`.

- [ ] **Step 4: Implement `Backend/auth/tokens.js`**

```js
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-insecure-secret';
const ACCESS_TTL = '15m';
const REFRESH_TTL_DAYS = 30;

const signAccessToken = (user) =>
  jwt.sign({ sub: user.id, username: user.username }, ACCESS_SECRET, { expiresIn: ACCESS_TTL });

const verifyAccessToken = (token) => jwt.verify(token, ACCESS_SECRET);

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const createRefreshToken = async (userId) => {
  const raw = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, hashToken(raw), expiresAt]
  );
  return raw;
};

const fail = (code) => {
  const e = new Error(code);
  e.code = code;
  return e;
};

// Validate + rotate a refresh token. Returns { userId, newRefreshToken }.
// Throws Error with .code of INVALID | EXPIRED | REUSE.
const rotateRefreshToken = async (raw) => {
  const { rows } = await pool.query('SELECT * FROM refresh_tokens WHERE token_hash = $1', [hashToken(raw)]);
  const row = rows[0];
  if (!row) throw fail('INVALID');
  if (new Date(row.expires_at) < new Date()) throw fail('EXPIRED');
  if (row.revoked) {
    await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1', [row.user_id]);
    throw fail('REUSE');
  }
  await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1', [row.id]);
  const newRefreshToken = await createRefreshToken(row.user_id);
  return { userId: row.user_id, newRefreshToken };
};

const revokeRefreshToken = async (raw) => {
  await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1', [hashToken(raw)]);
};

module.exports = {
  signAccessToken, verifyAccessToken,
  createRefreshToken, rotateRefreshToken, revokeRefreshToken, hashToken,
};
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd Backend && npm test
```
Expected: all `tokens.test.js` tests PASS.

- [ ] **Step 6: Commit**

```bash
git add Backend/auth/tokens.js Backend/test/setup.js Backend/test/tokens.test.js
git commit -m "feat: token module with rotation + reuse detection (tested)"
```

---

## Task 5: `requireAuth` middleware

**Files:**
- Create: `Backend/middleware/requireAuth.js`
- Create: `Backend/test/requireAuth.test.js`

- [ ] **Step 1: Write the failing test `Backend/test/requireAuth.test.js`**

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd Backend && npm test
```
Expected: FAIL — `Cannot find module '../middleware/requireAuth'`.

- [ ] **Step 3: Implement `Backend/middleware/requireAuth.js`**

```js
const { verifyAccessToken } = require('../auth/tokens');

module.exports = function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd Backend && npm test
```
Expected: `requireAuth.test.js` tests PASS (tokens tests still pass too).

- [ ] **Step 5: Commit**

```bash
git add Backend/middleware/requireAuth.js Backend/test/requireAuth.test.js
git commit -m "feat: requireAuth bearer-token middleware (tested)"
```

---

## Task 6: Auth routes (`/auth/*`)

**Files:**
- Create: `Backend/auth/routes.js`
- Create: `Backend/test/authRoutes.test.js`

- [ ] **Step 1: Write the failing test `Backend/test/authRoutes.test.js`**

```js
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
  assert.strictEqual(res.body.user.elo, 1000);
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd Backend && npm test
```
Expected: FAIL — `Cannot find module '../auth/routes'`.

- [ ] **Step 3: Implement `Backend/auth/routes.js`**

```js
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const {
  signAccessToken, createRefreshToken, rotateRefreshToken, revokeRefreshToken,
} = require('./tokens');

const router = express.Router();
const SALT_ROUNDS = 10;
const BASE_RATING = 1000;

const publicUser = (row) => ({ name: row.name, username: row.username, elo: row.score });

const issuePair = async (user) => ({
  accessToken: signAccessToken(user),
  refreshToken: await createRefreshToken(user.id),
});

router.post('/signup', async (req, res) => {
  const { name, username, password } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ error: 'Name, username, and password are required' });
  }
  try {
    const exists = await pool.query('SELECT 1 FROM users WHERE username = $1', [username]);
    if (exists.rows.length) return res.status(400).json({ error: 'User already exists' });
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const { rows } = await pool.query(
      'INSERT INTO users (name, username, password, score) VALUES ($1,$2,$3,$4) RETURNING id, name, username, score',
      [name, username, hash, BASE_RATING]
    );
    const user = rows[0];
    const pair = await issuePair(user);
    res.status(201).json({ ...pair, user: publicUser(user) });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT id, name, username, password, score FROM users WHERE username = $1',
      [username]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const pair = await issuePair(user);
    res.json({ ...pair, user: publicUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });
  try {
    const { userId, newRefreshToken } = await rotateRefreshToken(refreshToken);
    const { rows } = await pool.query('SELECT id, username FROM users WHERE id = $1', [userId]);
    res.json({ accessToken: signAccessToken(rows[0]), refreshToken: newRefreshToken });
  } catch (err) {
    if (['INVALID', 'EXPIRED', 'REUSE'].includes(err.code)) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) await revokeRefreshToken(refreshToken).catch(() => {});
  res.status(204).end();
});

module.exports = router;
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd Backend && npm test
```
Expected: `authRoutes.test.js` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add Backend/auth/routes.js Backend/test/authRoutes.test.js
git commit -m "feat: /auth signup, login, refresh, logout (tested)"
```

---

## Task 7: Wire routers + guard resource routes in `server.js`

**Files:**
- Modify: `Backend/server.js`
- Create: `Backend/test/resourceRoutes.test.js`

- [ ] **Step 1: Write the failing test `Backend/test/resourceRoutes.test.js`**

```js
require('./setup');
const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { resetDb, pool } = require('./setup');
const app = require('../server');

async function signupAndToken() {
  const res = await request(app).post('/auth/signup').send({ name: 'A', username: 'zoe', password: 'pw' });
  return res.body; // { accessToken, refreshToken, user }
}

test('/user/elo requires a token', async () => {
  await resetDb();
  const res = await request(app).post('/user/elo').send({ elo: 1200 });
  assert.strictEqual(res.status, 401);
});

test('/user/elo updates the authenticated user only', async () => {
  await resetDb();
  const { accessToken } = await signupAndToken();
  const res = await request(app)
    .post('/user/elo')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ elo: 1234, username: 'someone-else' }); // body identity must be ignored
  assert.strictEqual(res.status, 200);
  const { rows } = await pool.query('SELECT score FROM users WHERE username = $1', ['zoe']);
  assert.strictEqual(rows[0].score, 1234);
});

test.after(() => pool.end());
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd Backend && npm test
```
Expected: FAIL — `/user/elo` currently has no auth (returns 200 without a token, or `app` is not exported).

- [ ] **Step 3: Rewrite `Backend/server.js`**

Replace the entire file with:
```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./db');
const requireAuth = require('./middleware/requireAuth');
const authRoutes = require('./auth/routes');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/auth', authRoutes);

const VALID_SUBJECTS = [
  'Calculus', 'DiscreteMath', 'LinearAlgebra', 'Statistics',
  'Anatomy', 'Microbiology', 'MolecularBiology', 'Physiology',
  'AnalyticalChemistry', 'Biochemistry', 'InorganicChemistry', 'OrganicChemistry',
  'Astrophysics', 'Electromagnetics', 'QuantumMechanics', 'Thermodynamics',
];

app.get('/questions', requireAuth, async (req, res) => {
  const { subject } = req.query;
  if (!subject || !VALID_SUBJECTS.includes(subject)) {
    return res.status(400).send('Invalid or missing subject');
  }
  try {
    const result = await pool.query(`SELECT * FROM ${subject.toLowerCase()}`);
    if (!result.rows.length) return res.status(404).send('No questions found');
    const questions = result.rows.map((row) => ({
      question: row.question,
      answer1: row.answer1,
      answer2: row.answer2,
      answer3: row.answer3,
      answer4: row.answer4,
      correctAnswer: row.correctanswer,
      feedback: row.feedback,
      score: row.score,
      subject: row.subject,
    }));
    res.json(questions);
  } catch (err) {
    console.error('Error fetching questions:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/user/elo', requireAuth, async (req, res) => {
  const { elo } = req.body;
  if (elo === undefined) return res.status(400).json({ error: 'elo is required' });
  try {
    await pool.query('UPDATE users SET score = $1 WHERE id = $2', [elo, req.user.id]);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error updating ELO:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

if (require.main === module) {
  pool.connect()
    .then(() => console.log('Connected to PostgreSQL database.'))
    .catch((err) => console.error('Could not connect to the database:', err));
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd Backend && npm test
```
Expected: all backend tests PASS.

- [ ] **Step 5: Commit**

```bash
git add Backend/server.js Backend/test/resourceRoutes.test.js
git commit -m "feat: guard /questions + /user/elo with requireAuth; identity from token"
```

---

## Task 8: Frontend API client (`apiFetch`)

**Files:**
- Create: `src/api/client.js`
- Create: `src/api/client.test.js`

- [ ] **Step 1: Write the failing test `src/api/client.test.js`**

```js
import { apiFetch } from './client';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('accessToken', 'old-access');
  localStorage.setItem('refreshToken', 'refresh-1');
});

test('on 401 it refreshes once and retries with the new token', async () => {
  const calls = [];
  global.fetch = jest.fn((url, opts) => {
    calls.push({ url, auth: opts.headers && opts.headers.Authorization });
    if (url.endsWith('/questions?subject=Calculus') && opts.headers.Authorization === 'Bearer old-access') {
      return Promise.resolve({ status: 401, ok: false });
    }
    if (url.endsWith('/auth/refresh')) {
      return Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve({ accessToken: 'new-access', refreshToken: 'refresh-2' }) });
    }
    return Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve([{ question: 'q' }]) });
  });

  const res = await apiFetch('/questions?subject=Calculus');
  expect(res.status).toBe(200);
  expect(localStorage.getItem('accessToken')).toBe('new-access');
  expect(localStorage.getItem('refreshToken')).toBe('refresh-2');
  // the retry carried the new bearer token
  expect(calls[calls.length - 1].auth).toBe('Bearer new-access');
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
CI=true npx react-scripts test src/api/client.test.js --watchAll=false
```
Expected: FAIL — `Cannot find module './client'`.

- [ ] **Step 3: Implement `src/api/client.js`**

```js
const API_URL = process.env.REACT_APP_API_URL;

export const setTokens = ({ accessToken, refreshToken }) => {
  if (accessToken) localStorage.setItem('accessToken', accessToken);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
};

export const clearAuth = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

const refreshTokens = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return false;
  setTokens(await res.json());
  return true;
};

export const apiFetch = async (path, options = {}, retry = true) => {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const access = localStorage.getItem('accessToken');
  if (access) headers.Authorization = `Bearer ${access}`;

  const body =
    options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers, body });

  if (res.status === 401 && retry) {
    if (await refreshTokens()) return apiFetch(path, options, false);
    clearAuth();
    if (typeof window !== 'undefined') window.location.href = '/login';
  }
  return res;
};
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
CI=true npx react-scripts test src/api/client.test.js --watchAll=false
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api/client.js src/api/client.test.js
git commit -m "feat: apiFetch client with transparent token refresh (tested)"
```

---

## Task 9: `AuthContext` (replaces `UserContext`)

**Files:**
- Create: `src/AuthContext.js`
- Delete: `src/UserContext.js`
- Modify: `src/index.js`

- [ ] **Step 1: Create `src/AuthContext.js`**

```js
import React, { createContext, useState, useContext } from 'react';
import { setTokens, clearAuth } from './api/client';

const AuthContext = createContext(null);
export const useUser = () => useContext(AuthContext);

const API_URL = process.env.REACT_APP_API_URL;

export const UserProvider = ({ children }) => {
  const [user, setUserState] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const persistUser = (u) => {
    setUserState(u);
    if (u && u.username) localStorage.setItem('user', JSON.stringify(u));
    else localStorage.removeItem('user');
  };

  const login = async (username, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error('Invalid username or password');
    const data = await res.json();
    setTokens(data);
    persistUser(data.user);
    return data.user;
  };

  const signup = async (name, username, password) => {
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, password }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || 'Signup failed');
    }
    const data = await res.json();
    setTokens(data);
    persistUser(data.user);
    return data.user;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
    clearAuth();
    persistUser({});
  };

  // setUser keeps Quiz's local ELO update working.
  return (
    <AuthContext.Provider value={{ user, setUser: persistUser, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

- [ ] **Step 2: Delete `src/UserContext.js`**

```bash
git rm src/UserContext.js
```

- [ ] **Step 3: Update the import in `src/index.js`**

Change:
```js
import { UserProvider } from './UserContext';
```
to:
```js
import { UserProvider } from './AuthContext';
```

- [ ] **Step 4: Verify the build compiles**

```bash
CI=true npx react-scripts build 2>&1 | grep -E "Compiled|Failed|Module not found"
```
Expected: `Compiled successfully.` (Navbar/Quiz still import `useUser` from `../UserContext` — they are updated in Task 10, so if the build fails on those imports, proceed to Task 10 and re-verify there.)

> Note: `Navbar.js` and `Quiz.js` currently `import { useUser } from '../UserContext'`. Update those import paths to `'../AuthContext'` as part of this step so the build passes:
> - `src/pages/Navbar.js`: `import { useUser } from '../AuthContext';`
> - `src/pages/Quiz.js`: `import { useUser } from '../AuthContext';`
> - `src/components/PrivateRoute.jsx`: `import { useUser } from '../AuthContext';`

- [ ] **Step 5: Commit**

```bash
git add src/AuthContext.js src/index.js src/pages/Navbar.js src/pages/Quiz.js src/components/PrivateRoute.jsx
git commit -m "feat: AuthContext with login/signup/logout, replacing UserContext"
```

---

## Task 10: Update components to the new auth flow

**Files:**
- Modify: `src/pages/LoginForm.js`
- Modify: `src/pages/SignupForm.js`
- Modify: `src/pages/Navbar.js`
- Modify: `src/pages/Quiz.js`
- Modify: `src/components/PrivateRoute.jsx`

- [ ] **Step 1: Update `src/pages/LoginForm.js` submit handler**

Replace the `handleSubmit` function body and ensure `useUser` is imported from `'../AuthContext'`:
```js
const { login } = useUser();
const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        await login(username, password);
        navigate('/home');
    } catch (error) {
        setMessage(error.message || 'Login failed');
    }
};
```
Remove the old `fetch('.../login')` block and the `setUser`/manual `data.json()` handling.

- [ ] **Step 2: Update `src/pages/SignupForm.js` submit handler**

Import `useUser` from `'../AuthContext'`, then:
```js
const { signup } = useUser();
const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        await signup(name, username, password);
        navigate('/home');
    } catch (error) {
        setMessage(error.message || 'Signup failed');
    }
};
```
(Signup now logs the user straight in — it returns a token pair — so navigate to `/home`, not `/login`.)

- [ ] **Step 3: Update `src/pages/Navbar.js` logout**

The handler becomes:
```js
const { user, logout } = useUser();
const navigate = useNavigate();

const handleLogout = async () => {
  await logout();
  navigate('/login');
};
```

- [ ] **Step 4: Update `src/pages/Quiz.js` ELO persistence**

Add the import:
```js
import { apiFetch } from '../api/client';
```
Replace the raw `fetch(`${process.env.REACT_APP_API_URL}/user/elo`, ...)` call in `handleSubmit` with:
```js
apiFetch('/user/elo', {
  method: 'POST',
  body: { elo: updatedElo },
}).catch((err) => console.error('Failed to persist ELO:', err));
```
Also switch the questions fetch to the client so it carries the token. Replace:
```js
const response = await fetch(`${process.env.REACT_APP_API_URL}/questions?subject=${subject}`);
```
with:
```js
const response = await apiFetch(`/questions?subject=${subject}`);
```

- [ ] **Step 5: Update `src/components/PrivateRoute.jsx`**

```jsx
import { Navigate, Outlet } from 'react-router-dom';

function PrivateRoute() {
  const isAuthed = Boolean(localStorage.getItem('accessToken'));
  return isAuthed ? <Outlet /> : <Navigate to="/login" replace />;
}

export default PrivateRoute;
```

- [ ] **Step 6: Verify the build compiles**

```bash
CI=true npx react-scripts build 2>&1 | grep -E "Compiled|Failed|Module not found"
```
Expected: `Compiled successfully.`

- [ ] **Step 7: Commit**

```bash
git add src/pages/LoginForm.js src/pages/SignupForm.js src/pages/Navbar.js src/pages/Quiz.js src/components/PrivateRoute.jsx
git commit -m "feat: wire components to token auth (login/signup/logout/apiFetch)"
```

---

## Task 11: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full backend test suite**

```bash
cd Backend && npm test
```
Expected: all tests across `tokens`, `requireAuth`, `authRoutes`, `resourceRoutes` PASS.

- [ ] **Step 2: Run the frontend test**

```bash
CI=true npx react-scripts test --watchAll=false
```
Expected: `client.test.js` PASS.

- [ ] **Step 3: Production build**

```bash
CI=true npx react-scripts build 2>&1 | grep -E "Compiled|Failed"
```
Expected: `Compiled successfully.`

- [ ] **Step 4: Manual smoke test**

Start backend (`cd Backend && node server.js`) and frontend (`npm start`). Then:
1. Sign up a new user → lands on `/home` logged in.
2. Answer a question → ELO updates and persists on refresh.
3. Open DevTools → Application → Local Storage: confirm `accessToken` + `refreshToken` exist; `user` no longer needs trusting.
4. Log out → redirected to `/login`; `/home` now redirects to `/login`.
5. In DevTools, confirm `POST /user/elo` requests carry `Authorization: Bearer ...` and no username in the body.

- [ ] **Step 5: Push**

```bash
git push personal master
```

---

## Notes for the implementer

- **Env loading:** `server.js` calls `require('dotenv').config()`. Tests set `DB_NAME`/`JWT_ACCESS_SECRET` in `test/setup.js` *before* requiring `./db` or `./server`; `dotenv` does not override already-set vars, so the test DB is used.
- **Test DB:** tests run against `adaptive_learning_test` (created in Task 1). They never touch the dev database.
- **Existing users:** anyone created before this change still logs in normally and receives tokens. Old `user`-only localStorage is treated as logged-out until next login.
