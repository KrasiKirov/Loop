# Security Hardening — Plan 3: API Hardening Middleware

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the standard API-edge protections: rate limiting (brute-force), input validation (zod), a CORS origin allowlist, and security headers (helmet).

**Architecture:** Express middleware layered in `server.js` — `helmet` for headers, a CORS allowlist (env-driven), a global + an auth-specific rate limiter (env-configurable so tests aren't throttled), and a small `validate(schema)` middleware backed by zod schemas on the write/query endpoints.

**Tech Stack:** Node/Express, `express-rate-limit`, `helmet`, `zod`; tests via `node:test` + `supertest`.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `Backend/package.json` | Modify | Add `express-rate-limit`, `helmet`, `zod` |
| `Backend/.env` | Modify | `CORS_ORIGINS` (+ test-only rate caps documented) |
| `Backend/test/setup.js` | Modify | Set high rate-limit caps so the suite isn't throttled |
| `Backend/middleware/rateLimit.js` | Create | `createLimiter(max, windowMs)` factory |
| `Backend/middleware/validate.js` | Create | `validate(schema, source)` middleware |
| `Backend/server.js` | Modify | Wire helmet, CORS allowlist, trust proxy, limiters |
| `Backend/auth/routes.js` | Modify | zod schemas + `validate` on signup/login/refresh |
| `Backend/routes/practice.js` | Modify | zod schemas + `validate` on `/attempts` + `/questions/next` |
| `Backend/test/middleware.test.js` | Create | CORS + helmet + rate-limit + validation tests |

---

## Task 1: Dependencies + test caps

**Files:** Modify `Backend/package.json`, `Backend/.env`, `Backend/test/setup.js`

- [ ] **Step 1: Install the libraries**

```bash
cd Backend && npm install express-rate-limit helmet zod
```
Expected: three packages added, no errors.

- [ ] **Step 2: Add `CORS_ORIGINS` to `Backend/.env`**

Append:
```
CORS_ORIGINS=http://localhost:3000
```

- [ ] **Step 3: Set high rate caps in tests — `Backend/test/setup.js`**

Add these lines to the top env block (alongside the existing `process.env.DB_*` assignments), so the suite's many auth requests from one IP aren't rate-limited:
```js
process.env.RATE_LIMIT_AUTH_MAX = '1000000';
process.env.RATE_LIMIT_GLOBAL_MAX = '1000000';
```

- [ ] **Step 4: Commit**

```bash
git add Backend/package.json Backend/package-lock.json Backend/test/setup.js
git commit -m "chore: add express-rate-limit, helmet, zod; high rate caps in tests"
```

---

## Task 2: helmet + CORS allowlist + trust proxy

**Files:** Modify `Backend/server.js`, Create `Backend/test/middleware.test.js`

- [ ] **Step 1: Write the failing test `Backend/test/middleware.test.js`**

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd Backend && npm test`
Expected: FAIL — no `x-frame-options` header (helmet not added) and CORS currently reflects all origins.

- [ ] **Step 3: Update `Backend/server.js`**

Replace the top of the file (requires + middleware setup) with:
```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const { authPool, userPool } = require('./db');
const authRoutes = require('./auth/routes');
const practiceRoutes = require('./routes/practice');
const insightsRoutes = require('./routes/insights');

const app = express();
app.set('trust proxy', 1); // correct client IP behind a hosting proxy (for rate limiting)

app.use(helmet({ frameguard: { action: 'deny' } }));

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .concat(['capacitor://localhost', 'http://localhost', 'https://localhost']); // Capacitor app origins
app.use(
  cors({
    origin(origin, cb) {
      // No Origin header = non-browser client (curl, native app, server-to-server) — allow.
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, false); // disallowed: respond without CORS headers (browser will block)
    },
  })
);

app.use(bodyParser.json());

