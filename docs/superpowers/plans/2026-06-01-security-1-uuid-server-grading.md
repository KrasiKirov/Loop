# Security Hardening — Plan 1: UUID Clean-Slate + Server-Side Grading

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert all primary keys to UUIDs and move question selection, grading, and ELO computation server-side so the client can never see an answer in advance or forge a rating.

**Architecture:** Clean-slate UUID schema (re-seed questions). A backend `elo.js` module. Two new endpoints replace client logic: `GET /questions/next` (server picks an in-band question, no answer) and `POST /attempts` (server grades + updates the rating). The old bulk `GET /questions` and `POST /answers` are removed. This plan keeps the existing single `pool` — the two-role/RLS split is Plan 2.

**Tech Stack:** Node/Express, PostgreSQL (`pg`, `gen_random_uuid()`); React (CRA); tests via `node:test` + `supertest` and Jest.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `Backend/schema.sql` | Modify | UUID PKs/FKs on all tables |
| `Backend/migrate-uuid-reset.sql` | Create | Drop + recreate everything (dev DB) |
| `Backend/test/setup.js` | Modify | UUID test schema + a `calculus` question table; drop+create reset |
| `Backend/elo.js` | Create | Server ELO module (BASE_RATING, getBounds, updateRatings) |
| `Backend/test/elo.test.js` | Create | ELO unit tests |
| `Backend/routes/practice.js` | Modify | Add `/questions/next` + `/attempts`; remove `/answers` |
| `Backend/test/practice.test.js` | Modify | Tests for the new endpoints |
| `Backend/server.js` | Modify | Remove the old bulk `/questions` route |
| `Backend/test/insights.test.js` | Modify | Use `/attempts` instead of `/answers` to seed data |
| `src/pages/Quiz.js` | Modify | Use `/questions/next` + `/attempts`; drop client ELO/grading |
| `src/pages/elo.js` | Delete | Logic now server-side |

---

## Task 1: UUID clean-slate schema + harness

**Files:**
- Modify: `Backend/schema.sql`
- Create: `Backend/migrate-uuid-reset.sql`
- Modify: `Backend/test/setup.js`

- [ ] **Step 1: Convert `Backend/schema.sql` to UUIDs**

At the very top of `schema.sql`, add (defensive — `gen_random_uuid()` is core in PG13+, this also covers older installs):
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```
Then run these two replacements over the whole file:
```bash
cd Backend
sed -i '' 's/SERIAL PRIMARY KEY/UUID PRIMARY KEY DEFAULT gen_random_uuid()/g' schema.sql
sed -i '' 's/INTEGER NOT NULL REFERENCES users(id)/UUID NOT NULL REFERENCES users(id)/g' schema.sql
```
This makes every `id` a UUID and every `user_id` FK a UUID, leaving non-FK integers (`score`, `rating`, `question_score`) untouched.

- [ ] **Step 2: Verify the conversion**

Run: `cd Backend && grep -nE "SERIAL|INTEGER NOT NULL REFERENCES" schema.sql || echo "no SERIAL or integer FKs remain"`
Expected: `no SERIAL or integer FKs remain`

- [ ] **Step 3: Create `Backend/migrate-uuid-reset.sql`**

```sql
-- DESTRUCTIVE clean-slate reset to UUID schema (pre-launch only).
-- Run: psql -d adaptive_learning -f migrate-uuid-reset.sql
--   then: psql -d adaptive_learning -f schema.sql
--   then: psql -d adaptive_learning -f seed.sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

- [ ] **Step 4: Rewrite `Backend/test/setup.js`** (UUID types, drop+create reset, add a `calculus` table for grading tests)

```js
// Must run before any module that reads these env vars or requires ./db.
process.env.DB_NAME = process.env.TEST_DB_NAME || 'adaptive_learning_test';
process.env.JWT_ACCESS_SECRET = 'test-secret';

const pool = require('../db');

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
  answer1 TEXT NOT NULL,
  answer2 TEXT NOT NULL,
  answer3 TEXT NOT NULL,
  answer4 TEXT NOT NULL,
  correctanswer TEXT NOT NULL,
  feedback TEXT,
  score INTEGER DEFAULT 15,
  subject VARCHAR(100)
);
`;

// resetDb drops + recreates (ensures correct UUID types each run).
async function resetDb() {
  await pool.query(SCHEMA);
}

