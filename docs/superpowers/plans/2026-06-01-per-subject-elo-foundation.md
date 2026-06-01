# Per-Subject ELO + Answer History — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single global ELO with a per-subject rating model and record every answer, creating the data foundation for the retention surfaces.

**Architecture:** A new `user_ratings` table (one rating per user per subject) and an `answers` table (one row per answered question). Two auth-protected endpoints in a new `routes/practice.js` router replace `POST /user/elo`: `GET /me/ratings/:subject` (seeds the quiz) and `POST /answers` (upserts the rating + records the answer in one transaction). The quiz loads/saves the current subject's rating; the global `users.score` and navbar ELO badge are removed.

**Tech Stack:** Node/Express, PostgreSQL (`pg`), `jsonwebtoken`/`bcryptjs` (existing auth); tests via `node:test` + `supertest` (backend) and Jest + `@testing-library/react` (frontend).

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `Backend/subjects.js` | Create | Shared `VALID_SUBJECTS` list |
| `Backend/routes/practice.js` | Create | `GET /me/ratings/:subject`, `POST /answers` |
| `Backend/server.js` | Modify | Import subjects; mount practice router; remove `/user/elo` |
| `Backend/auth/routes.js` | Modify | Drop `elo`/`score` from signup/login/`publicUser` |
| `Backend/schema.sql` | Modify | Add `user_ratings` + `answers`; drop `users.score` |
| `Backend/migrate-per-subject-elo.sql` | Create | Live-DB migration |
| `Backend/test/setup.js` | Modify | Add new tables to test schema + truncate; drop `score` |
| `Backend/test/practice.test.js` | Create | Endpoint tests |
| `Backend/test/authRoutes.test.js` | Modify | Remove `elo` assertions |
| `Backend/test/resourceRoutes.test.js` | Delete | Tested the removed `/user/elo` |
| `src/pages/Quiz.js` | Modify | Load per-subject rating; post `/answers` |
| `src/pages/Navbar.js` | Modify | Remove ELO badge |
| `src/Navbar.css` | Modify | Remove `.navbar-elo` rule |
| `src/pages/Navbar.test.js` | Create | Navbar renders username/logout, no ELO badge |

---

## Task 1: Extract the shared subjects list

**Files:**
- Create: `Backend/subjects.js`
- Modify: `Backend/server.js`

- [ ] **Step 1: Create `Backend/subjects.js`**

```js
module.exports = [
  'Calculus', 'DiscreteMath', 'LinearAlgebra', 'Statistics',
  'Anatomy', 'Microbiology', 'MolecularBiology', 'Physiology',
  'AnalyticalChemistry', 'Biochemistry', 'InorganicChemistry', 'OrganicChemistry',
  'Astrophysics', 'Electromagnetics', 'QuantumMechanics', 'Thermodynamics',
];
```

- [ ] **Step 2: Use it in `Backend/server.js`**

Replace the inline array (the `const VALID_SUBJECTS = [ ... ];` block, lines 15-20) with:
```js
const VALID_SUBJECTS = require('./subjects');
```

- [ ] **Step 3: Run the backend tests to confirm no regression**

Run: `cd Backend && npm test`
Expected: `tests 16 | pass 16 | fail 0`

- [ ] **Step 4: Commit**

```bash
git add Backend/subjects.js Backend/server.js
git commit -m "refactor: extract VALID_SUBJECTS into subjects.js"
```

---

## Task 2: Drop the global ELO from the auth payload

**Files:**
- Modify: `Backend/auth/routes.js`
- Modify: `Backend/test/authRoutes.test.js`

The `user` object no longer carries `elo`; signup stops writing a `score`. `users.score` still exists (default 1000) until Task 5, so the app keeps working.

- [ ] **Step 1: Update the failing test first — `Backend/test/authRoutes.test.js`**

In the test `'signup returns a token pair + user'`, remove the ELO assertion line:
```js
  assert.strictEqual(res.body.user.elo, 1000);
```
Leave the rest of that test (status 201, accessToken, refreshToken, `user.username === 'amy'`) intact.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd Backend && npm test`
Expected: FAIL — `'signup returns a token pair + user'` now expects no `elo`, but the route still returns `elo`, so other assertions pass while the suite still references the old shape. (If it still passes, proceed — the route change in Step 3 is what makes `user.elo` undefined; the removed assertion just stops requiring it.)

- [ ] **Step 3: Update `Backend/auth/routes.js`**

Change `publicUser` (line 12):
```js
const publicUser = (row) => ({ name: row.name, username: row.username });
```

Remove the unused `BASE_RATING` constant (line 10):
```js
// delete: const BASE_RATING = 1000;
```

Change the signup INSERT (lines 28-31) to not write `score` and not return it:
```js
    const { rows } = await pool.query(
      'INSERT INTO users (name, username, password) VALUES ($1,$2,$3) RETURNING id, name, username',
      [name, username, hash]
    );
