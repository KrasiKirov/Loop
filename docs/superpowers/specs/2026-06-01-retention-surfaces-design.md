# Retention Surfaces — Leaderboard + Stats — Design Spec

**Date:** 2026-06-01
**Goal:** Surface the per-subject rating + answer-history data as two retention features: a per-subject leaderboard and a personal stats/profile page (with per-subject ELO trend charts).

**Context:** Second of two retention sub-projects. Builds entirely on the foundation already shipped (`user_ratings`, `answers` tables; per-subject quiz). Reads that data; writes nothing new.

---

## 1. Backend — two read endpoints

Both auth-protected; identity always from `req.user.id`; all queries parameterized. New router `Backend/routes/insights.js`, mounted in `server.js` via `app.use(insightsRoutes)` (keeps `practice.js` focused on the quiz read/write path).

### `GET /me/stats`
Everything the profile page needs in one call:
```json
{
  "overall": { "answered": 142, "correct": 98, "accuracy": 0.69 },
  "subjects": [
    {
      "subject": "Calculus", "rating": 1180,
      "answered": 60, "correct": 44, "accuracy": 0.73,
      "trend": [1000, 1012, 1005, 1031]
    }
  ]
}
```
- `subjects`: one entry per subject the user has a `user_ratings` row for. `rating` from `user_ratings`; `answered`/`correct` are counts from `answers` for that user+subject; `accuracy = correct/answered` (rounded to 2 decimals; `0` when `answered` is 0).
- `trend`: the last 30 `rating_after` values for that user+subject, in chronological (created_at ASC) order.
- `overall`: totals across all the user's `answers` (`answered`, `correct`, `accuracy`).
- Returns `{ overall: { answered:0, correct:0, accuracy:0 }, subjects: [] }` for a user with no answers.

### `GET /leaderboard/:subject`
Per-subject ranking (there is no global rating):
```json
{
  "subject": "Calculus",
  "top": [ { "rank": 1, "username": "ana", "rating": 1420 } ],
  "me": { "rank": 7, "rating": 1180 }
}
```
- `subject` validated against `VALID_SUBJECTS` (400 otherwise).
- `top`: up to 20 rows from `user_ratings` for that subject, joined to `users` for `username`, ordered by `rating DESC`; `rank` is 1-based position in that ordering.
- `me`: the current user's `{ rank, rating }`, where `rank = (count of user_ratings rows for this subject with rating > my rating) + 1`. `null` if the user has no rating row for the subject.
- 401 without a token.

---

## 2. Frontend — sparkline + two pages

### `src/components/Sparkline.jsx`
A pure SVG component. Props: `points` (array of numbers), `width` (default 120), `height` (default 32), plus an optional `className`.
- Normalizes `points` to the viewbox (min→bottom, max→top) and renders a single `<polyline>` stroked in `var(--accent)`, with a faint filled area beneath.
- Edge cases: `points.length === 0` renders nothing (or an empty `<svg>`); `points.length === 1` renders a flat line. Never throws.
- Pure function of props — unit-testable on coordinate output.

### `src/pages/Stats.js` + `src/pages/Stats.css` (route `/home/stats`)
- Header "Your progress" + an overall strip: total answered, overall accuracy %.
- A responsive grid of per-subject cards (one per subject played): subject name, current rating (large), accuracy %, questions answered, and a `Sparkline` of `trend`.
- Subjects never played do not appear.
- Empty state when `subjects` is empty: "Answer some questions to see your progress" + a link to `/home`.
- Fetches `GET /me/stats` once on mount via `apiFetch`; loading + error states.

### `src/pages/Leaderboard.js` + `src/pages/Leaderboard.css` (route `/home/leaderboard`)
- Subject selector: a `<select>` of the 16 subjects, grouped with `<optgroup>` by the 4 areas (Math, Biology, Chemistry, Physics); defaults to `Calculus`.
- Ranked list: rank, username, rating — the current user's row highlighted with the accent.
- Below the top 20: a pinned "Your rank — #N (rating)" row if `me` is set and outside the visible top; "Play to get ranked" if `me` is `null`.
- Refetches `GET /leaderboard/:subject` via `apiFetch` whenever the selected subject changes; loading + error states.

Both pages reuse `theme.css` tokens, existing card/surface styles, and the cyan accent for visual consistency with Home and the quiz.

---

## 3. Navigation & routing

- `src/pages/Navbar.js`: add two `NavLink`s — **Leaderboard** (`/home/leaderboard`) and **Profile** (`/home/stats`) — between the brand and the right-side user/logout group. Active state in accent (existing `NavLink` styling pattern); add minimal nav-link CSS to `Navbar.css` if needed.
- `src/index.js`: add two protected routes inside the existing `PrivateRoute` → `Navbar` layout:
  - `/home/leaderboard` → `<Leaderboard />`
  - `/home/stats` → `<Stats />`

---

## 4. Testing

**Backend** (`node:test` + `supertest`, against the test DB; `test/setup.js` already has `user_ratings` + `answers`):
- `GET /me/stats`: after seeding a couple of `POST /answers`, returns correct per-subject `rating`/`answered`/`correct`/`accuracy`, an `overall` total, and a chronological `trend` array; returns empty overall/subjects for a fresh user; 401 without a token.
- `GET /leaderboard/:subject`: ranks multiple users by rating (rank 1 = highest); `me.rank` correct including when the user is outside the top 20 (seed enough users); `me: null` for a never-played subject; 400 invalid subject; 401 without a token.

**Frontend** (Jest):
- `Sparkline` unit test: given a known `points` array, the rendered `<polyline>` has the expected normalized coordinates; `[]` and single-point inputs render without throwing.
- Production build compiles.

---

## 5. Scope Boundaries

**In scope:** the two endpoints, the `insights.js` router, the `Sparkline` component, the Stats and Leaderboard pages + CSS, navbar links + routes, tests.

**Out of scope** (follow-ups): streaks, push notifications, a global/all-subject leaderboard, time-range filters, head-to-head/social features, pagination beyond top-20 + your-rank, charting libraries (the sparkline is hand-built SVG).

---

## 6. Success Criteria

- A logged-in user can open **Profile** and see, per subject they've played, their rating, accuracy, questions answered, and a trend sparkline — plus an overall summary.
- A user can open **Leaderboard**, pick any subject, and see the top 20 by rating with their own rank highlighted (or pinned if outside the top 20).
- All values are computed server-side from `user_ratings` + `answers`, scoped to the authenticated user where personal.
- Backend + frontend tests pass; production build compiles.
