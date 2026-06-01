const { Pool } = require('pg');

const base = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'adaptive_learning',
};

const authPool = new Pool({
  ...base,
  user: process.env.DB_AUTH_USER || 'app_auth',
  password: process.env.DB_AUTH_PASSWORD || '',
});

const userPool = new Pool({
  ...base,
  user: process.env.DB_APP_USER || 'app_user',
  password: process.env.DB_APP_PASSWORD || '',
});

async function withUserContext(userId, fn) {
  const client = await userPool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { authPool, userPool, withUserContext };
