// Must run before any module that reads these env vars or requires ./db.
process.env.DB_NAME = process.env.TEST_DB_NAME || 'adaptive_learning_test';
process.env.JWT_ACCESS_SECRET = 'test-secret';

const pool = require('../db');

const SCHEMA = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
DROP TABLE IF EXISTS answers, user_ratings, refresh_tokens, calculus, users CASCADE;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE user_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(100) NOT NULL,
  rating INTEGER NOT NULL,
  username VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, subject)
);
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(100) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  question_score INTEGER NOT NULL,
  rating_after INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE calculus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer1 TEXT NOT NULL,
  answer2 TEXT NOT NULL,
  answer3 TEXT NOT NULL,
  answer4 TEXT NOT NULL,
  correctanswer TEXT NOT NULL,
  feedback TEXT,
  score INTEGER DEFAULT 15,
  subject VARCHAR(100)
);
`;

// resetDb drops + recreates (ensures correct UUID types each run).
async function resetDb() {
  await pool.query(SCHEMA);
}

module.exports = { pool, resetDb };