```

Change the login SELECT (lines 47-50) to drop `score`:
```js
    const { rows } = await pool.query(
      'SELECT id, name, username, password FROM users WHERE username = $1',
      [username]
    );
```

- [ ] **Step 4: Run the backend tests**

Run: `cd Backend && npm test`
Expected: `pass 16` (the `authRoutes` suite passes with the new payload shape; `resourceRoutes` still passes because `/user/elo` and `users.score` still exist).

- [ ] **Step 5: Commit**

```bash
git add Backend/auth/routes.js Backend/test/authRoutes.test.js
git commit -m "feat: drop global elo from auth payload (signup/login/publicUser)"
```

---

## Task 3: Add the new tables to schema + test harness

**Files:**
- Modify: `Backend/schema.sql`
- Modify: `Backend/test/setup.js`

- [ ] **Step 1: Add the tables to `Backend/schema.sql`**

Insert immediately after the `refresh_tokens` table + index (before the `-- All subject tables` comment):
```sql
CREATE TABLE IF NOT EXISTS user_ratings (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject    VARCHAR(100) NOT NULL,
    rating     INTEGER NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, subject)
);
CREATE INDEX IF NOT EXISTS idx_ratings_user ON user_ratings(user_id);

CREATE TABLE IF NOT EXISTS answers (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject        VARCHAR(100) NOT NULL,
    is_correct     BOOLEAN NOT NULL,
    question_score INTEGER NOT NULL,
    rating_after   INTEGER NOT NULL,
    created_at     TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_answers_user ON answers(user_id);
```

- [ ] **Step 2: Update `Backend/test/setup.js`**

Add the two tables to the `SCHEMA` template string (after the `refresh_tokens` block, before the closing backtick):
```sql
CREATE TABLE IF NOT EXISTS user_ratings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(100) NOT NULL,
  rating INTEGER NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, subject)
);
CREATE TABLE IF NOT EXISTS answers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(100) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  question_score INTEGER NOT NULL,
  rating_after INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

Update the `TRUNCATE` line in `resetDb` to include the new tables:
```js
  await pool.query('TRUNCATE answers, user_ratings, refresh_tokens, users RESTART IDENTITY CASCADE');
```

- [ ] **Step 3: Run the backend tests (new tables present, nothing uses them yet)**

Run: `cd Backend && npm test`
Expected: `pass 16`

- [ ] **Step 4: Commit**

```bash
git add Backend/schema.sql Backend/test/setup.js
git commit -m "feat: add user_ratings + answers tables to schema and test harness"
```

---

## Task 4: Practice router — ratings + answers endpoints

**Files:**
- Create: `Backend/routes/practice.js`
- Modify: `Backend/server.js`
- Create: `Backend/test/practice.test.js`

- [ ] **Step 1: Write the failing test `Backend/test/practice.test.js`**

