// Must run before any module that reads these env vars or requires ./db.
process.env.DB_NAME = process.env.TEST_DB_NAME || 'adaptive_learning_test';
process.env.JWT_ACCESS_SECRET = 'test-secret';
process.env.DB_AUTH_USER = 'app_auth';
process.env.DB_AUTH_PASSWORD = '';
process.env.DB_APP_USER = 'app_user';
process.env.DB_APP_PASSWORD = '';
process.env.RATE_LIMIT_AUTH_MAX = '1000000';
process.env.RATE_LIMIT_GLOBAL_MAX = '1000000';

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_OWNER || process.env.USER,
  password: process.env.DB_OWNER_PASSWORD || '',
});

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
  question_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, question_id)
);
CREATE TABLE calculus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer1 TEXT NOT NULL, answer2 TEXT NOT NULL, answer3 TEXT NOT NULL, answer4 TEXT NOT NULL,
  correctanswer TEXT NOT NULL,
  feedback TEXT,
  score INTEGER DEFAULT 15,
  subject VARCHAR(100)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_auth') THEN CREATE ROLE app_auth LOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN CREATE ROLE app_user LOGIN; END IF;
END $$;
GRANT USAGE ON SCHEMA public TO app_auth, app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON users, refresh_tokens TO app_auth;
GRANT SELECT, INSERT, UPDATE ON user_ratings TO app_user;
GRANT SELECT, INSERT ON answers TO app_user;
GRANT SELECT ON calculus TO app_user;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculus ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_auth ON users TO app_auth USING (true) WITH CHECK (true);
CREATE POLICY rt_auth ON refresh_tokens TO app_auth USING (true) WITH CHECK (true);
CREATE POLICY ratings_read ON user_ratings FOR SELECT TO app_user USING (true);
CREATE POLICY ratings_insert ON user_ratings FOR INSERT TO app_user
  WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);
CREATE POLICY ratings_update ON user_ratings FOR UPDATE TO app_user
  USING (user_id = current_setting('app.current_user_id')::uuid)
  WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);
CREATE POLICY answers_own ON answers FOR ALL TO app_user
  USING (user_id = current_setting('app.current_user_id')::uuid)
  WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);
CREATE POLICY calculus_read ON calculus FOR SELECT TO app_user USING (true);
`;

async function resetDb() {
  await pool.query(SCHEMA);
}

module.exports = { pool, resetDb };
