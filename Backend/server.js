require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const { createLimiter } = require('./middleware/rateLimit');
const { authPool, userPool } = require('./db');
const authRoutes = require('./auth/routes');
const cardsRoutes = require('./routes/cards');

const app = express();
app.set('trust proxy', 1); // correct client IP behind a hosting proxy (for rate limiting)

const globalLimiter = createLimiter(Number(process.env.RATE_LIMIT_GLOBAL_MAX) || 300, 60 * 1000);
const authLimiter = createLimiter(Number(process.env.RATE_LIMIT_AUTH_MAX) || 10, 15 * 60 * 1000);

app.use(helmet({ frameguard: { action: 'deny' } }));

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .concat(['capacitor://localhost', 'http://localhost', 'https://localhost']); // Capacitor app origins
app.use(
  cors({
    origin(origin, cb) {
      // No Origin header = non-browser client (curl, native app, server-to-server) — allow.
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, false); // disallowed: respond without CORS headers (browser will block)
    },
  })
);

app.use(bodyParser.json());
app.use(globalLimiter);

app.use('/auth', authLimiter, authRoutes);
app.use(cardsRoutes);

if (require.main === module) {
  Promise.all([authPool.query('SELECT 1'), userPool.query('SELECT 1')])
    .then(() => console.log('Connected to PostgreSQL database.'))
    .catch((err) => console.error('Could not connect to the database:', err));
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