module.exports = { pool, resetDb };
```

- [ ] **Step 5: Apply the reset to the dev database**

```bash
cd Backend
psql -d adaptive_learning -f migrate-uuid-reset.sql
psql -d adaptive_learning -f schema.sql
psql -d adaptive_learning -f seed.sql
```
Expected: the reset runs, schema creates all tables, seed inserts questions. Verify: `psql -d adaptive_learning -c "SELECT id FROM calculus LIMIT 1;"` returns a UUID.

- [ ] **Step 6: Run the backend suite (ids now UUID, should be transparent)**

Run: `cd Backend && npm test`
Expected: all existing tests pass (ids flow through as opaque strings).

- [ ] **Step 7: Commit**

```bash
git add Backend/schema.sql Backend/migrate-uuid-reset.sql Backend/test/setup.js
git commit -m "feat: convert all primary keys to UUID (clean-slate)"
```

---

## Task 2: Backend ELO module

**Files:**
- Create: `Backend/elo.js`
- Create: `Backend/test/elo.test.js`

- [ ] **Step 1: Write the failing test `Backend/test/elo.test.js`**

```js
const { test } = require('node:test');
const assert = require('node:assert');
const { BASE_RATING, updateRatings, getBounds } = require('../elo');

test('BASE_RATING is 1000', () => {
  assert.strictEqual(BASE_RATING, 1000);
});

test('a correct answer raises the rating, wrong lowers it', () => {
  const up = updateRatings(1000, 1000, 1);
  const down = updateRatings(1000, 1000, 0);
  assert.ok(up > 1000);
  assert.ok(down < 1000);
  assert.strictEqual(up, Math.round(up)); // integer
});

test('rating never drops below the floor of 100', () => {
  assert.ok(updateRatings(100, 3000, 0) >= 100);
});

