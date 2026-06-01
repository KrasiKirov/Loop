# Security & Integrity Hardening — Design Spec

**Date:** 2026-06-01
**Goal:** Close the integrity hole where the client computes its own ELO, and harden the database and API: UUID keys everywhere, server-side grading, two-role Row-Level Security on every table, rate limiting, input validation, CORS lockdown, and security headers.

**Context:** A pre-deployment hardening pass. The app already has correct app-layer authorization (every query scoped to `req.user.id`), bcrypt passwords, and JWT access + rotating refresh tokens. This adds defense-in-depth + fixes the one active exploit (client-trusted ratings).

**Decomposition note:** This is large and cohesive but should be executed as **three sequential implementation plans**, each producing working, tested software:
1. **UUID clean-slate + server-side grading/ELO** (data model + integrity core)
2. **Two-role RLS everywhere + denormalized username** (DB security layer)
3. **API hardening middleware** (rate limit, validation, CORS, helmet)

---

## 1. UUID clean-slate schema

Recreate the schema with UUID primary keys on **all** tables:
- `users`, `refresh_tokens`, `user_ratings`, `answers`, and the 16 question tables → `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` (native in PostgreSQL 13+).
- All foreign keys (`user_id`, etc.) become `UUID`.
- The `questionId` the client references becomes opaque — no enumerating the bank by counting integers.

