CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Run this once to set up the database:
--   psql -d adaptive_learning -f schema.sql
--
-- DSA interview-prep content model (replaces the academic subject schema).
-- The hardened auth subsystem (users + refresh_tokens, app_auth/app_user roles,
-- RLS, the `current_setting('app.current_user_id')::uuid` GUC) is unchanged.

-- ============================================================
-- Identity (kept from the auth build) + retention profile
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name      VARCHAR(255) NOT NULL,
    username  VARCHAR(255) UNIQUE NOT NULL,
    password  VARCHAR(255) NOT NULL,
    goal_date DATE
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked    BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);

-- ============================================================
-- Content domain
-- ============================================================

-- A DSA pattern (the Blind-75/NeetCode taxonomy).
CREATE TABLE IF NOT EXISTS patterns (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug       VARCHAR(64) UNIQUE NOT NULL,
    name       VARCHAR(128) NOT NULL,
    blurb      TEXT,
    sort_order INT NOT NULL DEFAULT 0
);

-- A single drillable, auto-gradeable card. Mirrors the proven question schema
-- (answer1-4 + correctanswer + explanation + rating) plus pattern/format/code.
CREATE TABLE IF NOT EXISTS cards (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id    UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    format        VARCHAR(16) NOT NULL CHECK (format IN ('pattern_id','crux','complexity','bug')),
    prompt        TEXT NOT NULL,
    code          TEXT,                       -- optional snippet (bug/crux/complexity cards)
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,              -- byte-identical to one of answer1-4
    explanation   TEXT NOT NULL,
    rating        INT NOT NULL DEFAULT 1000,  -- difficulty on the ELO scale (700-2000)
    created_at    TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cards_pattern_rating ON cards (pattern_id, rating);

-- Per-pattern (and 'overall') user skill rating. Same shape as the old
-- user_ratings; `subject` now holds a pattern slug or the literal 'overall'.
CREATE TABLE IF NOT EXISTS user_ratings (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject    VARCHAR(64) NOT NULL,          -- pattern slug | 'overall'
    rating     INTEGER NOT NULL,
    username   VARCHAR(255) NOT NULL,         -- denormalized for leaderboard reads
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, subject)
);
CREATE INDEX IF NOT EXISTS idx_ratings_user ON user_ratings(user_id);

-- First-attempt-only rated attempts (replay-safe). Reuses the UNIQUE-constraint
-- idempotency trick from the academic build.
CREATE TABLE IF NOT EXISTS attempts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id      UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    pattern_slug VARCHAR(64) NOT NULL,
    is_correct   BOOLEAN NOT NULL,
    rating_after INTEGER NOT NULL,
    ms           INTEGER,                     -- answer time (analytics + duels)
    created_at   TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, card_id)
);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id);

-- Spaced repetition (Leitner boxes). The retention engine.
CREATE TABLE IF NOT EXISTS srs_state (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id     UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    box         SMALLINT NOT NULL DEFAULT 0,  -- 0..5
    due_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    reps        INTEGER NOT NULL DEFAULT 0,
    lapses      INTEGER NOT NULL DEFAULT 0,
    last_result BOOLEAN,
    updated_at  TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, card_id)
);
CREATE INDEX IF NOT EXISTS srs_due ON srs_state (user_id, due_at);

-- Async duels: a fixed card set, resolved when both players submit.
CREATE TABLE IF NOT EXISTS duels (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenger_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opponent_id   UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL = open link / ghost
    pattern_slug  VARCHAR(64),                                  -- NULL = mixed
    card_ids      UUID[] NOT NULL,
    is_ghost      BOOLEAN NOT NULL DEFAULT FALSE,
    status        VARCHAR(16) NOT NULL DEFAULT 'pending',       -- pending|complete|expired
    created_at    TIMESTAMP DEFAULT NOW(),
    expires_at    TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);

CREATE TABLE IF NOT EXISTS duel_results (
    duel_id     UUID NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,    -- NULL = ghost player
    is_ghost    BOOLEAN NOT NULL DEFAULT FALSE,
    num_correct SMALLINT NOT NULL,
    total_ms    INTEGER NOT NULL,
    finished_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS duel_results_one_per_user
  ON duel_results (duel_id, user_id) WHERE user_id IS NOT NULL;

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
GRANT SELECT ON patterns, cards TO app_user;                 -- public content read
GRANT SELECT, INSERT, UPDATE ON user_ratings TO app_user;
GRANT SELECT, INSERT ON attempts TO app_user;
GRANT SELECT, INSERT, UPDATE ON srs_state TO app_user;
GRANT SELECT, INSERT, UPDATE ON duels TO app_user;
GRANT SELECT, INSERT ON duel_results TO app_user;

-- Enable RLS (not FORCE: the owner role used by migrations/seed/tests bypasses it;
-- the non-owner app roles are always subject to it).
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE patterns       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE srs_state      ENABLE ROW LEVEL SECURITY;
ALTER TABLE duels          ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_results   ENABLE ROW LEVEL SECURITY;

-- users + refresh_tokens: only app_auth, permissive (pre-auth lookups by username/hash).
CREATE POLICY users_auth ON users TO app_auth USING (true) WITH CHECK (true);
CREATE POLICY rt_auth ON refresh_tokens TO app_auth USING (true) WITH CHECK (true);

-- patterns + cards: public read for app_user.
CREATE POLICY patterns_read ON patterns FOR SELECT TO app_user USING (true);
CREATE POLICY cards_read ON cards FOR SELECT TO app_user USING (true);

-- user_ratings: app_user reads all (leaderboard), writes only its own.
CREATE POLICY ratings_read ON user_ratings FOR SELECT TO app_user USING (true);
CREATE POLICY ratings_insert ON user_ratings FOR INSERT TO app_user
  WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);
