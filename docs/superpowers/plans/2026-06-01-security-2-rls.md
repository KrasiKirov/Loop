# Security Hardening — Plan 2: Two-Role RLS + Denormalized Username

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Row-Level Security as DB-enforced defense-in-depth: the app connects as two least-privilege roles (`app_auth` for the pre-auth subsystem, `app_user` for authenticated features), every table has RLS policies, and a denormalized `username` lets the leaderboard avoid the `users` table so `app_user` needs zero access to it.

**Architecture:** Postgres RLS `ENABLE` (not FORCE) so the non-owner app roles are restricted while the owner (migrations/seed/tests) is not. `db.js` exposes `authPool`, `userPool`, and a `withUserContext(userId, fn)` helper that sets `app.current_user_id` in a transaction; endpoints that touch the private `answers` table run through it. The migration/seed/test-harness connect as the DB owner and bypass RLS.

**Tech Stack:** Node/Express, PostgreSQL (`pg`, RLS, `current_setting`/`set_config`); tests via `node:test` + `supertest`.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `Backend/schema.sql` | Modify | `username` column; roles, grants, RLS enable + policies |
| `Backend/migrate-rls.sql` | Create | Pointer to the clean-slate reset (re-run schema+seed) |
| `Backend/db.js` | Modify | `authPool`, `userPool`, `withUserContext` |
| `Backend/auth/tokens.js` | Modify | Use `authPool` |
| `Backend/auth/routes.js` | Modify | Use `authPool` |
| `Backend/routes/practice.js` | Modify | `userPool`; `/attempts` via `withUserContext`; write `username` |
| `Backend/routes/insights.js` | Modify | `userPool`; `/me/stats` via `withUserContext`; leaderboard reads `user_ratings.username` |
| `Backend/.env` | Modify | Role connection vars |
| `Backend/test/setup.js` | Modify | Admin pool (owner) for seeding; create roles + RLS |
| `Backend/test/rls.test.js` | Create | RLS isolation tests |

---

## Task 1: Denormalized username (no RLS yet)

Adds `user_ratings.username`, writes it in `/attempts`, and switches the leaderboard to read it (dropping the `users` join). Keeps the existing single pool — purely a data-shape change so RLS can later exclude `users` from `app_user`.

**Files:** Modify `Backend/schema.sql`, `Backend/routes/practice.js`, `Backend/routes/insights.js`, `Backend/test/insights.test.js`

- [ ] **Step 1: Add `username` to `user_ratings` in `Backend/schema.sql`**

In the `user_ratings` CREATE TABLE, add a `username` column after `rating`:
```sql
CREATE TABLE IF NOT EXISTS user_ratings (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject    VARCHAR(100) NOT NULL,
    rating     INTEGER NOT NULL,
    username   VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, subject)
);
```

- [ ] **Step 2: Add `username` to the test harness table in `Backend/test/setup.js`**

In the `user_ratings` block of the `SCHEMA` string, add `username VARCHAR(255) NOT NULL,` after the `rating INTEGER NOT NULL,` line.

- [ ] **Step 3: Write `username` in the `/attempts` upsert — `Backend/routes/practice.js`**

In the `POST /attempts` handler, change the `user_ratings` upsert to include `username` (from `req.user.username`):
```js
    await client.query(
      `INSERT INTO user_ratings (user_id, subject, rating, username, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id, subject)
         DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW()`,
      [req.user.id, subject, newRating, req.user.username]
    );
```

- [ ] **Step 4: Leaderboard reads `user_ratings.username` — `Backend/routes/insights.js`**

Replace the `topQ` query (which joins `users`) with one that reads the denormalized column:
```js
    const topQ = await pool.query(
      `SELECT username, rating
         FROM user_ratings
        WHERE subject = $1
        ORDER BY rating DESC, username ASC
        LIMIT 20`,
      [subject]
    );
```
(The `me` rank query is unchanged.)

- [ ] **Step 5: Update the leaderboard test seeding — `Backend/test/insights.test.js`**

Change the `setRating` helper to also write `username`:
```js
async function setRating(username, subject, rating) {
  await pool.query(
    `INSERT INTO user_ratings (user_id, subject, rating, username)
       SELECT id, $2, $3, $1 FROM users WHERE username = $1
       ON CONFLICT (user_id, subject) DO UPDATE SET rating = EXCLUDED.rating`,
    [username, subject, rating]
  );
}
```

