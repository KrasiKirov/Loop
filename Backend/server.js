require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./db');
const authRoutes = require('./auth/routes');
const practiceRoutes = require('./routes/practice');
const insightsRoutes = require('./routes/insights');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/auth', authRoutes);
app.use(practiceRoutes);
app.use(insightsRoutes);

if (require.main === module) {
  pool.connect()
    .then(() => console.log('Connected to PostgreSQL database.'))
    .catch((err) => console.error('Could not connect to the database:', err));
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