```js
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

test('GET /me/ratings/:subject defaults to 1000 for a new subject', async () => {
  await resetDb();
  const t = await token();
  const res = await request(app).get('/me/ratings/Calculus').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { subject: 'Calculus', rating: 1000 });
});

test('GET /me/ratings requires a token', async () => {
  await resetDb();
  const res = await request(app).get('/me/ratings/Calculus');
  assert.strictEqual(res.status, 401);
});

test('GET /me/ratings rejects an invalid subject', async () => {
  await resetDb();
  const t = await token();
  const res = await request(app).get('/me/ratings/FakeSubject').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(res.status, 400);
});

test('POST /answers requires a token', async () => {
  await resetDb();
  const res = await request(app)
    .post('/answers')
    .send({ subject: 'Calculus', isCorrect: true, questionScore: 800, rating: 1010 });
  assert.strictEqual(res.status, 401);
});

test('POST /answers upserts the rating and records the answer', async () => {
  await resetDb();
  const t = await token();
  const r1 = await request(app).post('/answers').set('Authorization', `Bearer ${t}`)
    .send({ subject: 'Calculus', isCorrect: true, questionScore: 800, rating: 1010 });
  assert.strictEqual(r1.status, 200);
  let g = await request(app).get('/me/ratings/Calculus').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(g.body.rating, 1010);

  const r2 = await request(app).post('/answers').set('Authorization', `Bearer ${t}`)
    .send({ subject: 'Calculus', isCorrect: false, questionScore: 820, rating: 995 });
  assert.strictEqual(r2.status, 200);
  g = await request(app).get('/me/ratings/Calculus').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(g.body.rating, 995);

  const ratings = await pool.query('SELECT count(*)::int AS n FROM user_ratings');
  assert.strictEqual(ratings.rows[0].n, 1); // upsert, not duplicate
  const answers = await pool.query('SELECT count(*)::int AS n FROM answers');
  assert.strictEqual(answers.rows[0].n, 2); // both recorded
});

test('ratings are isolated per subject', async () => {
  await resetDb();
  const t = await token();
  await request(app).post('/answers').set('Authorization', `Bearer ${t}`)
    .send({ subject: 'Calculus', isCorrect: true, questionScore: 800, rating: 1010 });
  const bio = await request(app).get('/me/ratings/Biochemistry').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(bio.body.rating, 1000); // unaffected by Calculus
});

test.after(() => pool.end());
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd Backend && npm test`
Expected: FAIL — the `/me/ratings` and `/answers` routes don't exist yet (404s where 200/400 expected).

- [ ] **Step 3: Implement `Backend/routes/practice.js`**