- [ ] **Step 6: Apply to dev DB + run tests**

```bash
cd Backend
psql -d adaptive_learning -f migrate-uuid-reset.sql
psql -d adaptive_learning -f schema.sql
psql -d adaptive_learning -f seed.sql
npm test
```
Expected: all tests pass (31).

- [ ] **Step 7: Commit**

```bash
git add Backend/schema.sql Backend/routes/practice.js Backend/routes/insights.js Backend/test/insights.test.js Backend/test/setup.js
git commit -m "feat: denormalize username into user_ratings; leaderboard avoids users join"
```

---

## Task 2: Roles, grants, RLS policies in schema

Adds the two login roles, least-privilege grants, RLS enable, and policies to `schema.sql`. The app still connects as the owner for now (owner bypasses non-FORCE RLS), so nothing breaks yet — Task 3 switches the app to the restricted roles.

**Files:** Modify `Backend/schema.sql`, Create `Backend/migrate-rls.sql`

- [ ] **Step 1: Append the roles + RLS block to the END of `Backend/schema.sql`** (after all table definitions)

```sql
-- ============================================================
-- Roles + Row-Level Security
-- Local dev uses trust auth, so roles are LOGIN with no password.
-- (Production sets passwords + scram in pg_hba; do not commit secrets.)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_auth') THEN
    CREATE ROLE app_auth LOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO app_auth, app_user;

-- app_auth: the pre-auth subsystem — full DML on users + refresh_tokens only.
GRANT SELECT, INSERT, UPDATE, DELETE ON users, refresh_tokens TO app_auth;

-- app_user: authenticated features.
GRANT SELECT, INSERT, UPDATE ON user_ratings TO app_user;
GRANT SELECT, INSERT ON answers TO app_user;
GRANT SELECT ON
  calculus, discretemath, linearalgebra, statistics,
  anatomy, microbiology, molecularbiology, physiology,
  analyticalchemistry, biochemistry, inorganicchemistry, organicchemistry,
  astrophysics, electromagnetics, quantummechanics, thermodynamics
  TO app_user;

-- Enable RLS (not FORCE: the owner role used by migrations/seed/tests bypasses it;
-- the non-owner app roles are always subject to it).
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- users + refresh_tokens: only app_auth, permissive (pre-auth lookups by username/hash).
CREATE POLICY users_auth ON users TO app_auth USING (true) WITH CHECK (true);
CREATE POLICY rt_auth ON refresh_tokens TO app_auth USING (true) WITH CHECK (true);

-- user_ratings: app_user reads all (leaderboard), writes only its own.
CREATE POLICY ratings_read ON user_ratings FOR SELECT TO app_user USING (true);
CREATE POLICY ratings_insert ON user_ratings FOR INSERT TO app_user
  WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);
CREATE POLICY ratings_update ON user_ratings FOR UPDATE TO app_user
  USING (user_id = current_setting('app.current_user_id')::uuid)
  WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);

-- answers: fully private to the owner.
CREATE POLICY answers_own ON answers FOR ALL TO app_user
  USING (user_id = current_setting('app.current_user_id')::uuid)
  WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);

-- question tables: public read for app_user.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'calculus','discretemath','linearalgebra','statistics',
    'anatomy','microbiology','molecularbiology','physiology',
    'analyticalchemistry','biochemistry','inorganicchemistry','organicchemistry',
    'astrophysics','electromagnetics','quantummechanics','thermodynamics']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO app_user USING (true);', t || '_read', t);
  END LOOP;
END $$;
```

- [ ] **Step 2: Create `Backend/migrate-rls.sql`**

```sql
-- RLS is folded into schema.sql + the clean-slate reset.
-- Apply (pre-launch) with:
--   psql -d adaptive_learning -f migrate-uuid-reset.sql
--   psql -d adaptive_learning -f schema.sql
--   psql -d adaptive_learning -f seed.sql
-- This file is a documentation pointer; no statements needed.
SELECT 'Run migrate-uuid-reset.sql then schema.sql then seed.sql' AS note;
```

- [ ] **Step 3: Apply to the dev DB + sanity check the roles exist**

