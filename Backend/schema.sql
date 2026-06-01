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
    created_at     TIMESTAMP DEFAULT NOW()
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