CREATE POLICY ratings_update ON user_ratings FOR UPDATE TO app_user
  USING (user_id = current_setting('app.current_user_id')::uuid)
  WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);

-- attempts: fully private to the owner.
CREATE POLICY attempts_own ON attempts FOR ALL TO app_user
  USING (user_id = current_setting('app.current_user_id')::uuid)
  WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);

-- srs_state: fully private to the owner.
CREATE POLICY srs_own ON srs_state FOR ALL TO app_user
  USING (user_id = current_setting('app.current_user_id')::uuid)
  WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);

-- duels: readable/updatable by either participant; insert only as the challenger.
CREATE POLICY duels_read ON duels FOR SELECT TO app_user
  USING (challenger_id = current_setting('app.current_user_id')::uuid
         OR opponent_id = current_setting('app.current_user_id')::uuid);
CREATE POLICY duels_insert ON duels FOR INSERT TO app_user
  WITH CHECK (challenger_id = current_setting('app.current_user_id')::uuid);
CREATE POLICY duels_update ON duels FOR UPDATE TO app_user
  USING (challenger_id = current_setting('app.current_user_id')::uuid
         OR opponent_id = current_setting('app.current_user_id')::uuid)
  WITH CHECK (challenger_id = current_setting('app.current_user_id')::uuid
         OR opponent_id = current_setting('app.current_user_id')::uuid);

-- duel_results: visible to participants of the duel; insert only your own row.
CREATE POLICY duel_results_read ON duel_results FOR SELECT TO app_user
  USING (EXISTS (
    SELECT 1 FROM duels d
     WHERE d.id = duel_results.duel_id
       AND (d.challenger_id = current_setting('app.current_user_id')::uuid
            OR d.opponent_id = current_setting('app.current_user_id')::uuid)
  ));
CREATE POLICY duel_results_insert ON duel_results FOR INSERT TO app_user
  WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);

-- ============================================================
-- Seed: the 18-pattern Blind-75/NeetCode taxonomy.
-- (Mirrors Backend/patterns.js — keep both in sync.)
-- ============================================================
INSERT INTO patterns (slug, name, blurb, sort_order) VALUES
  ('arrays-hashing',   'Arrays & Hashing',          'Use hash maps and sets to trade space for O(1) lookups over arrays.',                      1),
  ('two-pointers',     'Two Pointers',              'Converge or chase indices through a sequence to avoid nested scans.',                      2),
  ('sliding-window',   'Sliding Window',            'Maintain a moving subrange to answer contiguous-subarray questions in one pass.',          3),
  ('stack',            'Stack',                     'Push and pop to track nesting, order, and the most recent unmatched element.',             4),
  ('binary-search',    'Binary Search',             'Halve a sorted or monotonic search space to reach answers in O(log n).',                   5),
  ('linked-list',      'Linked List',               'Manipulate node pointers for traversal, reversal, and cycle detection.',                   6),
  ('trees',            'Trees',                     'Recurse over binary and BST structures with DFS and BFS traversals.',                       7),
  ('tries',            'Tries',                     'Store strings as a prefix tree for fast word and prefix lookups.',                          8),
  ('heap',             'Heap & Priority Queue',     'Keep the top-k or running min/max with a binary heap in O(log n) pushes.',                  9),
  ('backtracking',     'Backtracking',              'Explore the decision tree of permutations, subsets, and combinations, pruning dead ends.', 10),
  ('graphs',           'Graphs',                    'Model relationships and search them with BFS, DFS, and union-find.',                       11),
  ('advanced-graphs',  'Advanced Graphs',           'Dijkstra, topological sort, MST, and other weighted or ordered graph algorithms.',         12),
  ('dp-1d',            '1-D Dynamic Programming',   'Build answers from overlapping subproblems along a single dimension.',                      13),
  ('dp-2d',            '2-D Dynamic Programming',   'Fill a grid of subproblem results for two-sequence or matrix DP.',                          14),
  ('greedy',           'Greedy',                    'Make the locally optimal choice when it provably yields a global optimum.',                15),
  ('intervals',        'Intervals',                 'Sort by endpoints to merge, insert, and detect overlapping ranges.',                       16),
  ('math-geometry',    'Math & Geometry',           'Apply number theory and coordinate reasoning to matrix and math problems.',                17),
  ('bit-manipulation', 'Bit Manipulation',          'Use XOR, masks, and shifts to compute on the binary representation directly.',             18)
ON CONFLICT (slug) DO NOTHING;