```bash
cd Backend
psql -d adaptive_learning -f migrate-uuid-reset.sql
psql -d adaptive_learning -f schema.sql
psql -d adaptive_learning -f seed.sql
psql -d adaptive_learning -c "\du app_user app_auth" | cat
psql -d adaptive_learning -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity ORDER BY tablename;" | cat
```
Expected: both roles listed; all app tables show row security enabled.

- [ ] **Step 4: Run the suite (app still connects as owner → bypasses RLS → green)**

```bash
cd Backend && npm test
```
Expected: 31 pass (test harness connects as owner; nothing switched to the restricted roles yet).

- [ ] **Step 5: Commit**

```bash
git add Backend/schema.sql Backend/migrate-rls.sql
git commit -m "feat: add app_auth/app_user roles, grants, and RLS policies"
```

---

## Task 3: Two pools + withUserContext; wire the app to the roles

Switches the app's DB access to the restricted roles. `db.js` exposes `authPool`, `userPool`, `withUserContext`. Auth code uses `authPool`; feature code uses `userPool`, with the two `answers`-touching endpoints (`/attempts`, `/me/stats`) running inside `withUserContext`. The test harness keeps an **owner** pool for seeding (bypasses RLS) and exposes it as `pool`, so existing test seeding is unchanged.

**Files:** Modify `Backend/db.js`, `Backend/server.js`, `Backend/auth/tokens.js`, `Backend/auth/routes.js`, `Backend/routes/practice.js`, `Backend/routes/insights.js`, `Backend/.env`, `Backend/test/setup.js`

- [ ] **Step 1: Rewrite `Backend/db.js`**

```js
const { Pool } = require('pg');

const base = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'adaptive_learning',
};

// app_auth: pre-auth subsystem (users + refresh_tokens).
const authPool = new Pool({
  ...base,
  user: process.env.DB_AUTH_USER || 'app_auth',
  password: process.env.DB_AUTH_PASSWORD || '',
});

// app_user: authenticated features (ratings, answers, questions).
const userPool = new Pool({
  ...base,
  user: process.env.DB_APP_USER || 'app_user',
  password: process.env.DB_APP_PASSWORD || '',
});

// Run fn(client) inside a transaction with the RLS user context set, so
// answers/user_ratings policies that key off app.current_user_id apply.
async function withUserContext(userId, fn) {
  const client = await userPool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { authPool, userPool, withUserContext };
```

- [ ] **Step 1b: Update `Backend/server.js`** (it currently requires the default `db` export and calls `pool.connect()`)

Change `const pool = require('./db');` to:
```js
const { authPool, userPool } = require('./db');
```
Replace the startup connection check inside `if (require.main === module)`:
```js
  Promise.all([authPool.query('SELECT 1'), userPool.query('SELECT 1')])
    .then(() => console.log('Connected to PostgreSQL database.'))
    .catch((err) => console.error('Could not connect to the database:', err));
```

- [ ] **Step 2: Update `Backend/auth/tokens.js` to use `authPool`**

Change the require line `const pool = require('../db');` to:
```js
const { authPool } = require('../db');
```
Then replace every `pool.query(` in the file with `authPool.query(`.

- [ ] **Step 3: Update `Backend/auth/routes.js` to use `authPool`**

Change `const pool = require('../db');` to:
```js
const { authPool } = require('../db');
```
Then replace every `pool.query(` with `authPool.query(`.

- [ ] **Step 4: Update `Backend/routes/practice.js`**

