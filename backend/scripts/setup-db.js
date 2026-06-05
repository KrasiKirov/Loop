// One-shot production database bootstrap. Run once against a fresh database with an
// OWNER/superuser connection (e.g. the connection string your managed Postgres gives you).
//
//   DATABASE_URL=postgres://owner:pw@host/db \
//   DB_AUTH_PASSWORD=... DB_APP_PASSWORD=... \
//   node scripts/setup-db.js
//
// Idempotent-ish: applies the schema only if absent (CREATE POLICY isn't re-runnable),
// (re)sets the app-role passwords from env, and loads the card decks only when the
// cards table is empty — so re-running never duplicates cards or wipes user attempts.

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const owner = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'adaptive_learning',
      user: process.env.DB_OWNER || process.env.USER,
      password: process.env.DB_OWNER_PASSWORD || '',
      ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
    };

// Load order matters only in that decks come after the schema seeds the patterns.
const DECKS = ['sliding-window', 'two-pointers', 'binary-search', 'stack', 'arrays-hashing', '_starters'];

const readSql = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const setPassword = (role, pw) =>
  `ALTER ROLE ${role} WITH LOGIN PASSWORD '${pw.replace(/'/g, "''")}'`;

async function main() {
  const pool = new Pool(owner);

  // 1. Schema — tables, the app_auth/app_user roles, grants, RLS, and the patterns seed.
  const exists = await pool.query("SELECT to_regclass('public.patterns') AS t");
  if (!exists.rows[0].t) {
    console.log('Applying schema.sql …');
    await pool.query(readSql('db/schema.sql'));
  } else {
    console.log('Schema already present — skipping schema.sql.');
  }

  // 2. App-role passwords (required so the runtime can connect as app_auth/app_user).
  if (process.env.DB_AUTH_PASSWORD) {
    await pool.query(setPassword('app_auth', process.env.DB_AUTH_PASSWORD));
    console.log('Set app_auth password.');
  }
  if (process.env.DB_APP_PASSWORD) {
    await pool.query(setPassword('app_user', process.env.DB_APP_PASSWORD));
    console.log('Set app_user password.');
  }

  // 3. Card decks — only when the bank is empty.
  const cnt = await pool.query('SELECT count(*)::int AS n FROM cards');
  if (cnt.rows[0].n === 0) {
    for (const deck of DECKS) {
      const r = await pool.query(readSql(`db/seeds/${deck}.sql`));
      console.log(`Loaded ${deck} (${r.rowCount} cards).`);
    }
  } else {
    console.log(`Cards already loaded (${cnt.rows[0].n}) — skipping decks.`);
  }

  const s = await pool.query(
    'SELECT (SELECT count(*) FROM patterns) AS patterns, (SELECT count(*) FROM cards) AS cards'
  );
  console.log(`Done. patterns=${s.rows[0].patterns} cards=${s.rows[0].cards}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