test('getBounds widens by difficulty around the rating', () => {
  const easy = getBounds('easy', 1000);
  const hard = getBounds('hard', 1000);
  assert.ok(easy.upper <= 1000);
  assert.ok(hard.lower >= 1000);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd Backend && npm test`
Expected: FAIL — `Cannot find module '../elo'`.

- [ ] **Step 3: Implement `Backend/elo.js`** (ported from `src/pages/elo.js`, plus `getBounds` from the quiz)

```js
// Server-side Elo. The question's difficulty is its rating; correct = win.
const BASE_RATING = 1000;
const SCALE = 400;
const MIN_RATING = 100;

const expectedScore = (playerRating, questionRating) =>
  1 / (1 + Math.pow(10, (questionRating - playerRating) / SCALE));

const kFactor = (playerRating) => {
  if (playerRating < 1200) return 40;
  if (playerRating < 2000) return 24;
  return 16;
};

// result: 1 correct, 0 wrong. Returns an integer, floored at MIN_RATING.
const updateRatings = (currentElo, questionRating, result) => {
  const expected = expectedScore(currentElo, questionRating);
  const updated = currentElo + kFactor(currentElo) * ((result ? 1 : 0) - expected);
  return Math.max(MIN_RATING, Math.round(updated));
};

// The difficulty band of question scores to draw from, around the player's rating.
const getBounds = (difficulty, elo) => {
  const m = 0.2;
  switch (difficulty) {
    case 'easy':
      return { lower: elo - Math.round(elo * 2 * m), upper: elo };
    case 'medium':
      return { lower: Math.round(elo - elo * m), upper: Math.round(elo + elo * m) };
    case 'hard':
      return { lower: elo, upper: Math.round(elo + elo * m * 2) };
    default:
      return { lower: 0, upper: 100000 };
  }
};

module.exports = { BASE_RATING, expectedScore, kFactor, updateRatings, getBounds };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd Backend && npm test`
Expected: the 4 `elo` tests pass.

- [ ] **Step 5: Commit**

```bash
git add Backend/elo.js Backend/test/elo.test.js
git commit -m "feat: server-side ELO module (tested)"
```

---

## Task 3: `GET /questions/next` (server-side selection)

**Files:**
- Modify: `Backend/routes/practice.js`
- Modify: `Backend/test/practice.test.js`

- [ ] **Step 1: Add the failing test to `Backend/test/practice.test.js`**

Replace the entire file with:
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
  assert.strictEqual(res.body.correctAnswer, undefined); // never sent
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

test.after(() => pool.end());
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd Backend && npm test`
Expected: FAIL — `/questions/next` doesn't exist (404/route-missing where 200/400/401 expected).

- [ ] **Step 3: Rewrite `Backend/routes/practice.js`** to add `/questions/next` and `/me/ratings`, removing `/answers` (re-added as `/attempts` in Task 4)

```js
const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/requireAuth');
const VALID_SUBJECTS = require('../subjects');
const { BASE_RATING, getBounds } = require('../elo');

const router = express.Router();

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

router.get('/questions/next', requireAuth, async (req, res) => {
  const { subject, difficulty } = req.query;
  if (!VALID_SUBJECTS.includes(subject)) {
    return res.status(400).json({ error: 'Invalid subject' });
  }
  try {
    const ratingQ = await pool.query(
      'SELECT rating FROM user_ratings WHERE user_id = $1 AND subject = $2',
      [req.user.id, subject]
    );
    const elo = ratingQ.rows.length ? ratingQ.rows[0].rating : BASE_RATING;
    const { lower, upper } = getBounds(difficulty, elo);
    const table = subject.toLowerCase();

    // Prefer an in-band question; fall back to any question in the subject.
    let pick = await pool.query(
      `SELECT id, question, answer1, answer2, answer3, answer4, score, subject
         FROM ${table} WHERE score >= $1 AND score <= $2 ORDER BY random() LIMIT 1`,
      [lower, upper]
    );
    if (!pick.rows.length) {
      pick = await pool.query(
        `SELECT id, question, answer1, answer2, answer3, answer4, score, subject
           FROM ${table} ORDER BY random() LIMIT 1`
      );
    }
    if (!pick.rows.length) return res.status(404).json({ error: 'No questions found' });

    const q = pick.rows[0];
    res.json({
      id: q.id,
      question: q.question,
      answers: [q.answer1, q.answer2, q.answer3, q.answer4],
      score: q.score,
      subject: q.subject,
    });
  } catch (err) {
    console.error('Error fetching next question:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd Backend && npm test`
Expected: the new `/questions/next` + `/me/ratings` tests pass (other suites still green, except `insights.test.js` which Task 6 updates — if it fails on `/answers`, that's expected and fixed in Task 6; proceed).

> Note: `insights.test.js` currently calls `POST /answers` to seed data; it will fail until Task 6 switches it to `/attempts`. If the only failures are in `insights.test.js`, continue — Task 4 adds `/attempts`, Task 6 updates the insights test.

- [ ] **Step 5: Commit**

```bash
git add Backend/routes/practice.js Backend/test/practice.test.js
git commit -m "feat: GET /questions/next server-side selection (no answers sent)"
```

---

## Task 4: `POST /attempts` (server-side grading)

**Files:**
- Modify: `Backend/routes/practice.js`
- Modify: `Backend/test/practice.test.js`

- [ ] **Step 1: Add the failing tests to `Backend/test/practice.test.js`**

Insert these tests just before the final `test.after(...)` line:
```js
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
  assert.ok(correct.body.rating > 1000);            // correct answer raised it
  assert.ok(correct.body.ratingDelta > 0);

  // rating persisted
  const r = await request(app).get('/me/ratings/Calculus').set('Authorization', `Bearer ${t}`);
  assert.strictEqual(r.body.rating, correct.body.rating);

  // an answers row was recorded
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
  assert.strictEqual(wrong.body.correctAnswer, '4'); // revealed after answering
  assert.ok(wrong.body.rating < 1000);
});

test('POST /attempts 404s for an unknown question id', async () => {
  await resetDb();
  const t = await token();
  const res = await request(app).post('/attempts').set('Authorization', `Bearer ${t}`)
    .send({ subject: 'Calculus', questionId: '00000000-0000-0000-0000-000000000000', selectedAnswer: '4' });
  assert.strictEqual(res.status, 404);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd Backend && npm test`
Expected: FAIL — `/attempts` route doesn't exist.

- [ ] **Step 3: Add `/attempts` to `Backend/routes/practice.js`**

Add the `updateRatings` import (change the `elo` require line):
```js
const { BASE_RATING, getBounds, updateRatings } = require('../elo');
```
Then insert this route before `module.exports = router;`:
```js
router.post('/attempts', requireAuth, async (req, res) => {
  const { subject, questionId, selectedAnswer } = req.body;
  if (!VALID_SUBJECTS.includes(subject) || !questionId || selectedAnswer === undefined) {
    return res.status(400).json({ error: 'subject, questionId, selectedAnswer are required' });
  }
  const table = subject.toLowerCase();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const qres = await client.query(
      `SELECT correctanswer, feedback, score FROM ${table} WHERE id = $1`,
      [questionId]
    );
    if (!qres.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Question not found' });
    }
    const q = qres.rows[0];
    const correct = selectedAnswer === q.correctanswer;

    const ratingQ = await client.query(
      'SELECT rating FROM user_ratings WHERE user_id = $1 AND subject = $2',
      [req.user.id, subject]
    );
    const current = ratingQ.rows.length ? ratingQ.rows[0].rating : BASE_RATING;
    const newRating = updateRatings(current, q.score, correct ? 1 : 0);

    await client.query(
      `INSERT INTO user_ratings (user_id, subject, rating, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, subject)
         DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW()`,
      [req.user.id, subject, newRating]
    );
    await client.query(
      `INSERT INTO answers (user_id, subject, is_correct, question_score, rating_after)
         VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, subject, correct, q.score, newRating]
    );
    await client.query('COMMIT');

    res.json({
      correct,
      correctAnswer: q.correctanswer,
      feedback: q.feedback,
      rating: newRating,
      ratingDelta: newRating - current,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error recording attempt:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
});
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd Backend && npm test`
Expected: the new `/attempts` tests pass (insights.test.js may still fail until Task 6).

- [ ] **Step 5: Commit**

```bash
git add Backend/routes/practice.js Backend/test/practice.test.js
git commit -m "feat: POST /attempts server-side grading + ELO (tested)"
```

---

## Task 5: Remove the old bulk `/questions` route

**Files:**
- Modify: `Backend/server.js`

- [ ] **Step 1: Remove the route from `Backend/server.js`**

Delete the entire `app.get('/questions', requireAuth, async (req, res) => { ... });` block (the bulk endpoint that returned every question incl. `correctAnswer`). Leave the `/auth`, `practiceRoutes`, and `insightsRoutes` mounts, the `VALID_SUBJECTS` require (still used elsewhere? if now unused in server.js, remove that require too), and the listen/export block intact.

- [ ] **Step 2: Check for unused references**

Run: `cd Backend && node -e "require('./server'); console.log('loads ok')" 2>&1 | tail -1`
Expected: `loads ok` (it may also log a DB connection line — fine).

- [ ] **Step 3: Run the suite**

Run: `cd Backend && npm test`
Expected: still green except possibly `insights.test.js` (fixed next task).

- [ ] **Step 4: Commit**

```bash
git add Backend/server.js
git commit -m "refactor: remove bulk /questions route (replaced by /questions/next)"
```

---

## Task 6: Update insights test to use `/attempts`

**Files:**
- Modify: `Backend/test/insights.test.js`

The insights tests previously seeded data via `POST /answers`. That endpoint is gone; seed via `/attempts` against a seeded `calculus` question instead. (The leaderboard/stats logic is unchanged.)

- [ ] **Step 1: Rewrite the data-seeding in `Backend/test/insights.test.js`**

Replace the `answer(...)` helper and any `POST /answers` calls. At the top, after the existing imports, add a question-seeding helper and an attempt helper:
```js
async function seedCalcQuestion(correctanswer, score) {
  const { rows } = await pool.query(
    `INSERT INTO calculus (question, answer1, answer2, answer3, answer4, correctanswer, feedback, score, subject)
     VALUES ('q','A','B','C','D',$1,'fb',$2,'Calculus') RETURNING id`,
    [correctanswer, score]
  );
  return rows[0].id;
}
function attempt(t, questionId, selectedAnswer) {
  return request(app).post('/attempts').set('Authorization', `Bearer ${t}`)
    .send({ subject: 'Calculus', questionId, selectedAnswer });
}
```
Then, in each test that seeded answers, seed a question and submit attempts. For the stats test (`learner` answers Calculus twice — one correct, one wrong — and Anatomy once), seed a Calculus question with `correctanswer='A'` and submit `'A'` (correct) then `'B'` (wrong); since Anatomy needs a separate table not in the test harness, change that test to use **only Calculus** with three attempts (2 correct, 1 wrong) and assert the Calculus subject aggregates (`answered: 3, correct: 2, accuracy: 0.67`) plus `overall` equal to those. For the leaderboard test, give alice/bob/carol different ratings by submitting correct attempts on questions of differing `score` — simpler: seed one question and have each user attempt it, then directly set distinct ratings via a helper:
```js
async function setRating(t, rating) {
  // submit an attempt then overwrite the rating deterministically for ranking tests
  const qid = await seedCalcQuestion('A', 1000);
  await attempt(t, qid, 'A');
  // pull the user id from their token's stats and set an exact rating
}
```
**Simpler, deterministic approach for the leaderboard test:** after signing up alice/bob/carol, insert `user_ratings` rows directly with known ratings using each user's id. Get each id from the DB by username:
```js
async function setSubjectRating(username, rating) {
  await pool.query(
    `INSERT INTO user_ratings (user_id, subject, rating)
     SELECT id, 'Calculus', $2 FROM users WHERE username = $1`,
    [username, rating]
  );
}
```
Use `setSubjectRating('alice', 1300)`, `('bob', 1100)`, `('carol', 1200)` instead of the old `answer(...)` calls, then assert the same ranking/`me` expectations as before. For the empty-user and 401 tests, no change.

- [ ] **Step 2: Run the suite to verify it passes**

Run: `cd Backend && npm test`
Expected: ALL backend tests pass (elo, tokens, requireAuth, authRoutes, practice, insights).

- [ ] **Step 3: Commit**

```bash
git add Backend/test/insights.test.js
git commit -m "test: seed insights tests via /attempts + direct ratings (UUID-safe)"
```

---

## Task 7: Frontend quiz rework + delete `elo.js`

**Files:**
- Modify: `src/pages/Quiz.js`
- Delete: `src/pages/elo.js`

- [ ] **Step 1: Rewrite `src/pages/Quiz.js`**

```jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Quiz.css';
import { useQuizSettings } from '../QuizContext';
import { apiFetch } from '../api/client';

const BASE_RATING = 1000;
const EMPTY = { id: '', question: '', answers: [], score: 0, subject: '' };

const Quiz = () => {
  const { quizSettings, setQuizSettings } = useQuizSettings();
  const navigate = useNavigate();

  const [question, setQuestion] = useState(EMPTY);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [result, setResult] = useState(null); // { correct, correctAnswer, feedback }
  const [rating, setRating] = useState(BASE_RATING);
  const [ratingDelta, setRatingDelta] = useState(0);
  const [loading, setLoading] = useState(true);

  const subject = quizSettings.subject || 'Calculus';

  const loadQuestion = async (difficulty = quizSettings.difficulty) => {
    setLoading(true);
    if (difficulty !== quizSettings.difficulty) {
      setQuizSettings((prev) => ({ ...prev, difficulty }));
    }
    try {
      const res = await apiFetch(`/questions/next?subject=${subject}&difficulty=${difficulty || 'medium'}`);
      if (res.status === 404) { navigate('/home/no-questions'); return; }
      if (!res.ok) throw new Error('failed');
      const q = await res.json();
      setQuestion(q);
      setSelectedAnswer('');
      setResult(null);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching question:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const r = await apiFetch(`/me/ratings/${subject}`);
        if (r.ok) setRating((await r.json()).rating);
      } catch (err) { /* display only */ }
      await loadQuestion(quizSettings.difficulty);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (answer) => {
    if (result) return;
    setSelectedAnswer(answer);
  };

  const handleSubmit = async () => {
    if (!selectedAnswer || result) return;
    try {
      const res = await apiFetch('/attempts', {
        method: 'POST',
        body: { subject, questionId: question.id, selectedAnswer },
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setResult({ correct: data.correct, correctAnswer: data.correctAnswer, feedback: data.feedback });
      setRating(data.rating);
      setRatingDelta(data.ratingDelta);
    } catch (err) {
      console.error('Error submitting answer:', err);
    }
  };

  const answerClass = (answer) => {
    if (!result) return selectedAnswer === answer ? 'answer selected' : 'answer';
    if (answer === result.correctAnswer) return 'answer correct';
    if (answer === selectedAnswer) return 'answer wrong';
    return 'answer';
  };

  const bandProgress = Math.max(0, Math.min(100, rating % 100));

  if (loading) {
    return <div className="quiz"><div className="quiz-loading">Loading question…</div></div>;
  }

  return (
    <div className="quiz">
      <div className="quiz-topbar">
        <span className="subject-chip">{question.subject || subject}</span>
        <div className="elo-meter">
          <div className="elo-meter-head">
            <span className="elo-label">Your ELO</span>
            <span className="elo-value">{rating}</span>
          </div>
          <div className="elo-bar"><div className="elo-bar-fill" style={{ width: `${bandProgress}%` }} /></div>
        </div>
        <span className="level-chip">Level {question.score}</span>
      </div>

      <h1 className="quiz-question">{question.question}</h1>

      <div className="answers">
        {question.answers.map((answer, index) => (
          <button key={index} className={answerClass(answer)} onClick={() => handleSelect(answer)} disabled={!!result}>
            {answer}
          </button>
        ))}
      </div>

      {result && (
        <div className={`feedback ${result.correct ? 'feedback-correct' : 'feedback-wrong'}`}>
          <div className="feedback-head">
            <strong>{result.correct ? 'Correct' : 'Incorrect'}</strong>
            <span className="elo-delta">{ratingDelta >= 0 ? `+${ratingDelta}` : ratingDelta} ELO</span>
          </div>
          {!result.correct && (
            <p className="correct-answer">Correct answer: <strong>{result.correctAnswer}</strong></p>
          )}
          {result.feedback && <p className="explanation">{result.feedback}</p>}
        </div>
      )}

      {!result ? (
        <div className="quiz-actions">
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!selectedAnswer}>Submit answer</button>
        </div>
      ) : (
        <div className="quiz-next">
          <button className="btn btn-primary" onClick={() => loadQuestion()}>Next question →</button>
          <div className="next-difficulty">
            <span>Adjust difficulty:</span>
            <button onClick={() => loadQuestion('easy')}>Easier</button>
            <button onClick={() => loadQuestion('hard')}>Harder</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quiz;
```

- [ ] **Step 2: Delete the now-unused frontend ELO module**

```bash
git rm src/pages/elo.js
```

- [ ] **Step 3: Confirm nothing else imports it**

Run: `grep -rn "from './elo'\|from '../pages/elo'\|pages/elo" src/ || echo "no remaining imports"`
Expected: `no remaining imports`

- [ ] **Step 4: Verify the build compiles**

Run: `CI=true npx react-scripts build 2>&1 | grep -E "Compiled|Failed|Module not found"`
Expected: `Compiled successfully.`

- [ ] **Step 5: Commit**

```bash
git add src/pages/Quiz.js
git commit -m "feat: quiz uses server-side /questions/next + /attempts; remove client elo.js"
```

---

## Task 8: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full backend suite**

Run: `cd Backend && npm test`
Expected: all pass (elo, tokens, requireAuth, authRoutes, practice, insights).

- [ ] **Step 2: Frontend tests + build**

Run: `CI=true npx react-scripts test --watchAll=false` then `CI=true npx react-scripts build 2>&1 | grep -E "Compiled|Failed"`
Expected: existing frontend tests pass; `Compiled successfully.`

- [ ] **Step 3: Live anti-cheat smoke test**

```bash
cd Backend
PORT=4058 node server.js > /tmp/sec1-smoke.log 2>&1 &
SRV=$!
sleep 2
B=http://localhost:4058
U="sec_$RANDOM"
ACC=$(curl -s -X POST $B/auth/signup -H 'Content-Type: application/json' -d "{\"name\":\"S\",\"username\":\"$U\",\"password\":\"pw\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")
echo "next question (should have NO correctAnswer):"; Q=$(curl -s "$B/questions/next?subject=Calculus&difficulty=medium" -H "Authorization: Bearer $ACC"); echo "$Q" | python3 -m json.tool
QID=$(echo "$Q" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo "attempt (server grades):"; curl -s -X POST $B/attempts -H "Authorization: Bearer $ACC" -H 'Content-Type: application/json' -d "{\"subject\":\"Calculus\",\"questionId\":\"$QID\",\"selectedAnswer\":\"zzz\"}" | python3 -m json.tool
kill $SRV 2>/dev/null
psql -d adaptive_learning -c "DELETE FROM users WHERE username LIKE 'sec_%';" >/dev/null 2>&1
echo "=== cleaned up ==="
```
Expected: `/questions/next` returns `id` + `question` + `answers` and **no `correctAnswer`/`feedback`**; `/attempts` returns `{ correct, correctAnswer, feedback, rating, ratingDelta }` with the server's verdict (a junk `selectedAnswer` → `correct: false`).

- [ ] **Step 4: Push**

```bash
git push personal master
```

---

## Notes for the implementer

- **Single pool still** — this plan does not introduce the two-role/RLS split (that's Plan 2). All endpoints use the existing `pool`.
- **Test DB** uses the `calculus` table added to `test/setup.js`; the dev DB has all 16 from `seed.sql`.
- **Identity** comes from `req.user.id` (now a UUID string); the client never sends a user id, rating, correctness, or correct answer.
