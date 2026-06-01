-- Per-subject ELO + answer history migration.
-- Run once: psql -d adaptive_learning -f migrate-per-subject-elo.sql

CREATE TABLE IF NOT EXISTS user_ratings (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject    VARCHAR(100) NOT NULL,
    rating     INTEGER NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, subject)
);
CREATE INDEX IF NOT EXISTS idx_ratings_user ON user_ratings(user_id);

CREATE TABLE IF NOT EXISTS answers (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject        VARCHAR(100) NOT NULL,
    is_correct     BOOLEAN NOT NULL,
    question_score INTEGER NOT NULL,
    rating_after   INTEGER NOT NULL,
    created_at     TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_answers_user ON answers(user_id);

ALTER TABLE users DROP COLUMN IF EXISTS score;
