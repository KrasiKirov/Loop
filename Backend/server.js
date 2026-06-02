require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const { authPool, userPool } = require('./db');
const authRoutes = require('./auth/routes');
const practiceRoutes = require('./routes/practice');
const insightsRoutes = require('./routes/insights');

const app = express();
app.set('trust proxy', 1); // correct client IP behind a hosting proxy (for rate limiting)

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

app.use('/auth', authRoutes);
app.use(practiceRoutes);
app.use(insightsRoutes);

if (require.main === module) {
  Promise.all([authPool.query('SELECT 1'), userPool.query('SELECT 1')])
    .then(() => console.log('Connected to PostgreSQL database.'))
    .catch((err) => console.error('Could not connect to the database:', err));
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
