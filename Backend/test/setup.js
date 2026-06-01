// Must run before any module that reads these env vars or requires ./db.
process.env.DB_NAME = process.env.TEST_DB_NAME || 'adaptive_learning_test';
process.env.JWT_ACCESS_SECRET = 'test-secret';

const pool = require('../db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS user_ratings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(100) NOT NULL,
  rating INTEGER NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, subject)
);
CREATE TABLE IF NOT EXISTS answers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(100) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  question_score INTEGER NOT NULL,
  rating_after INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
`;

async function resetDb() {
  await pool.query(SCHEMA);
  await pool.query('TRUNCATE answers, user_ratings, refresh_tokens, users RESTART IDENTITY CASCADE');
}

module.exports = { pool, resetDb };
