require('./setup');
const { test } = require('node:test');
const assert = require('node:assert');
const { pool, resetDb, seedCard } = require('./setup'); // owner pool (bypasses RLS) for seeding
const { userPool } = require('../db');                  // app_user (subject to RLS)

// Run a query as app_user with a given user context (or none).
async function asUser(userId, sql, params) {
  const client = await userPool.connect();
  try {
    await client.query('BEGIN');
    if (userId) await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
    const r = await client.query(sql, params);
    await client.query('COMMIT');
    return r;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function makeUserWithAttempt(cardId, username, ratingAfter) {
  const u = await pool.query(
    "INSERT INTO users (name, username, password) VALUES ('N', $1, 'x') RETURNING id",
    [username]
  );
  const id = u.rows[0].id;
  await pool.query(
    `INSERT INTO attempts (user_id, card_id, pattern_slug, is_correct, rating_after)
       VALUES ($1, $2, 'sliding-window', true, $3)`,
    [id, cardId, ratingAfter]
  );
  await pool.query(
    `INSERT INTO user_ratings (user_id, subject, rating, username)
       VALUES ($1, 'sliding-window', $2, $3)`,
    [id, ratingAfter, username]
  );
  return id;
}

test('app_user sees only its own attempts', async () => {
  await resetDb();
  const card = await seedCard();
  const a = await makeUserWithAttempt(card, 'alice', 1010);
  const b = await makeUserWithAttempt(card, 'bob', 1020);

  const mine = await asUser(a, 'SELECT count(*)::int AS n FROM attempts');
  assert.strictEqual(mine.rows[0].n, 1); // only alice's row visible under alice context

  const bobRows = await asUser(a, 'SELECT count(*)::int AS n FROM attempts WHERE user_id = $1', [b]);
  assert.strictEqual(bobRows.rows[0].n, 0); // cannot see bob's attempts
});

test('app_user cannot write a rating for another user', async () => {
  await resetDb();
  const card = await seedCard();
  const a = await makeUserWithAttempt(card, 'alice', 1010);
  const b = await makeUserWithAttempt(card, 'bob', 1020);

  await assert.rejects(
    () => asUser(a, `INSERT INTO user_ratings (user_id, subject, rating, username) VALUES ($1, 'two-pointers', 1500, 'bob')`, [b]),
    /row-level security|policy/i
  );
});

test('app_user can read all ratings (leaderboard is public)', async () => {
  await resetDb();
  const card = await seedCard();
  const a = await makeUserWithAttempt(card, 'alice', 1010);
  await makeUserWithAttempt(card, 'bob', 1020);
  const all = await asUser(a, 'SELECT count(*)::int AS n FROM user_ratings');
  assert.ok(all.rows[0].n >= 2); // ratings SELECT policy is permissive
});

test.after(() => userPool.end());
