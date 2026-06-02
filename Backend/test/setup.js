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
const { PATTERNS } = require('../patterns');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_OWNER || process.env.USER,
  password: process.env.DB_OWNER_PASSWORD || '',
});

const SCHEMA = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
DROP TABLE IF EXISTS
  duel_results, duels, srs_state, attempts, user_ratings,
  cards, patterns, refresh_tokens, users CASCADE;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  goal_date DATE
);
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(128) NOT NULL,
  blurb TEXT,
  sort_order INT NOT NULL DEFAULT 0
);
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
  format VARCHAR(16) NOT NULL CHECK (format IN ('pattern_id','crux','complexity','bug')),
  prompt TEXT NOT NULL,
  code TEXT,
  answer1 TEXT NOT NULL, answer2 TEXT NOT NULL, answer3 TEXT NOT NULL, answer4 TEXT NOT NULL,
  correctanswer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  rating INT NOT NULL DEFAULT 1000,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT cards_correct_in_options CHECK (correctanswer IN (answer1, answer2, answer3, answer4)),
  CONSTRAINT cards_rating_band CHECK (rating BETWEEN 700 AND 2000)
);
CREATE INDEX cards_pattern_rating ON cards (pattern_id, rating);
CREATE TABLE user_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(64) NOT NULL,
  rating INTEGER NOT NULL,
  username VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, subject)
);
CREATE TABLE attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  pattern_slug VARCHAR(64) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  rating_after INTEGER NOT NULL,
  ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, card_id)
);
CREATE TABLE srs_state (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  box SMALLINT NOT NULL DEFAULT 0,
  due_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  last_result BOOLEAN,
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, card_id)
);
CREATE INDEX srs_due ON srs_state (user_id, due_at);
CREATE TABLE duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opponent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pattern_slug VARCHAR(64),
  card_ids UUID[] NOT NULL,
  is_ghost BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','complete','expired')),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);
CREATE TABLE duel_results (
  duel_id UUID NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_ghost BOOLEAN NOT NULL DEFAULT FALSE,
  num_correct SMALLINT NOT NULL,
  total_ms INTEGER NOT NULL,
  finished_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT duel_results_ghost_pairing CHECK ((user_id IS NULL) = is_ghost)
);
CREATE UNIQUE INDEX duel_results_one_per_user
  ON duel_results (duel_id, user_id) WHERE user_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_auth') THEN CREATE ROLE app_auth LOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN CREATE ROLE app_user LOGIN; END IF;
END $$;
GRANT USAGE ON SCHEMA public TO app_auth, app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON users, refresh_tokens TO app_auth;
GRANT SELECT ON patterns, cards TO app_user;
GRANT SELECT, INSERT, UPDATE ON user_ratings TO app_user;
GRANT SELECT, INSERT ON attempts TO app_user;
GRANT SELECT, INSERT, UPDATE ON srs_state TO app_user;
GRANT SELECT, INSERT ON duels TO app_user;
GRANT UPDATE (status) ON duels TO app_user;
GRANT SELECT, INSERT ON duel_results TO app_user;

ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE patterns       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE srs_state      ENABLE ROW LEVEL SECURITY;
ALTER TABLE duels          ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_results   ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_auth ON users TO app_auth USING (true) WITH CHECK (true);
CREATE POLICY rt_auth ON refresh_tokens TO app_auth USING (true) WITH CHECK (true);
CREATE POLICY patterns_read ON patterns FOR SELECT TO app_user USING (true);
CREATE POLICY cards_read ON cards FOR SELECT TO app_user USING (true);
CREATE POLICY ratings_read ON user_ratings FOR SELECT TO app_user USING (true);
CREATE POLICY ratings_insert ON user_ratings FOR INSERT TO app_user
  WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);
CREATE POLICY ratings_update ON user_ratings FOR UPDATE TO app_user
  USING (user_id = current_setting('app.current_user_id')::uuid)
  WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);
CREATE POLICY attempts_own ON attempts FOR ALL TO app_user
  USING (user_id = current_setting('app.current_user_id')::uuid)
  WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);
CREATE POLICY srs_own ON srs_state FOR ALL TO app_user
  USING (user_id = current_setting('app.current_user_id')::uuid)
  WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);
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
CREATE POLICY duel_results_read ON duel_results FOR SELECT TO app_user
  USING (EXISTS (
    SELECT 1 FROM duels d
     WHERE d.id = duel_results.duel_id
       AND (d.challenger_id = current_setting('app.current_user_id')::uuid
            OR d.opponent_id = current_setting('app.current_user_id')::uuid)
  ));
CREATE POLICY duel_results_insert ON duel_results FOR INSERT TO app_user
  WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);
`;

// Seed the 18-pattern taxonomy (owner pool bypasses RLS).
const SEED_PATTERNS = {
  text: `INSERT INTO patterns (slug, name, blurb, sort_order)
         SELECT * FROM unnest($1::varchar[], $2::varchar[], $3::text[], $4::int[])
         ON CONFLICT (slug) DO NOTHING`,
  values: [
    PATTERNS.map((p) => p.slug),
    PATTERNS.map((p) => p.name),
    PATTERNS.map((p) => p.blurb),
    PATTERNS.map((p) => p.sort_order),
  ],
};

async function resetDb() {
  await pool.query(SCHEMA);
  await pool.query(SEED_PATTERNS.text, SEED_PATTERNS.values);
}

// Insert one test card under the given pattern slug (default 'sliding-window').
// Returns the new card id. Uses the owner pool (bypasses RLS).
async function seedCard(over = {}) {
  const c = {
    slug: 'sliding-window',
    format: 'pattern_id',
    prompt: 'Which pattern solves this?',
    code: null,
    answer1: 'Sliding Window',
    answer2: 'Two Pointers',
    answer3: 'Binary Search',
    answer4: 'Greedy',
    correctanswer: 'Sliding Window',
    explanation: 'A moving contiguous window answers it in one pass.',
    rating: 1000,
    ...over,
  };
  const r = await pool.query(
    `INSERT INTO cards
       (pattern_id, format, prompt, code, answer1, answer2, answer3, answer4, correctanswer, explanation, rating)
     SELECT p.id, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
       FROM patterns p WHERE p.slug = $1
     RETURNING id`,
    [
      c.slug, c.format, c.prompt, c.code,
      c.answer1, c.answer2, c.answer3, c.answer4,
      c.correctanswer, c.explanation, c.rating,
    ]
  );
  return r.rows[0].id;
}

module.exports = { pool, resetDb, seedCard };