app.use('/auth', authRoutes);
app.use(practiceRoutes);
app.use(insightsRoutes);
```
Leave the `if (require.main === module) { ... }` block and `module.exports = app;` unchanged.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd Backend && npm test`
Expected: the 3 middleware tests pass; all existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add Backend/server.js Backend/test/middleware.test.js
git commit -m "feat: helmet headers + CORS origin allowlist + trust proxy"
```

---

## Task 3: Rate limiting

**Files:** Create `Backend/middleware/rateLimit.js`, Modify `Backend/server.js`, `Backend/test/middleware.test.js`

- [ ] **Step 1: Add the failing test to `Backend/test/middleware.test.js`**

Insert before the end of the file (after the existing tests):
```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd Backend && npm test`
Expected: FAIL — `Cannot find module '../middleware/rateLimit'`.

- [ ] **Step 3: Create `Backend/middleware/rateLimit.js`**

```js
const rateLimit = require('express-rate-limit');

// Factory so the limit/window are explicit and testable.
const createLimiter = (max, windowMs = 15 * 60 * 1000) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });

module.exports = { createLimiter };
```

- [ ] **Step 4: Wire the limiters in `Backend/server.js`**

Add the require near the other requires:
```js
const { createLimiter } = require('./middleware/rateLimit');
```
Define the limiters after `const app = express();` / `app.set('trust proxy', 1);`:
```js
const globalLimiter = createLimiter(Number(process.env.RATE_LIMIT_GLOBAL_MAX) || 300, 60 * 1000);
const authLimiter = createLimiter(Number(process.env.RATE_LIMIT_AUTH_MAX) || 10, 15 * 60 * 1000);
```
Apply the global limiter after `app.use(bodyParser.json());`:
```js
app.use(globalLimiter);
```
Apply the auth limiter on the auth mount — change `app.use('/auth', authRoutes);` to:
```js
app.use('/auth', authLimiter, authRoutes);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd Backend && npm test`
Expected: the limiter test passes; all existing tests still pass (the test caps from Task 1 keep the suite from being throttled).

- [ ] **Step 6: Commit**

```bash
git add Backend/middleware/rateLimit.js Backend/server.js Backend/test/middleware.test.js
git commit -m "feat: global + auth rate limiting (env-configurable)"
```

---

## Task 4: Input validation (zod)

**Files:** Create `Backend/middleware/validate.js`, Modify `Backend/auth/routes.js`, `Backend/routes/practice.js`, `Backend/test/middleware.test.js`

- [ ] **Step 1: Add the failing tests to `Backend/test/middleware.test.js`**

Insert before the end of the file:
```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd Backend && npm test`
Expected: FAIL — the non-uuid `questionId` and `difficulty=banana` currently reach handlers that don't reject them with 400 (the bad difficulty just yields default bounds; the non-uuid id would 404 or 500, not 400). (The missing-fields signup may already 400 via the handler's own check — that's fine.)

- [ ] **Step 3: Create `Backend/middleware/validate.js`**

```js
// validate(schema, source) — 400s on malformed input. Does not mutate req
// (handlers read the same raw values; this is a gate, not a transformer).
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  next();
};

module.exports = { validate };
```

- [ ] **Step 4: Add schemas + `validate` in `Backend/auth/routes.js`**

Add near the top (after the existing requires):
```js
const { z } = require('zod');
const { validate } = require('../middleware/validate');