Change `const pool = require('../db');` to:
```js
const { userPool, withUserContext } = require('../db');
```
In `GET /me/ratings/:subject` and `GET /questions/next`, replace every `pool.query(` with `userPool.query(`.
Rewrite `POST /attempts` to run inside `withUserContext` (replacing the manual `pool.connect()`/BEGIN/COMMIT):
```js
router.post('/attempts', requireAuth, async (req, res) => {
  const { subject, questionId, selectedAnswer } = req.body;
  if (!VALID_SUBJECTS.includes(subject) || !questionId || selectedAnswer === undefined) {
    return res.status(400).json({ error: 'subject, questionId, selectedAnswer are required' });
  }
  const table = subject.toLowerCase();
  try {
    const out = await withUserContext(req.user.id, async (client) => {
      const qres = await client.query(
        `SELECT correctanswer, feedback, score FROM ${table} WHERE id = $1`,
        [questionId]
      );
      if (!qres.rows.length) return { notFound: true };
      const q = qres.rows[0];
      const correct = selectedAnswer === q.correctanswer;

      const ratingQ = await client.query(
        'SELECT rating FROM user_ratings WHERE user_id = $1 AND subject = $2',
        [req.user.id, subject]
      );
      const current = ratingQ.rows.length ? ratingQ.rows[0].rating : BASE_RATING;
      const newRating = updateRatings(current, q.score, correct ? 1 : 0);

      await client.query(
        `INSERT INTO user_ratings (user_id, subject, rating, username, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (user_id, subject)
           DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW()`,
        [req.user.id, subject, newRating, req.user.username]
      );
      await client.query(
        `INSERT INTO answers (user_id, subject, is_correct, question_score, rating_after)
           VALUES ($1, $2, $3, $4, $5)`,
        [req.user.id, subject, correct, q.score, newRating]
      );
      return {
        correct,
        correctAnswer: q.correctanswer,
        feedback: q.feedback,
        rating: newRating,
        ratingDelta: newRating - current,
      };
    });
    if (out.notFound) return res.status(404).json({ error: 'Question not found' });
    res.json(out);
  } catch (err) {
    console.error('Error recording attempt:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
```

- [ ] **Step 5: Update `Backend/routes/insights.js`**

Change `const pool = require('../db');` to:
```js
const { userPool, withUserContext } = require('../db');
```
In `GET /leaderboard/:subject`, replace every `pool.query(` with `userPool.query(`.
Rewrite `GET /me/stats` to run its three queries inside `withUserContext` (the `answers` reads require the user context):
```js
router.get('/me/stats', requireAuth, async (req, res) => {
  try {
    const data = await withUserContext(req.user.id, async (client) => {
      const overallQ = await client.query(
        `SELECT count(*)::int AS answered,
                count(*) FILTER (WHERE is_correct)::int AS correct
           FROM answers WHERE user_id = $1`,
        [req.user.id]
      );
      const o = overallQ.rows[0];
      const overall = { answered: o.answered, correct: o.correct, accuracy: accuracy(o.correct, o.answered) };

      const subjQ = await client.query(
        `SELECT r.subject, r.rating,
                count(a.id)::int AS answered,
                count(a.id) FILTER (WHERE a.is_correct)::int AS correct
           FROM user_ratings r
           LEFT JOIN answers a ON a.user_id = r.user_id AND a.subject = r.subject
          WHERE r.user_id = $1
          GROUP BY r.subject, r.rating
          ORDER BY r.subject`,
        [req.user.id]
      );

      const trendQ = await client.query(
        `SELECT subject, rating_after FROM answers
          WHERE user_id = $1 ORDER BY created_at ASC, id ASC`,
        [req.user.id]
      );
      const trends = {};
      for (const row of trendQ.rows) {
        (trends[row.subject] = trends[row.subject] || []).push(row.rating_after);
      }

      const subjects = subjQ.rows.map((s) => ({
        subject: s.subject,
        rating: s.rating,
        answered: s.answered,
        correct: s.correct,
        accuracy: accuracy(s.correct, s.answered),
        trend: (trends[s.subject] || []).slice(-TREND_LIMIT),
      }));

      return { overall, subjects };
    });
    res.json(data);
  } catch (err) {
    console.error('Error building stats:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
```

- [ ] **Step 6: Add role connection vars to `Backend/.env`**

Append (local Postgres uses trust auth, so passwords are empty):
```
DB_AUTH_USER=app_auth
DB_AUTH_PASSWORD=
DB_APP_USER=app_user
DB_APP_PASSWORD=
```

- [ ] **Step 7: Rewrite `Backend/test/setup.js`** so seeding uses an owner (admin) pool that bypasses RLS, while the app under test uses the role pools from `db.js`

```js
// Must run before any module that reads these env vars or requires ./db.
process.env.DB_NAME = process.env.TEST_DB_NAME || 'adaptive_learning_test';
process.env.JWT_ACCESS_SECRET = 'test-secret';
process.env.DB_AUTH_USER = 'app_auth';
process.env.DB_AUTH_PASSWORD = '';
process.env.DB_APP_USER = 'app_user';
process.env.DB_APP_PASSWORD = '';

const { Pool } = require('pg');

// Admin pool connects as the DB owner (no role override) — bypasses RLS for
// schema setup + test seeding.
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_OWNER || process.env.USER,
  password: process.env.DB_OWNER_PASSWORD || '',
});

const SCHEMA = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
DROP TABLE IF EXISTS answers, user_ratings, refresh_tokens, calculus, users CASCADE;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE user_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(100) NOT NULL,
  rating INTEGER NOT NULL,
  username VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, subject)
);
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(100) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  question_score INTEGER NOT NULL,
  rating_after INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE calculus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer1 TEXT NOT NULL, answer2 TEXT NOT NULL, answer3 TEXT NOT NULL, answer4 TEXT NOT NULL,
  correctanswer TEXT NOT NULL,
  feedback TEXT,
  score INTEGER DEFAULT 15,
  subject VARCHAR(100)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_auth') THEN CREATE ROLE app_auth LOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN CREATE ROLE app_user LOGIN; END IF;
END $$;
GRANT USAGE ON SCHEMA public TO app_auth, app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON users, refresh_tokens TO app_auth;
GRANT SELECT, INSERT, UPDATE ON user_ratings TO app_user;
GRANT SELECT, INSERT ON answers TO app_user;
GRANT SELECT ON calculus TO app_user;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculus ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_auth ON users TO app_auth USING (true) WITH CHECK (true);
CREATE POLICY rt_auth ON refresh_tokens TO app_auth USING (true) WITH CHECK (true);
CREATE POLICY ratings_read ON user_ratings FOR SELECT TO app_user USING (true);
CREATE POLICY ratings_insert ON user_ratings FOR INSERT TO app_user
  WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);
CREATE POLICY ratings_update ON user_ratings FOR UPDATE TO app_user
  USING (user_id = current_setting('app.current_user_id')::uuid)
  WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);
CREATE POLICY answers_own ON answers FOR ALL TO app_user
  USING (user_id = current_setting('app.current_user_id')::uuid)
  WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);
CREATE POLICY calculus_read ON calculus FOR SELECT TO app_user USING (true);
`;

async function resetDb() {
  await pool.query(SCHEMA);
}

module.exports = { pool, resetDb };
```

- [ ] **Step 8: Run the suite**

```bash
cd Backend && npm test
```
Expected: all 31 pass — auth flows via `app_auth`, feature flows via `app_user` (with `withUserContext` for `/attempts` + `/me/stats`), seeding via the owner pool.

- [ ] **Step 9: Commit**

```bash
git add Backend/db.js Backend/server.js Backend/auth/tokens.js Backend/auth/routes.js Backend/routes/practice.js Backend/routes/insights.js Backend/test/setup.js
git commit -m "feat: connect app via least-privilege app_auth/app_user roles with RLS context"
```

---

## Task 4: RLS isolation tests

Proves the policies actually block cross-user access at the DB, independent of app logic.

**Files:** Create `Backend/test/rls.test.js`

- [ ] **Step 1: Write `Backend/test/rls.test.js`**

```js
require('./setup');
const { test } = require('node:test');
const assert = require('node:assert');
const { pool, resetDb } = require('./setup'); // owner pool (bypasses RLS) for seeding
const { userPool } = require('../db');         // app_user (subject to RLS)

// Run a query as app_user with a given user context (or none).
async function asUser(userId, sql, params) {
  const client = await userPool.connect();
  try {
    await client.query('BEGIN');
    if (userId) await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
    const r = await client.query(sql, params);
    await client.query('COMMIT');
    return r;
  } finally {
    client.release();
  }
}

async function makeUserWithAnswer(username, ratingAfter) {
  const u = await pool.query(
    "INSERT INTO users (name, username, password) VALUES ('N', $1, 'x') RETURNING id",
    [username]
  );
  const id = u.rows[0].id;
  await pool.query(
    `INSERT INTO answers (user_id, subject, is_correct, question_score, rating_after)
       VALUES ($1, 'Calculus', true, 800, $2)`,
    [id, ratingAfter]
  );
  await pool.query(
    `INSERT INTO user_ratings (user_id, subject, rating, username) VALUES ($1, 'Calculus', $2, $3)`,
    [id, ratingAfter, username]
  );
  return id;
}

test('app_user sees only its own answers', async () => {
  await resetDb();
  const a = await makeUserWithAnswer('alice', 1010);
  const b = await makeUserWithAnswer('bob', 1020);

  const mine = await asUser(a, 'SELECT count(*)::int AS n FROM answers');
  assert.strictEqual(mine.rows[0].n, 1); // only alice's row visible under alice context

  const bobRows = await asUser(a, 'SELECT count(*)::int AS n FROM answers WHERE user_id = $1', [b]);
  assert.strictEqual(bobRows.rows[0].n, 0); // cannot see bob's answers
});

test('app_user cannot write a rating for another user', async () => {
  await resetDb();
  const a = await makeUserWithAnswer('alice', 1010);
  const b = await makeUserWithAnswer('bob', 1020);

  await assert.rejects(
    () => asUser(a, `INSERT INTO user_ratings (user_id, subject, rating, username) VALUES ($1, 'Anatomy', 1500, 'bob')`, [b]),
    /row-level security|policy/i
  );
});

test('app_user can read all ratings (leaderboard is public)', async () => {
  await resetDb();
  const a = await makeUserWithAnswer('alice', 1010);
  await makeUserWithAnswer('bob', 1020);
  const all = await asUser(a, 'SELECT count(*)::int AS n FROM user_ratings');
  assert.ok(all.rows[0].n >= 2); // ratings SELECT policy is permissive
});

test.after(() => userPool.end());
```

- [ ] **Step 2: Run the suite**

```bash
cd Backend && npm test
```
Expected: all pass, including the 3 new RLS isolation tests.

- [ ] **Step 3: Commit**

```bash
git add Backend/test/rls.test.js
git commit -m "test: RLS isolation — answers private, rating writes own-only, ratings readable"
```

---

## Task 5: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full backend suite**

```bash
cd Backend && npm test
```
Expected: all pass (tokens, requireAuth, authRoutes, elo, practice, insights, rls).

- [ ] **Step 2: Live RLS smoke test**

```bash
cd Backend
PORT=4059 node server.js > /tmp/sec2-smoke.log 2>&1 &
SRV=$!
sleep 2
B=http://localhost:4059
U="rls_$RANDOM"
ACC=$(curl -s -X POST $B/auth/signup -H 'Content-Type: application/json' -d "{\"name\":\"R\",\"username\":\"$U\",\"password\":\"pw\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")
echo "next question:"; Q=$(curl -s "$B/questions/next?subject=Calculus&difficulty=medium" -H "Authorization: Bearer $ACC"); QID=$(echo "$Q" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])"); echo "$Q" | python3 -m json.tool
echo "attempt (writes via app_user + RLS context):"; curl -s -X POST $B/attempts -H "Authorization: Bearer $ACC" -H 'Content-Type: application/json' -d "{\"subject\":\"Calculus\",\"questionId\":\"$QID\",\"selectedAnswer\":\"4\"}" | python3 -m json.tool
echo "my stats (reads answers via RLS context):"; curl -s $B/me/stats -H "Authorization: Bearer $ACC" | python3 -m json.tool
kill $SRV 2>/dev/null
psql -d adaptive_learning -c "DELETE FROM users WHERE username LIKE 'rls_%';" >/dev/null 2>&1
echo "=== cleaned up ==="
```
Expected: the question loads, the attempt records (rating updates) through `app_user` + the RLS context, and `/me/stats` returns the user's own answers — proving the role-scoped pools + `withUserContext` work end-to-end.

- [ ] **Step 3: Push**

```bash
git push personal master
```

---

## Notes for the implementer

- **RLS is ENABLE, not FORCE** — the app connects as the non-owner roles `app_auth`/`app_user` (always subject to RLS); the owner role used by `schema.sql`/`seed.sql`/`test/setup.js` bypasses it, which is what makes migrations + seeding work.
- **Local auth is trust** — roles are `LOGIN` with empty passwords; production sets real passwords + scram and never commits them.
- **`withUserContext` is required only for the two `answers`-touching endpoints** (`/attempts`, `/me/stats`); reads of `user_ratings`/question tables run on `userPool` directly (their SELECT policies are permissive).
- **Commit messages: title only**, no body, no `Co-Authored-By`.