```js
const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/requireAuth');
const VALID_SUBJECTS = require('../subjects');

const router = express.Router();
const BASE_RATING = 1000;

router.get('/me/ratings/:subject', requireAuth, async (req, res) => {
  const { subject } = req.params;
  if (!VALID_SUBJECTS.includes(subject)) {
    return res.status(400).json({ error: 'Invalid subject' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT rating FROM user_ratings WHERE user_id = $1 AND subject = $2',
      [req.user.id, subject]
    );
    res.json({ subject, rating: rows.length ? rows[0].rating : BASE_RATING });
  } catch (err) {
    console.error('Error fetching rating:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/answers', requireAuth, async (req, res) => {
  const { subject, isCorrect, questionScore, rating } = req.body;
  if (
    !VALID_SUBJECTS.includes(subject) ||
    isCorrect === undefined ||
    questionScore === undefined ||
    rating === undefined
  ) {
    return res.status(400).json({ error: 'subject, isCorrect, questionScore, rating are required' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO user_ratings (user_id, subject, rating, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, subject)
         DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW()`,
      [req.user.id, subject, rating]
    );
    await client.query(
      `INSERT INTO answers (user_id, subject, is_correct, question_score, rating_after)
         VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, subject, isCorrect, questionScore, rating]
    );
    await client.query('COMMIT');
    res.status(200).json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error recording answer:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
});

module.exports = router;
```

- [ ] **Step 4: Mount the router in `Backend/server.js`**

Add the require near the other route imports (after `const authRoutes = require('./auth/routes');`):
```js
const practiceRoutes = require('./routes/practice');
```
Mount it right after `app.use('/auth', authRoutes);`:
```js
app.use(practiceRoutes);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd Backend && npm test`
Expected: all pass — the 6 new `practice` tests plus the existing suites.

- [ ] **Step 6: Commit**

```bash
git add Backend/routes/practice.js Backend/server.js Backend/test/practice.test.js
git commit -m "feat: per-subject ratings + answer recording endpoints (tested)"
```

---

## Task 5: Remove `/user/elo` and drop `users.score`

**Files:**
- Modify: `Backend/server.js`
- Delete: `Backend/test/resourceRoutes.test.js`
- Modify: `Backend/test/setup.js`
- Modify: `Backend/schema.sql`
- Create: `Backend/migrate-per-subject-elo.sql`

- [ ] **Step 1: Remove the `/user/elo` handler from `Backend/server.js`**

Delete the entire `app.post('/user/elo', requireAuth, ...)` block (it spans from `app.post('/user/elo'` through its closing `});`).

- [ ] **Step 2: Delete the obsolete test**

```bash
git rm Backend/test/resourceRoutes.test.js
```
(It only tested the now-removed `/user/elo`; `/questions` auth is covered by `requireAuth.test.js`.)

- [ ] **Step 3: Drop `score` from the test users table — `Backend/test/setup.js`**

In the `SCHEMA` string, change the `users` table so it ends at `password` (remove the `score` column + the trailing comma on the password line):
```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);
```

- [ ] **Step 4: Drop `score` from `Backend/schema.sql`**

In the `users` table definition, remove the `score INTEGER DEFAULT 1000` line and the trailing comma on the `password` line so it ends:
```sql
    password VARCHAR(255) NOT NULL
);
```
(Leave the subject tables' own `score` columns untouched — those are question difficulties.)

- [ ] **Step 5: Create `Backend/migrate-per-subject-elo.sql`**

```sql
-- Per-subject ELO + answer history migration.
-- Run once: psql -d adaptive_learning -f migrate-per-subject-elo.sql

CREATE TABLE IF NOT EXISTS user_ratings (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject    VARCHAR(100) NOT NULL,
    rating     INTEGER NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, subject)
);
CREATE INDEX IF NOT EXISTS idx_ratings_user ON user_ratings(user_id);

CREATE TABLE IF NOT EXISTS answers (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject        VARCHAR(100) NOT NULL,
    is_correct     BOOLEAN NOT NULL,
    question_score INTEGER NOT NULL,
    rating_after   INTEGER NOT NULL,
    created_at     TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_answers_user ON answers(user_id);

ALTER TABLE users DROP COLUMN IF EXISTS score;
```

- [ ] **Step 6: Apply the migration to the dev DB**

Run: `cd Backend && psql -d adaptive_learning -f migrate-per-subject-elo.sql`
Expected: `CREATE TABLE` / `CREATE INDEX` lines, then `ALTER TABLE`.

- [ ] **Step 7: Run the full backend suite**

Run: `cd Backend && npm test`
Expected: all pass (no test references `/user/elo` or `score` anymore).

- [ ] **Step 8: Commit**

```bash
git add Backend/server.js Backend/test/setup.js Backend/schema.sql Backend/migrate-per-subject-elo.sql
git commit -m "feat: remove /user/elo and drop global users.score"
```

---

## Task 6: Frontend — per-subject quiz + remove navbar badge

**Files:**
- Modify: `src/pages/Quiz.js`
- Modify: `src/pages/Navbar.js`
- Modify: `src/Navbar.css`
- Create: `src/pages/Navbar.test.js`

- [ ] **Step 1: Write the failing Navbar test `src/pages/Navbar.test.js`**

```js
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UserProvider } from '../AuthContext';
import Navbar from './Navbar';

test('navbar shows username and logout, and no ELO badge', () => {
  localStorage.clear();
  localStorage.setItem('user', JSON.stringify({ name: 'Pat', username: 'pat' }));
  render(
    <MemoryRouter>
      <UserProvider>
        <Navbar />
      </UserProvider>
    </MemoryRouter>
  );
  expect(screen.getByText('pat')).toBeInTheDocument();
  expect(screen.getByText(/log out/i)).toBeInTheDocument();
  expect(screen.queryByText(/ELO/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `CI=true npx react-scripts test src/pages/Navbar.test.js --watchAll=false`
Expected: FAIL — the current Navbar still renders the `ELO {user.elo}` badge (though with no `elo` it may not show; the test also fails to compile only if imports are wrong — if it already passes because `user.elo` is undefined, proceed to Step 3 to remove the dead badge code regardless).

- [ ] **Step 3: Update `src/pages/Navbar.js`**

Remove the ELO badge block (lines 23-25). The `navbar-right` div becomes:
```jsx
        <div className="navbar-right">
          {user && user.username && (
            <span className="navbar-user">{user.username}</span>
          )}
          <button className="navbar-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
```

- [ ] **Step 4: Remove the `.navbar-elo` rule from `src/Navbar.css`**

Delete the entire `.navbar-elo { ... }` block.

- [ ] **Step 5: Run the Navbar test**

Run: `CI=true npx react-scripts test src/pages/Navbar.test.js --watchAll=false`
Expected: PASS.

- [ ] **Step 6: Rework `src/pages/Quiz.js` for per-subject ratings**

Remove the `useUser` import (line 6) and the `const { user, setUser } = useUser();` line (line 20) — the quiz no longer needs the global user.

Change the `elo` initial state (line 27) to the base default:
```js
  const [elo, setElo] = useState(BASE_RATING);
```

Give `loadQuestion` an explicit elo argument so a freshly-loaded rating is used immediately (replace the signature on line 47 and the `getBounds` call on line 52):
```js
  const loadQuestion = async (difficulty = quizSettings.difficulty, currentElo = elo) => {
    setLoading(true);
    if (difficulty !== quizSettings.difficulty) {
      setQuizSettings((prev) => ({ ...prev, difficulty }));
    }
    const { lower, upper } = getBounds(difficulty, currentElo);
```

Replace the mount effect (lines 86-90) to load the subject's rating first, then the question:
```js
  // On mount: load this subject's saved rating, then the first question.
  useEffect(() => {
    const init = async () => {
      const subject = quizSettings.subject || 'Calculus';
      let rating = BASE_RATING;
      try {
        const res = await apiFetch(`/me/ratings/${subject}`);
        if (res.ok) {
          const data = await res.json();
          rating = data.rating;
          setElo(rating);
        }
      } catch (err) {
        console.error('Failed to load rating:', err);
      }
      await loadQuestion(quizSettings.difficulty, rating);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

Replace `handleSubmit` (lines 97-113) to record the answer per subject (drop the global user write):
```js
  const handleSubmit = () => {
    if (!selectedAnswer || answerSubmitted) return;

    const result = selectedAnswer === question.correctAnswer ? 1 : 0;
    const updatedElo = updateRatings(elo, question.score, result);

    setIsCorrect(result === 1);
    setEloDelta(updatedElo - elo);
    setElo(updatedElo);
    setAnswerSubmitted(true);

    const subject = quizSettings.subject || question.subject;
    apiFetch('/answers', {
      method: 'POST',
      body: {
        subject,
        isCorrect: result === 1,
        questionScore: question.score,
        rating: updatedElo,
      },
    }).catch((err) => console.error('Failed to record answer:', err));
  };
```

- [ ] **Step 7: Verify the build compiles**

Run: `CI=true npx react-scripts build 2>&1 | grep -E "Compiled|Failed|Module not found"`
Expected: `Compiled successfully.`

- [ ] **Step 8: Commit**

```bash
git add src/pages/Quiz.js src/pages/Navbar.js src/Navbar.css src/pages/Navbar.test.js
git commit -m "feat: per-subject quiz ratings; remove navbar ELO badge"
```

---

## Task 7: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full backend suite**

Run: `cd Backend && npm test`
Expected: all pass (tokens, requireAuth, authRoutes, practice).

- [ ] **Step 2: Frontend tests**

Run: `CI=true npx react-scripts test --watchAll=false`
Expected: `client.test.js` and `Navbar.test.js` pass.

- [ ] **Step 3: Production build**

Run: `CI=true npx react-scripts build 2>&1 | grep -E "Compiled|Failed"`
Expected: `Compiled successfully.`

- [ ] **Step 4: Live end-to-end smoke test**

```bash
cd Backend
PORT=4056 node server.js > /tmp/retention-smoke.log 2>&1 &
SRV=$!
sleep 2
B=http://localhost:4056
U="ret_$RANDOM"
ACC=$(curl -s -X POST $B/auth/signup -H 'Content-Type: application/json' -d "{\"name\":\"R\",\"username\":\"$U\",\"password\":\"pw\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")
echo "Calculus default (expect 1000):"; curl -s $B/me/ratings/Calculus -H "Authorization: Bearer $ACC"
echo; echo "record a Calculus answer (rating 1015):"; curl -s -o /dev/null -w "%{http_code}\n" -X POST $B/answers -H "Authorization: Bearer $ACC" -H 'Content-Type: application/json' -d '{"subject":"Calculus","isCorrect":true,"questionScore":800,"rating":1015}'
echo "Calculus now (expect 1015):"; curl -s $B/me/ratings/Calculus -H "Authorization: Bearer $ACC"
echo; echo "Biochemistry still default (expect 1000):"; curl -s $B/me/ratings/Biochemistry -H "Authorization: Bearer $ACC"
echo; kill $SRV 2>/dev/null
psql -d adaptive_learning -c "DELETE FROM users WHERE username LIKE 'ret_%';" >/dev/null 2>&1
```
Expected: Calculus 1000 → after answer 1015; Biochemistry independently 1000; answer POST returns 200.

- [ ] **Step 5: Push**

```bash
git push personal master
```

---

## Notes for the implementer

- **Test DB:** backend tests run against `adaptive_learning_test`; `test/setup.js` owns its schema. The dev DB migration (Task 5) is separate and only matters for the live smoke test.
- **Identity:** both new endpoints derive the user from `req.user.id` (the verified token) — the body never carries a user id.
- **Rounding:** the client sends an already-integer `rating` (`elo.js`'s `updateRatings` calls `Math.round`), matching the `INTEGER` columns.
