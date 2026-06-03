# Product Overview

> Working brand in the UI is **"Bold"** (inherited; the name is not final). This document describes the app as it actually exists today on the `interview-pivot` branch, and clearly separates what is **built and playable now** from what is **designed and planned next**.

---

## In one sentence

A competitive, retention-first interview-prep app that drills software-engineering candidates on **data-structures-and-algorithms patterns** with fast, auto-graded cards and a chess-style skill rating — built to fix the thing LeetCode ignores: you solve a problem on Monday and can't recall the pattern by Friday.

---

## The problem it solves

Most coding-interview prep is a giant pile of problems (LeetCode, NeetCode, HackerRank). The pile is fine for *exposure*, but it has two gaps:

1. **No retention system.** You grind a problem, feel good, and forget the underlying pattern a week later. Nothing schedules you to revisit the right idea at the right time.
2. **No objective sense of where you stand.** You don't know your true level, or how you compare to peers, until you're in the interview.

The app targets exactly those two gaps: **spaced repetition on patterns** (so you don't forget) and a **competitive skill rating** (so you always know your level and watch it climb).

---

## Who it's for

New-grad and early-career software engineers preparing for FAANG-tier technical interviews — a tightly defined audience whose interviews are DSA-pattern-heavy, who study daily under deadline pressure, and who respond to competition and measurable progress.

---

## The core insight (what makes it different)

The differentiator is **not "more problems."** It's the *format* and the *loop*:

- **Drill the recall skill, not the 45-minute solve.** The cards target the skill that actually decays — *recognizing which pattern applies* and *remembering the one key insight* — in five-second, objectively gradeable questions. The full "solve it from scratch" experience is what everyone else already owns.
- **Everything is rated.** Every card carries a difficulty rating; every answer moves your skill rating up or down, like a chess Elo. Your number means something because it's earned against difficulty.
- **Spaced repetition keeps it from leaking.** Cards you get wrong come back soon; cards you nail come back later. The system fights the Friday-amnesia directly.

---

## What a session looks like **today** (the built experience)

This is the experience that is implemented, tested, and works end-to-end right now:

1. **Sign up / log in.** Token-based auth (access + refresh).
2. **Pattern Hub.** A grid of the 18 DSA patterns. Each shows your current rating, a mastery ring, and a "due for review" badge.
3. **Pick a pattern, then a difficulty** (Easy / Medium / Hard).
4. **Drill.** You're served one card at a time:
   - A prompt (and, for some cards, a code snippet).
   - Four answer choices, **shuffled on every serve** so position never leaks the answer.
   - You pick one and submit.
5. **Instant, server-authoritative feedback.** Correct/incorrect, the correct answer, a one-line explanation, and your **rating change** (e.g. `+14` / `−12`).
6. **Momentum.** A session strip tracks questions answered, percent correct, and your current/best streak. An adaptive difficulty control lets you nudge Easier/Harder for the next card.

Right now the **Sliding Window** pattern has a full deck (25 cards); the other 17 patterns are seeded and show "No cards yet" until their decks are authored.

---

## The four card formats (with real examples)

Every card is multiple-choice and gradeable in seconds — which is what makes them work as rated drills (and, later, as duels).

**1. Pattern identification** — "which pattern solves this?"
> *Which pattern best solves: "Find the maximum sum of any contiguous subarray of size k"?*
> → **Fixed-size sliding window** (vs Two pointers / Kadane's / Prefix sums + binary search)

**2. Crux step** — the one key line or insight, not the whole solution.
> *In "longest substring without repeating characters", when the current character was last seen at index j, how do you update the left pointer?*
> → **`left = max(left, j + 1)`** (the `max` stops `left` moving backward on a stale index)

**3. Complexity** — time/space analysis under pressure.
> *A variable-size sliding window scans n elements; each pointer only advances. Total time?*
> → **O(n)** (amortized — each element enters and leaves once)

**4. Spot the bug / predict output** — a short snippet with a real defect.
> *A fixed-window max-sum routine uses `if i > k:` to shrink. The bug?*
> → **The condition should be `i >= k`; as written the window holds k+1 elements.**

Cards are **tiered by difficulty** within each format, so an "identify the pattern" on an easy array problem is a low-rated card, while the crux of a hard DP problem is a high-rated one. That difficulty ladder is what feeds the rating engine.

---

## The adaptive rating engine

- **Chess-style Elo, per pattern.** You don't have one global score — you have a rating for each pattern (Sliding Window, Two Pointers, etc.), plus an overall rating. Ratings live on a 700–2000 band centered at 1000.
- **Difficulty-matched selection.** Your rating and the chosen difficulty define a band; the app serves cards from that band, preferring ones you haven't seen this session.
- **First-attempt-only rating (anti-farming).** Only your *first* encounter with a card changes your rating. Re-answering a known card can't inflate your score — this is enforced atomically in the database, so it's safe even under rapid or concurrent submissions.
- **Mastery** per pattern blends your rating with coverage (how many of the pattern's cards you've gotten right), so the mastery ring reflects both skill *and* breadth, not just a lucky hard card.

---

## Spaced repetition (the retention engine)

Under the hood, every answer updates a **Leitner-style spaced-repetition schedule**: get a card right and it's pushed further out (10 min → 1 day → 3 → 7 → 16 → 35 days); get it wrong and it resets to ~10 minutes. Each pattern shows how many cards are "due." 

*Status: the scheduling engine is built and writes on every answer; the dedicated "review your due cards" screen is the next phase.*

---

## Content: the pattern taxonomy

The content map is the **Blind-75 / NeetCode taxonomy** — 18 patterns covering the canonical new-grad interview surface: Arrays & Hashing, Two Pointers, Sliding Window, Stack, Binary Search, Linked List, Trees, Tries, Heap/Priority Queue, Backtracking, Graphs, Advanced Graphs, 1-D DP, 2-D DP, Greedy, Intervals, Math & Geometry, Bit Manipulation.

Each pattern is meant to carry ~20–30 cards across the four formats. Content is authored and quality-checked one pattern at a time through a generate → validate → expert-review → load pipeline, so the bank grows in trustworthy increments rather than a giant unvetted dump. **Sliding Window is live (25 cards); the rest are planned.**

---

## Under the hood (architecture & engineering)

This is a genuinely well-built system, which matters both for reliability and as an engineering story:

- **Frontend:** React (single-page app) — pattern hub, pattern pages, the drill screen, a lightweight inline math/notation renderer (so `O(n^2)` shows as O(n²)), and a code-snippet renderer.
- **Backend:** Node.js + Express REST API.
- **Database:** PostgreSQL with UUID primary keys and **Row-Level Security** — every user's attempts and review state are isolated at the database layer, enforced by per-row policies, not just application code. A two-role least-privilege setup separates the pre-auth subsystem from authenticated features.
- **Security posture (the part most projects skip):**
  - **Server-authoritative grading** — answer keys are never sent to the browser before you answer; the server grades and computes the rating, so the client can't cheat its score.
  - **Token auth** with refresh-token rotation and reuse detection.
  - **Replay-safe rating** via a database uniqueness constraint (proven safe under concurrent submissions).
  - Rate limiting, security headers (helmet), a strict CORS allowlist, and schema validation on every request.
  - **Content integrity constraints** — the database itself rejects a malformed card (e.g. a "correct" answer that isn't one of the options, or an out-of-band difficulty), so bad content fails loudly at insert.
- **Tested:** ~52 backend tests (auth, grading, rating, spaced-repetition, security/RLS) and ~15 frontend tests, all green; the full drill loop is verified end-to-end against a live database.

---

## Current status (the honest version)

**This is a working MVP vertical slice sitting at a validation gate — not a finished product.**

- ✅ **Built & playable:** the full adaptive **solo drill loop** — sign up, browse patterns, drill Sliding Window across all four card formats, with server-side grading, per-pattern Elo, streaks, and spaced-repetition scheduling.
- 🟡 **Built but not yet user-facing:** the spaced-repetition *schedule* (review screen is next); the data model for duels and leagues exists, but they aren't playable yet.
- 🔭 **Designed, not built:** asynchronous **duels** (race a friend or a "ghost" opponent through a card set), **weekly leagues / leaderboards**, and the remaining 17 patterns of content.

The reason it stops here on purpose: the next investment is gated on real validation — putting the drill loop in front of ~10–15 new grads to confirm the retention pain is real and the format hooks them, *before* building the competitive layers.

---

## What's designed and coming next (roadmap)

1. **Review mode** — a "you have N cards due" session driven by the spaced-repetition schedule.
2. **Asynchronous duels** — challenge a friend (or an auto-generated ghost opponent at a target rating) to the same set of cards; faster + more correct wins; both ratings move. Async so it works even with few concurrent users.
3. **Leagues & leaderboards** — overall, per-pattern, and weekly competitive ladders — the rating you can screenshot, and the growth loop.
4. **The rest of the taxonomy** — author the remaining 17 patterns' decks.
5. **Retention hooks** — interview-date countdown, daily goal, streak protection.

---

## Where it came from (origin)

The app is a deliberate pivot. It was refactored in place from a previously built **academic adaptive-learning quiz app** (16 university subjects — calculus, organic chemistry, anatomy, etc. — with ~960 exam questions and the same adaptive-Elo engine). That earlier app is preserved on an archive branch. The pivot reused its hardened backend — auth, Row-Level Security, the rating engine, server-side grading — and swapped the academic content domain for DSA interview patterns plus the competitive/retention mechanics. So the engineering foundation is mature even though the interview product itself is early.

---

## How to frame it for different audiences

- **To a recruiter / on a résumé:** "A full-stack, security-hardened interview-prep platform (React + Node + PostgreSQL with row-level security, token auth, server-authoritative grading) built around a spaced-repetition + Elo engine — designed to fix the retention gap in LeetCode-style prep."
- **To a potential user (new grad):** "It drills you on *recognizing* DSA patterns and the key insight, rates your skill like chess, and uses spaced repetition so you stop forgetting the patterns you 'learned' last week."
- **To a friend / investor:** "Chess.com for coding interviews — competitive, rated, retention-first. The bet is that a competitive skill rating plus spaced repetition is a sharper hook than yet another problem bank. We've built the engine and one pattern; we're validating the hook with real new grads before scaling content and adding duels."
