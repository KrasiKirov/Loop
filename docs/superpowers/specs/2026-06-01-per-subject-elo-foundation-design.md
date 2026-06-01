# Per-Subject ELO + Answer History — Design Spec

**Date:** 2026-06-01
**Goal:** Replace the single global ELO with a per-subject rating model and record every answer, creating the data foundation the retention surfaces (leaderboard, stats) will build on.

**Context:** First of two retention sub-projects. The second — the leaderboard + stats/profile page — is a separate spec that reads the data this one writes. Streaks are deferred until push notifications (Capacitor) exist.

---

## 1. Data Model & Migration

Two new tables; the old single-score column is dropped.

```sql
-- One rating per user per subject (created lazily at 1000 on first answer)
CREATE TABLE user_ratings (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject    VARCHAR(100) NOT NULL,
  rating     INTEGER NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, subject)
);

-- One row per answered question — powers stats + (later) streaks
CREATE TABLE answers (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject        VARCHAR(100) NOT NULL,
  is_correct     BOOLEAN NOT NULL,
  question_score INTEGER NOT NULL,
  rating_after   INTEGER NOT NULL,
  created_at     TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_answers_user ON answers(user_id);
CREATE INDEX idx_ratings_user ON user_ratings(user_id);
```

- `users.score` is **dropped** — there is no global ELO anymore.
- Existing users start fresh per subject (each subject defaults to 1000 on first play). Acceptable because the earlier rescale already reset everyone to the 1000 baseline, and no per-subject history exists to preserve.
- `BASE_RATING = 1000` is the default for any not-yet-played subject.
- `schema.sql` updated for fresh installs; `migrate-per-subject-elo.sql` handles the live DB (create the two tables, `ALTER TABLE users DROP COLUMN score`).

---

## 2. Backend Endpoints

`POST /user/elo` is **removed**. Two auth-protected routes replace it; identity always comes from `req.user.id`.

| Method | Route | Behavior |
|--------|-------|----------|
| `GET` | `/me/ratings/:subject` | Returns `{ subject, rating }` for the authenticated user; `rating` defaults to **1000** if never played. `subject` validated against `VALID_SUBJECTS` (400 otherwise). 401 without a token. |
| `POST` | `/answers` | Body `{ subject, isCorrect, questionScore, rating }` (`rating` = new per-subject rating computed client-side). In ONE transaction: upsert `user_ratings(user_id, subject) → rating` (and `updated_at = NOW()`), insert an `answers` row with `rating_after = rating`. Validates `subject` against the whitelist and that `isCorrect`/`questionScore`/`rating` are present. Returns `200 { ok: true }`. 401 without a token. |

**Upsert SQL** (Postgres):
```sql
INSERT INTO user_ratings (user_id, subject, rating, updated_at)
VALUES ($1, $2, $3, NOW())
ON CONFLICT (user_id, subject)
DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW();
```

**Auth payload change:** the `user` object from `/auth/signup` and `/auth/login` drops `elo` → `{ name, username }`. Signup no longer writes a `score`. `publicUser` in `auth/routes.js` updated; the auth route test's `elo === 1000` assertion removed.

**Server structure:**
- New `Backend/subjects.js` exports `VALID_SUBJECTS` (moved out of `server.js`); both `server.js` (`/questions`) and the new router import it.
- New `Backend/routes/practice.js` — an Express router with the two routes above, mounted in `server.js`. Keeps `server.js` lean.

---

## 3. Frontend Rework

### Quiz — `src/pages/Quiz.js`
- **On entry / subject change:** `apiFetch('/me/ratings/' + subject)` to load the subject's rating; seed `elo` state with it (1000 default). Replaces `useState(user.elo || BASE_RATING)`.
- **On submit:** compute new rating with existing `elo.js` `updateRatings` (unchanged math), then
  ```js
  apiFetch('/answers', {
    method: 'POST',
    body: { subject, isCorrect, questionScore: question.score, rating: newRating },
  }).catch((err) => console.error('Failed to record answer:', err));
  ```
- **Remove** the `setUser({ ...user, elo })` line and the `user`/`user.elo` dependency. The ELO meter now reflects the subject's rating.
- The subject is already in `quizSettings.subject` (set by topic pages) — no new wiring.

### Navbar — `src/pages/Navbar.js`
- Remove the `navbar-elo` badge and its logic. Keep brand, username, logout. Remove the `.navbar-elo` rule from `Navbar.css`.

### AuthContext — `src/AuthContext.js`
- `user` is now `{ name, username }` (no `elo`). `login`/`signup` persist the returned user as-is; no functional change beyond not reading a removed field.

### No new pages in this spec.

---

## 4. Testing

**Backend** (`node:test` + `supertest`, test DB; `test/setup.js` gains `user_ratings` + `answers`):
- `GET /me/ratings/:subject` → 1000 for a never-played subject; the stored value after one is set; 401 without a token; 400 for an invalid subject.
- `POST /answers` → upserts the rating (insert on first answer, update on the next) AND inserts an `answers` row with the right `rating_after`; requires auth; writes only the token user's rows.
- `authRoutes.test.js` updated: `user` payload has no `elo`; signup no longer asserts `elo === 1000`.

**Frontend** (Jest):
- Existing `apiFetch` test stands.
- One focused test: the quiz submit path calls `apiFetch('/answers', ...)` with `{ subject, isCorrect, questionScore, rating }` and performs no global-user write (mock `apiFetch`).
- Production build compiles.

---

## 5. Scope Boundaries

**In scope:** the two tables + migration, the two endpoints, the quiz/navbar/context rework, dropping `users.score`/`elo`, tests.

**Out of scope** (next spec — the surfaces): leaderboard endpoint + page, stats/profile page, history-aggregation queries (accuracy %, ELO trend), streaks, push notifications. This spec only *writes* answer history; reading/visualizing it comes later.

---

## 6. Success Criteria

- Each subject maintains its own rating per user; playing Calculus doesn't move the Biology rating.
- A subject's rating persists across sessions (loaded via `/me/ratings/:subject`, saved via `/answers`).
- Every answered question inserts an `answers` row (subject, correctness, difficulty, rating_after, timestamp).
- No global ELO remains: navbar badge gone, `users.score` dropped, auth payload has no `elo`.
- All backend + frontend tests pass; production build compiles.
