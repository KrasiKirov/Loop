# Bold — Competitive DSA Interview Prep

A competitive, retention-first web app that drills software-engineering candidates on **data-structures-and-algorithms patterns** with fast, auto-graded cards, a chess-style skill rating, spaced repetition, and head-to-head duels. Built to fix the gap LeetCode ignores: you solve a problem on Monday and can't recall the pattern by Friday.

> **Live demo:** _add your deployed URL here_ · **Tech:** React · Node/Express · PostgreSQL (Row-Level Security)

---

## Why

Most interview prep is a giant pile of problems. The pile gives *exposure* but no **retention system** (you forget the pattern a week later) and no **objective sense of where you stand**. Bold targets exactly those gaps: spaced repetition so you don't forget, and a rated, competitive loop so you always know your level and watch it climb.

## What it does

- **Adaptive drilling.** Pick a DSA pattern, pick a difficulty, and drill cards that adapt to your per-pattern rating. Every answer is graded server-side and moves your rating like a chess Elo.
- **Four fast card formats** — the skills that actually decay, drilled in seconds:
  - **Identify the pattern** — "which pattern solves this?"
  - **Crux step** — the one key line/insight, not the whole solution
  - **Complexity** — time/space analysis under pressure
  - **Spot the bug** — a short snippet with a real defect
- **Spaced repetition.** A Leitner schedule resurfaces cards right before you'd forget them; a "review your due cards" mode keeps retention high.
- **Async duels.** Race a friend — or an auto-generated **ghost opponent** at your level — through a card set. Fastest with the most correct wins, and your overall Elo moves. Works even with no one else online.
- **Leagues.** Per-pattern leaderboards, a duel-rating ladder, and a weekly league.
- **Momentum.** Streaks and an interview-date countdown.

**Content:** 5 fully-stocked patterns (Sliding Window, Two Pointers, Binary Search, Stack, Arrays & Hashing — ~25 cards each across all four formats) plus starter cards for the rest of the Blind-75 / NeetCode taxonomy.

## Engineering highlights

The interesting part isn't the quiz — it's that it's built like a real product:

- **Server-authoritative grading.** Answer keys are never sent to the browser before you answer; the server grades and computes the rating, so the client can't cheat its score.
- **PostgreSQL Row-Level Security.** Every user's attempts, review state, and duels are isolated at the database layer by per-row policies and a two-role least-privilege setup — not just application checks.
- **Replay-safe & race-safe rating.** First-attempt-only rating via a uniqueness constraint (no farming); duel resolution is serialized with a row lock + atomic claim, so concurrent submits can't double-apply Elo or deadlock.
- **Token auth** with refresh-token rotation and reuse detection; rate limiting, security headers, a CORS allowlist, and schema validation on every request.
- **Content integrity at the schema level** — a `CHECK` constraint rejects a card whose "correct" answer isn't one of its options, so bad content fails loudly at insert.
- **Tested:** ~86 backend tests (auth, grading, rating, spaced repetition, duels incl. a concurrency test, RLS, leaderboards) and frontend tests, all green.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React (CRA), React Router |
| Backend | Node.js, Express |
| Database | PostgreSQL — UUID keys, Row-Level Security, two-role least privilege |
| Auth | JWT access + rotating refresh tokens (bcrypt) |
| Tests | `node:test` + supertest (backend), Jest + Testing Library (frontend) |

## Run it locally

**Prerequisites:** Node 18+, PostgreSQL.

```bash
# 1. Database + content
createdb adaptive_learning
cd Backend
npm install
DB_NAME=adaptive_learning npm run setup-db    # schema + roles + 151 cards
cp .env.example .env                           # defaults work for local trust auth
npm start                                       # backend on :3000

# 2. Frontend (in a second terminal, from the repo root)
npm install
echo "REACT_APP_API_URL=http://localhost:3000" > .env
npm start                                       # serves on :3001; sign up and drill
```

Run the tests:

```bash
cd Backend && npm test          # backend
npm test                        # frontend (from repo root)
```

## Deploy

See **[docs/DEPLOY.md](docs/DEPLOY.md)** — a minimal managed-Postgres + Node + static-host setup (Render / Neon / Vercel), including the one-time `setup-db` bootstrap for the RLS roles.

## Status & roadmap

The full planned feature set — adaptive drilling, spaced repetition, duels, and leagues — is implemented and tested. Natural next steps: expand the remaining patterns to full decks, server-measured duel timing (today the tiebreak trusts client timing), and a richer profile/analytics page.

A longer product writeup lives in **[docs/PRODUCT-OVERVIEW.md](docs/PRODUCT-OVERVIEW.md)**.

## Origin

Refactored in place from an earlier academic adaptive-learning quiz app (16 university subjects, ~960 questions) that shared the same adaptive-Elo engine; that version is preserved on the `academic-archive` branch. The pivot reused the hardened backend (auth, RLS, server-side grading, the rating engine) and swapped the content domain for DSA interview patterns plus the competitive/retention mechanics.

## License

[MIT](LICENSE)