**Mechanics:** `schema.sql` rewritten with UUID columns + the RLS/role setup (section 3); `migrate-uuid-reset.sql` drops and recreates all tables; `seed.sql` re-seeds questions (its INSERTs don't reference ids, so UUIDs auto-generate). Throwaway test accounts are wiped — fine pre-launch. No rescale needed (seed is already on the standard ELO scale).

---

## 2. Server-side grading + ELO (full anti-cheat)

The client no longer grades answers, selects questions by difficulty, or computes ratings.

### Backend ELO module — `Backend/elo.js`
Port the existing frontend `src/pages/elo.js`: `BASE_RATING` (1000), `expectedScore`, `kFactor`, `updateRatings(currentElo, questionRating, result)`, and `getBounds(difficulty, elo)` (the ELO-band logic currently in `Quiz.js`).

### Endpoints (auth-protected, `app_user` role)
- **`GET /questions/next?subject=<S>&difficulty=<easy|medium|hard>`** — server reads the user's current rating for the subject (default 1000), computes the band via `getBounds`, selects a random in-band question (falling back to any question in the subject if the band is empty), and returns `{ id, question, answers: [a1,a2,a3,a4], score, subject }`. **No `correctAnswer`, no `feedback`.** 404/empty → client shows the no-questions state. Replaces the old bulk `GET /questions?subject=` (which sent every question incl. answers).
- **`POST /attempts`** — body `{ subject, questionId, selectedAnswer }`. The server, inside a `withUserContext` transaction:
  1. Validates `subject` (whitelist); looks up the question by id in that subject's table (404 if absent),
  2. Grades: `correct = (selectedAnswer === correctanswer)`,
  3. Loads the user's per-subject rating (default 1000), computes the new rating with `updateRatings`,
  4. Upserts `user_ratings` (rating + denormalized `username`) and inserts the `answers` row,
  5. Returns `{ correct, correctAnswer, feedback, rating, ratingDelta }`.
- **`GET /me/ratings/:subject`** stays (the quiz shows the starting rating for the ELO meter).
- **`POST /answers` is removed** (it trusted client-sent `rating`/`isCorrect`).

### Frontend
- `Quiz.js`: on mount, `GET /me/ratings/:subject` (display) then `GET /questions/next` for a question. On submit, `POST /attempts { subject, questionId, selectedAnswer }` and render the server's `{ correct, correctAnswer, feedback, rating, ratingDelta }`. Easier/Harder call `/questions/next` with a different difficulty. All client-side grading, ELO math, and band logic are removed.
- `src/pages/elo.js` is deleted (logic now server-side). The ELO meter uses the rating from the server responses.

---

## 3. Two-role RLS on every table + denormalized username

### Roles (created in the migration; tables owned by the existing admin role)
- **`app_auth`** — used **only** by the auth subsystem (`auth/routes.js`, `auth/tokens.js`). Grants on `users` + `refresh_tokens` (the pre-authentication tables). It is the sole role that touches `users`.
- **`app_user`** — used by every authenticated feature endpoint. Grants: `SELECT` on the 16 question tables; `SELECT/INSERT/UPDATE` on `user_ratings`; `SELECT/INSERT` on `answers`. **No grant on `users` or `refresh_tokens`.**

### RLS — `ENABLE` + `FORCE` on every table
| Table | Role | Policy |
|-------|------|--------|
| `users` | app_auth | `USING (true) WITH CHECK (true)` (login by username, signup insert). app_user: no access. |
| `refresh_tokens` | app_auth | `USING (true) WITH CHECK (true)` (lookup by hash pre-auth). app_user: no access. |
| `user_ratings` | app_user | `SELECT USING (true)` (leaderboard reads all); `INSERT/UPDATE WITH CHECK (user_id = current_setting('app.current_user_id')::uuid)` (write own only). |
| `answers` | app_user | All ops `USING / WITH CHECK (user_id = current_setting('app.current_user_id')::uuid)` — fully private. |
| 16 question tables | app_user | `SELECT USING (true)` — public content; no runtime writes. |

### Denormalized username
`user_ratings` gains `username VARCHAR(255) NOT NULL`, written on upsert from `req.user.username`. The leaderboard reads `username + rating` from `user_ratings` only — it **never joins `users`** — which is what lets `app_user` have zero access to `users`. Usernames are immutable (no rename feature), so the copy stays consistent; a future rename feature must update `user_ratings` too.

### Per-request context — `Backend/db.js` + `withUserContext`
- `db.js` exposes **two pools**: `authPool` (connects as `app_auth`) and `userPool` (connects as `app_user`). Connection creds per role come from env (`DB_AUTH_USER/PASSWORD`, `DB_APP_USER/PASSWORD`).
- `withUserContext(userId, fn)` checks out a `userPool` client, `BEGIN`, `SELECT set_config('app.current_user_id', $1, true)`, runs `fn(client)`, `COMMIT`, releases (ROLLBACK on error). Every `app_user` endpoint runs its queries through it. Auth endpoints use `authPool` directly (no user context).

### Migration & tests
- The migration creates the roles, grants, RLS enable/force, and policies. `schema.sql` includes all of it for fresh installs.
- The test harness (`test/setup.js`) creates both roles in the test DB and the app code connects via the two pools, so tests exercise RLS. Dedicated tests assert isolation (a user cannot read another user's `answers`; cannot write another user's rating).

---

## 4. API hardening middleware

- **Rate limiting** (`express-rate-limit`): a strict limiter (~10 requests / 15 min per IP) on `/auth/login`, `/auth/signup`, `/auth/refresh`; a looser global limiter (~100/min) on the API. `app.set('trust proxy', 1)` for correct client IPs behind the hosting proxy.
- **Input validation** (`zod`): a schema per endpoint enforced by a `validate(schema)` middleware that returns 400 on malformed input — `username` (length/charset), `password` (min length), `refreshToken` (non-empty), `attempts` body (`subject` enum, `questionId` UUID, `selectedAnswer` non-empty string), route params (`:subject` enum, `:questionId` UUID), query (`difficulty` enum). No handler trusts raw `req.body`.
- **CORS allowlist**: `cors({ origin: <allowlist from CORS_ORIGINS env> })` — only the web origin + Capacitor origins (`capacitor://localhost`, `http://localhost`) accepted. A random site's JS cannot read the API. Default dev origin `http://localhost:3000`.
- **`helmet`**: security headers, including `frame-ancestors 'none'` / `X-Frame-Options: DENY` (anti-clickjacking — your site can't be iframed on someone else's), plus sensible defaults.
- **Secrets**: `JWT_ACCESS_SECRET` and both DB role passwords come from the host's env (fail-fast in production if the JWT secret is unset, already implemented), documented as strong random values, never committed.

---

## 5. Testing

- **Backend** (`node:test` + `supertest`, test DB with both roles + RLS):
  - Server-side grading: `/questions/next` returns no `correctAnswer`; `/attempts` grades correctly, updates the rating server-side, and **ignores any client-supplied rating** (there is none in the body); a wrong `questionId` → 404.
  - RLS isolation: with the GUC set to user A, a query for user B's `answers` returns nothing; an attempt to write user B's `user_ratings` is rejected by the `WITH CHECK`.
  - Rate limiting: the Nth+1 rapid `/auth/login` returns 429.
  - Validation: malformed bodies/params return 400.
  - Existing auth/token/insights/leaderboard suites updated for UUIDs + the denormalized leaderboard query.
- **Frontend** (Jest): the quiz submit posts `{ subject, questionId, selectedAnswer }` to `/attempts` (mock `apiFetch`) and renders the server verdict; existing `Sparkline`/`Navbar`/`client` tests still pass. Build compiles.

---

## 6. Scope Boundaries

**In scope:** UUID clean-slate; server-side grading + ELO + `/questions/next` + `/attempts`; two-role RLS on every table; denormalized username; rate limiting; zod validation; CORS allowlist; helmet; prod-secret handling.

**Out of scope** (later): cloud hosting/HTTPS, Capacitor packaging, account lockout/anomaly detection beyond rate limiting, email verification/password reset, a public API, column-level encryption.

---

## 7. Success Criteria

- A client cannot read a question's answer before submitting, cannot forge correctness, and cannot forge a rating — ratings and leaderboards are trustworthy.
- Every table has RLS enabled + forced; `app_user` cannot touch `users`/`refresh_tokens`; cross-user reads of `answers` and writes of other users' ratings are blocked at the DB.
- All ids are UUIDs; the question bank is not enumerable by integer.
- Auth endpoints are rate-limited; malformed input is rejected; only allowlisted origins are accepted; clickjacking headers are set.
- All backend + frontend tests pass; production build compiles.
