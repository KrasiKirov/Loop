# Interview-Prep Pivot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the adaptive academic-quiz app into a competitive, retention-first DSA interview-prep platform for new-grad SWEs: fast, auto-gradeable drill cards (pattern-ID / crux / complexity / bug), spaced repetition to fix the "solved Monday, forgot Friday" decay, async duels, and per-pattern ELO leagues.

**Architecture:** Refactor in place. Keep the hardened backend (token auth, RLS, two-role least-privilege, rate-limiting, the ELO engine, server-authoritative grading, the React shell). Replace the 16 academic subject tables with a `patterns` + `cards` content model. Add `srs_state`, `duels`, and `duel_results`. Every drill card is multiple-choice and string-graded, so the existing grading/rating engine is reused wholesale and **no code-execution sandbox is needed**.

**Tech Stack:** Node/Express, PostgreSQL (UUID PKs, RLS), `node:test` + supertest (backend), React (CRA) + Jest/RTL (frontend), `pg`, `zod`, existing `elo.js`. No new runtime infra for v1 (async duels need no WebSockets).

---

## Guiding Decisions (locked)

- **Repo strategy:** refactor in place; archive academic content on a branch (`academic-archive`) before deleting.
- **Duels:** async only in v1 — a duel is a fixed card set; each player plays when convenient; resolves when both submit (or on expiry). A **ghost/bot opponent** at a target rating guarantees a solo user always has someone to race (critical at launch with ~15 users).
- **Content:** build the engine for the **full Blind-75 / NeetCode taxonomy** (~18 patterns), but author **pattern-by-pattern** via the proven content pipeline. Ship + tester-gate after the first pattern.
- **Rating semantics (unchanged):** skill rating changes on the **first attempt only** of a card (replay-safe, anti-farming). SRS reviews update retention state but never the rating. Duel ELO is a separate "overall" rating updated on duel resolution (win/loss/draw vs the opponent's rating).

**The validation gate is part of the plan, not optional.** After Phase 2 (drill engine + one full pattern of content), put it in front of 10–15 new grads. **Kill gate:** if a small group won't return weekly without nagging, the retention hook didn't land — stop and reassess before authoring the rest of the taxonomy.

---

## Reuse Map (what survives the refactor)

| Keep as-is | Refactor | Delete / Archive |
|---|---|---|
| `Backend/db.js` (pools, `withUserContext`) | `Backend/routes/practice.js` → `cards.js` | 16 academic subject tables |
| `Backend/elo.js` (`updateRatings`, `getBounds`, `BASE_RATING`) | `Backend/subjects.js` → `patterns.js` | `Backend/seed.sql` academic content |
| auth, tokens, refresh rotation, RLS roles | `user_ratings` (subject → pattern slug) | `src/Mathematics|Biology|Chemistry|Physics/*` |
| rate-limit, validate, helmet, CORS | `answers` → `attempts` (+ `card_id`) | academic `seed-extra/*.sql` |
| React shell, router, `AuthContext`, `QuizContext` | `Quiz.js` → `Drill.js` | `src/pages/Home.js` subject grid |
| `MathText` (renders `O(n^2)` → O(n²)), error/loading states, answer shuffle | `Leaderboard.js` → leagues, `Stats.js` → mastery | |

---

## Data Model (new schema)

New file `Backend/schema.sql` (replaces the academic schema). DDL for the new domain:

```sql
-- A DSA pattern (the Blind-75/NeetCode taxonomy).
CREATE TABLE patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(128) NOT NULL,
  blurb TEXT,
  sort_order INT NOT NULL DEFAULT 0
);

-- A single drillable, auto-gradeable card. Mirrors the proven question schema
-- (answer1-4 + correctanswer + explanation + rating) plus pattern/format/code.
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
  format VARCHAR(16) NOT NULL CHECK (format IN ('pattern_id','crux','complexity','bug')),
  prompt TEXT NOT NULL,
  code TEXT,                         -- optional snippet (bug/crux/complexity cards)
  answer1 TEXT NOT NULL, answer2 TEXT NOT NULL, answer3 TEXT NOT NULL, answer4 TEXT NOT NULL,
  correctanswer TEXT NOT NULL,       -- byte-identical to one of answer1-4
  explanation TEXT NOT NULL,
  rating INT NOT NULL DEFAULT 1000,  -- difficulty on the ELO scale (700-2000)
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX cards_pattern_rating ON cards (pattern_id, rating);

-- Per-pattern (and 'overall') user skill rating. Same shape as the old
-- user_ratings; `subject` now holds a pattern slug or the literal 'overall'.
CREATE TABLE user_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(64) NOT NULL,      -- pattern slug | 'overall'
  rating INTEGER NOT NULL,
  username VARCHAR(255) NOT NULL,    -- denormalized for leaderboard reads
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, subject)
);

-- First-attempt-only rated attempts (replay-safe). Reuses the UNIQUE-constraint
-- idempotency trick from the academic build.
CREATE TABLE attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  pattern_slug VARCHAR(64) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  rating_after INTEGER NOT NULL,
  ms INTEGER,                        -- answer time (analytics + duels)
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, card_id)
);

-- Spaced repetition (Leitner boxes). The retention engine.
CREATE TABLE srs_state (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  box SMALLINT NOT NULL DEFAULT 0,   -- 0..5
  due_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  last_result BOOLEAN,
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, card_id)
);
CREATE INDEX srs_due ON srs_state (user_id, due_at);

-- Async duels: a fixed card set, resolved when both players submit.
CREATE TABLE duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opponent_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL = open link / ghost
  pattern_slug VARCHAR(64),                                 -- NULL = mixed
  card_ids UUID[] NOT NULL,
  is_ghost BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',            -- pending|complete|expired
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);
CREATE TABLE duel_results (
  duel_id UUID NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,      -- NULL = ghost player
  is_ghost BOOLEAN NOT NULL DEFAULT FALSE,
  num_correct SMALLINT NOT NULL,
  total_ms INTEGER NOT NULL,
  finished_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX duel_results_one_per_user ON duel_results (duel_id, user_id) WHERE user_id IS NOT NULL;

-- Optional retention profile (interview date + streak)
ALTER TABLE users ADD COLUMN goal_date DATE;
```

**RLS (reuse the two-role model):**
- `app_user` gets `SELECT` on `patterns`, `cards` (public read).
- `attempts`, `srs_state`: own-row policies keyed on `current_setting('app.current_user_id')::uuid`.
- `duels`: readable if `challenger_id` or `opponent_id` = current user; insert with `challenger_id` = current user. `duel_results`: own rows + rows of duels you're in.
- `app_auth` keeps `users`, `refresh_tokens`.

---

## API Surface

| Method & path | Purpose | Returns |
|---|---|---|
| `GET /patterns` | list patterns + the user's per-pattern rating, mastery %, due count | `[{slug,name,rating,mastery,due}]` |
| `GET /cards/next?pattern=&difficulty=&exclude=` | one unseen, in-band card (answers shuffled, no answer key) | `{id,format,prompt,code,answers,rating}` |
| `POST /attempts` `{cardId,selectedAnswer,ms}` | grade; first-attempt rates + writes SRS | `{correct,correctAnswer,explanation,rating,ratingDelta,alreadyAnswered}` |
| `GET /review/next` | next due SRS card (review mode) | same shape as `/cards/next` or `{empty:true}` |
| `GET /review/queue` | due count + breakdown | `{due, byPattern:{slug:n}}` |
| `POST /duels` `{patternSlug?,size,opponentUsername?}` | create duel (ghost if no opponent) | `{id, shareUrl}` |
| `GET /duels/:id/play` | card set to play (no answers) | `{cards:[...], opponent}` |
| `POST /duels/:id/submit` `{answers:[{cardId,selectedAnswer,ms}]}` | record result; resolve if both done; ELO | `{yourScore, status, result?}` |
| `GET /duels/:id` | duel status/result | `{status, results, winner}` |
| `GET /duels/mine` | my pending + completed duels | `[...]` |
| `GET /leaderboard/:scope` | `scope` = pattern slug \| `overall` | `{top:[...], me}` |
| `GET /league/current` | weekly league (points earned this ISO week) | `{week, top:[...], me}` |
| `GET /me/stats` | per-pattern mastery, streak, due count | `{overall, streak, patterns:[...]}` |
| `PUT /me/goal` `{goalDate}` | set interview-date countdown | `{goalDate, daysLeft}` |

---

## Core Algorithms

**ELO reuse.** Drills: `updateRatings(currentPatternRating, card.rating, correct?1:0)`. Duels: `updateRatings(yourOverall, opponentOverall, win?1:loss?0:0.5)`. `getBounds(difficulty, patternRating)` already maps easy/medium/hard to a rating band for card selection — reuse unchanged.

**SRS (Leitner).** Box → interval (from review time):

```js
// Backend/srs.js
const INTERVALS_MIN = [10, 1440, 4320, 10080, 23040, 50400]; // 10m,1d,3d,7d,16d,35d
function nextSrs(prev, correct) {
  const box = correct ? Math.min((prev?.box ?? 0) + 1, 5) : 0;
  const dueAt = new Date(Date.now() + INTERVALS_MIN[box] * 60_000);
  return {
    box,
    dueAt,
    reps: (prev?.reps ?? 0) + 1,
    lapses: (prev?.lapses ?? 0) + (correct ? 0 : 1),
    lastResult: correct,
  };
}
module.exports = { nextSrs, INTERVALS_MIN };
```

**Card selection (`/cards/next`).** Tiered, reusing the academic 3-tier fallback + no-repeat:
1. in-band (`getBounds`) **and** unseen (`id <> ALL(exclude) and id NOT IN (my attempts)`) — `ORDER BY random() LIMIT 1`
2. any unseen
3. any (bank exhausted → allow repeat)
Then shuffle the 4 answers (reuse existing `shuffle`).

**Duel resolution.** On `/duels/:id/submit`: insert `duel_results` (idempotent per user). If a ghost duel, the ghost result is generated at create time from a target rating (`num_correct ~ f(rating)`, `total_ms ~ sampled`). When both results exist → `status='complete'`, compute winner by `(num_correct desc, total_ms asc)`, apply `updateRatings` to both players' `overall` rating, mark resolved. All inside `withUserContext` in one transaction.

**Mastery %.** Per pattern: `clamp((patternRating - 700) / (2000 - 700))` blended with coverage (`distinct correct cards / total cards in pattern`). Display as a ring.

---

## Content Taxonomy (full Blind-75 / NeetCode)

Seed `patterns` (sort_order): Arrays & Hashing, Two Pointers, Sliding Window, Stack, Binary Search, Linked List, Trees, Tries, Heap/Priority Queue, Backtracking, Graphs, Advanced Graphs, 1-D DP, 2-D DP, Greedy, Intervals, Math & Geometry, Bit Manipulation.

**Per pattern, author ~20–30 cards** across the four formats, tiered easy/medium/hard:
- `pattern_id` (~8): "which pattern solves this problem statement?"
- `crux` (~6): "the one key line/insight" (MCQ)
- `complexity` (~5): time/space MCQ
- `bug` (~6): spot-the-bug / predict-output on a snippet

**Content pipeline (reuse the proven academic muscle):**
1. Subagent (one per pattern) authors a `Backend/seed-cards/<pattern-slug>.sql` `INSERT` following the exact format rules (4 distinct options; `correctanswer` byte-identical to an option; apostrophes doubled; `format` valid; ratings spread 700–2000).
2. Automated validation: load in a `BEGIN/ROLLBACK` txn; assert `INSERT 0 N`, plus checks — `correctanswer ∈ {answer1..4}`, 4 distinct options, valid `format`, no duplicate prompts.
3. Expert-review subagent per pattern flags factual/correctness defects (caught a 0.5% error rate on the academic bank). Fix, re-validate.
4. Load into dev DB, then merge into the canonical seed.

The sliding-window deck already drafted in conversation is the seed for pattern #3.

---

## File Structure

**Create:**
- `Backend/schema.sql` (rewrite), `Backend/patterns.js`, `Backend/routes/cards.js`, `Backend/routes/duels.js`, `Backend/srs.js`
- `Backend/seed.sql` (rewrite: patterns + cards), `Backend/seed-cards/<slug>.sql` (per pattern)
- `Backend/test/cards.test.js`, `Backend/test/duels.test.js`, `Backend/test/srs.test.js`
- `src/pages/Drill.js` + `.css`, `src/pages/PatternHub.js`, `src/pages/PatternPage.js`, `src/pages/Review.js`
- `src/pages/DuelCreate.js`, `src/pages/DuelPlay.js`, `src/pages/DuelResult.js`, `src/pages/Leagues.js`
- `src/components/CodeBlock.jsx`, `src/components/MasteryRing.jsx`, `src/patternLabels.js`
- `src/components/*.test.js` for new components

**Modify:**
- `Backend/server.js` (mount `cards`, `duels` routers; drop academic routes)
- `Backend/test/setup.js` (new schema), `src/App`/router, `src/pages/Stats.js` → mastery, `src/QuizContext.js` → drill settings, `MathText` reuse in `CodeBlock`/complexity cards

**Delete (after archive branch):**
- academic subject tables + `seed-extra/*`, `src/Mathematics|Biology|Chemistry|Physics/*`, academic `Home.js` grid, `subjects.js`

---

## Phase 0 — Archive & schema foundation

**Files:** `Backend/schema.sql`, `Backend/patterns.js`, `Backend/test/setup.js`

- [ ] **Archive academic content.** Run: `git checkout -b academic-archive && git push personal academic-archive && git checkout master`. Confirm the branch exists on the remote so nothing is lost.
- [ ] **Write `Backend/patterns.js`** exporting the 18 pattern slugs/names/blurbs/sort order array and `VALID_PATTERN_SLUGS`.
- [ ] **Rewrite `Backend/schema.sql`** with the DDL above (patterns, cards, user_ratings, attempts, srs_state, duels, duel_results, users.goal_date) + roles + grants + RLS policies (public read on patterns/cards; own-row on attempts/srs_state/duels/duel_results).
- [ ] **Update `Backend/test/setup.js`** to build the new schema (drop+create the new tables, seed the 18 patterns, seed a couple of cards for tests) using the OWNER pool, RLS enabled.
- [ ] **Step: prove it loads.** Run: `psql -d adaptive_learning_test -f Backend/schema.sql` → expect no errors. Then `cd Backend && node --test test/setup.js` (the reset path) → green.
- [ ] **Commit** (title-only): `refactor: replace academic schema with patterns/cards/duels/srs model`.

## Phase 1 — Card engine (drill + rating + SRS write)

**Files:** `Backend/routes/cards.js`, `Backend/srs.js`, `Backend/test/cards.test.js`, `Backend/test/srs.test.js`

- [ ] **Test first (`srs.test.js`):** `nextSrs(null,true)` → box 1, due ~1d; `nextSrs({box:3},false)` → box 0, lapses+1, due ~10m. Run `node --test test/srs.test.js` → fails (no module).
- [ ] **Implement `Backend/srs.js`** (`nextSrs`, `INTERVALS_MIN` as above). Re-run → pass.
- [ ] **Test (`cards.test.js`):** `GET /cards/next?pattern=sliding-window&difficulty=medium` requires auth (401), returns a card without `correctanswer`/`explanation`, answers length 4. `POST /attempts` grades correctly, rates on first attempt, `ratingDelta:0` on replay, writes/updates `srs_state`. `GET /cards/next` excludes `exclude` ids. (Port the academic practice tests, swapping subject→pattern, question→card.)
- [ ] **Implement `Backend/routes/cards.js`:** `GET /patterns`, `GET /cards/next` (3-tier selection + `getBounds` + shuffle), `POST /attempts` (`withUserContext`: grade, first-attempt `INSERT ... ON CONFLICT DO NOTHING RETURNING` for rating, upsert `user_ratings`, upsert `srs_state` via `nextSrs`), `GET /me/ratings/:pattern`.
- [ ] **Mount in `server.js`**, drop academic router. Run full backend suite `node --test --test-concurrency=1` → green.
- [ ] **Commit:** `feat: card drill engine (next/attempt) with per-pattern ELO and SRS write`.

## Phase 2 — Drill UI + one full pattern of content  → **TESTER GATE**

**Files:** `src/pages/Drill.js`, `src/components/CodeBlock.jsx`, `src/pages/PatternHub.js`, `src/pages/PatternPage.js`, `Backend/seed-cards/sliding-window.sql`

- [ ] **`CodeBlock.jsx` + test:** renders `code` in a `<pre><code>` with monospace styling; preserves whitespace; escapes safely. (Syntax highlighting deferred.)
- [ ] **`Drill.js`** by refactoring `Quiz.js`: format-aware header (chip shows pattern + format label), render `code` via `CodeBlock` when present, `MathText` for prompts/answers/complexity (`O(n^2)`→O(n²)), timing (`ms` from card load to submit) sent to `/attempts`, session strip + streak (reuse), error/retry states (reuse). Answer-class match by string (reuse).
- [ ] **`PatternHub.js`** (replaces academic `Home`): grid of patterns from `GET /patterns` with `MasteryRing` + due badge; **`PatternPage.js`**: entry to Drill / Review / Duel + difficulty.
- [ ] **Author + QA `sliding-window.sql`** via the content pipeline (seed deck already drafted; expand to ~25 cards across formats; validate; expert-review). Load.
- [ ] **Wire router**, `patternLabels.js`, build clean (`CI=true npx react-scripts build`), tests pass (`CI=true npx react-scripts test --watchAll=false`).
- [ ] **Commit:** `feat: drill UI + sliding-window content (first pattern)`.
- [ ] **🚦 TESTER GATE:** put it in front of 10–15 new grads. Track weekly return without nagging. **Proceed only if the loop hooks them; otherwise stop and reassess.**

## Phase 3 — Spaced repetition (review mode)

**Files:** `Backend/routes/cards.js` (review endpoints), `src/pages/Review.js`

- [ ] **Test:** `GET /review/next` returns a due card; `GET /review/queue` returns due counts; a freshly-wrong card becomes due in ~10m; SRS state advances on correct.
- [ ] **Implement** `GET /review/next` (oldest `due_at <= now()` for the user) + `GET /review/queue`.
- [ ] **`Review.js`:** "N cards due" → review session reusing `Drill`; on empty, encouraging empty state.
- [ ] **Daily streak + goal-date countdown:** `PUT /me/goal`, streak from `attempts` per day; surface on PatternHub. Test + commit: `feat: spaced-repetition review queue + streak/goal countdown`.

## Phase 4 — Async duels

**Files:** `Backend/routes/duels.js`, `Backend/test/duels.test.js`, `src/pages/DuelCreate.js`, `DuelPlay.js`, `DuelResult.js`

- [ ] **Test (`duels.test.js`):** create duel (random N cards), play returns cards w/o answers, submit records a result idempotently, second submit resolves + updates both `overall` ratings, ghost duel resolves immediately against a seeded result, expiry handled.
- [ ] **Implement `duels.js`:** `POST /duels` (ghost result generated from a target rating when no opponent), `GET /duels/:id/play`, `POST /duels/:id/submit` (transactional resolve + ELO via `updateRatings`), `GET /duels/:id`, `GET /duels/mine`.
- [ ] **Frontend:** `DuelCreate` (pick pattern/size → shareable link), `DuelPlay` (timed run through the set, no answer reveal until submit), `DuelResult` (you vs opponent, ELO delta, rematch + share). Reuse `Drill` card rendering.
- [ ] Build + tests green. **Commit:** `feat: async duels with ghost opponents and overall ELO`.

## Phase 5 — Leagues / leaderboards

**Files:** `Backend/routes/cards.js` (leaderboard), `src/pages/Leagues.js`

- [ ] **Test:** `GET /leaderboard/overall` and `/leaderboard/:pattern` rank by rating; `GET /league/current` ranks by points earned in the current ISO week (sum of positive rating deltas + duel wins).
- [ ] **Implement** the three endpoints (reuse the academic leaderboard query, add the weekly window via `date_trunc('week', created_at)`).
- [ ] **`Leagues.js`** (replaces academic `Leaderboard`): tabs overall / per-pattern / weekly; highlight "me"; "rank you can screenshot." Build + tests. **Commit:** `feat: overall + per-pattern + weekly-league leaderboards`.

## Phase 6 — Content authoring (rest of Blind-75)  *(parallelizable; gated on Phase 2 signal)*

- [ ] For each remaining pattern, run the pipeline (author → validate → expert-review → load → merge into `seed.sql`). One commit per pattern: `content: <pattern> card deck (~N cards)`.
- [ ] After every ~4 patterns, re-run the automated bank-wide checks (correctanswer integrity, duplicate prompts, option distinctness, format validity, rating spread) and an answer-position-bias check (shuffle already neutralizes it server-side).

## Phase 7 — Launch polish

- [ ] Onboarding: pick a target pattern + interview date on first run; seed a starter rating.
- [ ] Empty/error pass on all new screens (reuse the prior discipline).
- [ ] Share surfaces: duel links, rating cards, weekly-league result — the growth loop.
- [ ] Final `code-review ultra` on the branch; deploy-readiness checklist (real DB role passwords + JWT secret in host env, never committed).

---

## Risks & Mitigations

- **Authoring the full taxonomy before validation (the chosen scope's main risk).** Mitigation: engine is taxonomy-complete from Phase 0, but content ships pattern-by-pattern with a hard tester gate after Phase 2. Don't author Phase 6 until the gate is green.
- **Content correctness.** Mitigation: the proven generate → validate → expert-review pipeline (0.5% error catch on the academic bank). Bug/crux cards are the highest-risk; review them hardest.
- **Cold competitive surfaces (few users).** Mitigation: ghost/bot opponents for duels at target ratings; seed a handful of named ghost entries on leaderboards so a rating feels real from day one.
- **Drill answers are graded by exact string match.** Mitigation (unchanged invariant): `correctanswer` must stay byte-identical to an option; validation step enforces it; answer shuffle is display-only.
- **Scope creep into real-time duels / code execution.** Mitigation: explicitly out of v1. All four formats are MCQ; no sandbox.

## Sequencing / What Ships When

1. **Phases 0–2** → the smallest thing that tests the thesis: drill one pattern, with rating + leaderboard. **Tester gate.**
2. **Phases 3–5** → the retention + virality layers (SRS, duels, leagues) that make it differentiated, not just another quiz.
3. **Phase 6** → breadth, only after the loop is proven.
4. **Phase 7** → launch polish + deploy.

---

## Execution Handoff

Two ways to run this:

1. **Subagent-Driven (recommended)** — dispatch a fresh implementer per task with two-stage review (spec, then quality) between tasks. Best for this plan because most tasks are well-specified and isolated, and the content phases parallelize.
2. **Inline execution** — work the checkboxes in this session with checkpoints after each phase.