const signupSchema = z.object({
  name: z.string().min(1).max(255),
  username: z.string().min(1).max(255),
  password: z.string().min(1).max(255),
});
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
```
Then add the middleware to each route definition:
- `router.post('/signup', validate(signupSchema), async (req, res) => {`
- `router.post('/login', validate(loginSchema), async (req, res) => {`
- `router.post('/refresh', validate(refreshSchema), async (req, res) => {`
(Leave `/logout` as-is — it tolerates a missing token by design.)

- [ ] **Step 5: Add schemas + `validate` in `Backend/routes/practice.js`**

Add near the top (after the existing requires):
```js
const { z } = require('zod');
const { validate } = require('../middleware/validate');

const attemptSchema = z.object({
  subject: z.string().min(1),
  questionId: z.string().uuid(),
  selectedAnswer: z.string(),
});
const nextQuerySchema = z.object({
  subject: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});
```
Then add the middleware AFTER `requireAuth` on the two routes:
- `router.get('/questions/next', requireAuth, validate(nextQuerySchema, 'query'), async (req, res) => {`
- `router.post('/attempts', requireAuth, validate(attemptSchema), async (req, res) => {`

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd Backend && npm test`
Expected: the 3 validation tests pass; all existing tests still pass (valid requests satisfy the schemas; the `/attempts` 404 test uses a valid UUID, and `difficulty=medium` is in the enum).

- [ ] **Step 7: Commit**

```bash
git add Backend/middleware/validate.js Backend/auth/routes.js Backend/routes/practice.js Backend/test/middleware.test.js
git commit -m "feat: zod input validation on auth + practice endpoints"
```

---

## Task 5: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full backend suite**

Run: `cd Backend && npm test`
Expected: all pass (tokens, requireAuth, authRoutes, elo, practice, insights, rls, middleware).

- [ ] **Step 2: Frontend tests + build (unchanged, sanity)**

Run: `CI=true npx react-scripts test --watchAll=false` then `CI=true npx react-scripts build 2>&1 | grep -E "Compiled|Failed"`
Expected: frontend tests pass; `Compiled successfully.`

- [ ] **Step 3: Live hardening smoke test**

```bash
cd Backend
PORT=4065 RATE_LIMIT_AUTH_MAX=3 node server.js > /tmp/sec3-smoke.log 2>&1 &
SRV=$!
sleep 2
B=http://localhost:4065
echo "=== helmet header ==="; curl -s -D - -o /dev/null "$B/me/stats" | grep -i "x-frame-options"
echo "=== CORS: allowed vs evil origin (ACAO line) ==="
curl -s -D - -o /dev/null -X OPTIONS "$B/auth/login" -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: POST" | grep -i "access-control-allow-origin" || echo "(none for allowed?)"
curl -s -D - -o /dev/null -X OPTIONS "$B/auth/login" -H "Origin: http://evil.example" -H "Access-Control-Request-Method: POST" | grep -i "access-control-allow-origin" || echo "(no ACAO for evil — correct)"
echo "=== rate limit: 4 logins with AUTH_MAX=3 (last should be 429) ==="
for i in 1 2 3 4; do curl -s -o /dev/null -w "login $i -> %{http_code}\n" -X POST "$B/auth/login" -H 'Content-Type: application/json' -d '{"username":"nobody","password":"x"}'; done
echo "=== validation: malformed signup -> 400 ==="
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$B/auth/signup" -H 'Content-Type: application/json' -d '{"username":123}'
kill $SRV 2>/dev/null
echo "=== done ==="
```
Expected: `X-Frame-Options: DENY`; ACAO present for the allowed origin and absent for `evil.example`; the 4th login returns `429`; the malformed signup returns `400`.

- [ ] **Step 4: Push**

```bash
git push personal master
```

---

## Notes for the implementer

- **Rate limits are env-configurable** (`RATE_LIMIT_AUTH_MAX`, `RATE_LIMIT_GLOBAL_MAX`); `test/setup.js` sets them very high so the suite's many same-IP auth requests aren't throttled, while the dedicated test exercises the factory with a low cap. Production sets sensible values in the host env.
- **CORS** allows requests with no `Origin` header (curl, native apps, server-to-server) — CORS only constrains browser cross-origin JS. Capacitor origins are included for the eventual mobile app.
- **`validate` is a gate, not a transformer** — it 400s on bad input but doesn't mutate `req` (avoids Express version quirks with `req.query`).
- **Commit messages: title only**, no body, no `Co-Authored-By`.
