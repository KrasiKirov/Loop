CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Run this once to set up the database:
--   psql -d adaptive_learning -f schema.sql

CREATE TABLE IF NOT EXISTS users (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name     VARCHAR(255) NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
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

CREATE TABLE IF NOT EXISTS user_ratings (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject    VARCHAR(100) NOT NULL,
    rating     INTEGER NOT NULL,
    username   VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, subject)
);
CREATE INDEX IF NOT EXISTS idx_ratings_user ON user_ratings(user_id);

CREATE TABLE IF NOT EXISTS answers (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject        VARCHAR(100) NOT NULL,
    is_correct     BOOLEAN NOT NULL,
    question_score INTEGER NOT NULL,
    rating_after   INTEGER NOT NULL,
    question_id    UUID,
    created_at     TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_answers_user ON answers(user_id);

-- All subject tables share the same structure.
-- Table names are lowercase; the app sends e.g. "Calculus" and we lowercase it before querying.

CREATE TABLE IF NOT EXISTS calculus (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS discretemath (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS linearalgebra (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS statistics (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS anatomy (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS microbiology (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS molecularbiology (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS physiology (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS analyticalchemistry (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS biochemistry (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS inorganicchemistry (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS organicchemistry (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS astrophysics (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS electromagnetics (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS quantummechanics (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS thermodynamics (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

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
