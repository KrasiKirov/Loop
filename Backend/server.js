require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./db');
const requireAuth = require('./middleware/requireAuth');
const authRoutes = require('./auth/routes');
const practiceRoutes = require('./routes/practice');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/auth', authRoutes);
app.use(practiceRoutes);

const VALID_SUBJECTS = require('./subjects');

app.get('/questions', requireAuth, async (req, res) => {
  const { subject } = req.query;
  if (!subject || !VALID_SUBJECTS.includes(subject)) {
    return res.status(400).send('Invalid or missing subject');
  }
  try {
    const result = await pool.query(`SELECT * FROM ${subject.toLowerCase()}`);
    if (!result.rows.length) return res.status(404).send('No questions found');
    const questions = result.rows.map((row) => ({
      question: row.question,
      answer1: row.answer1,
      answer2: row.answer2,
      answer3: row.answer3,
      answer4: row.answer4,
      correctAnswer: row.correctanswer,
      feedback: row.feedback,
      score: row.score,
      subject: row.subject,
    }));
    res.json(questions);
  } catch (err) {
    console.error('Error fetching questions:', err);
    res.status(500).send('Internal Server Error');
  }
});


if (require.main === module) {
  pool.connect()
    .then(() => console.log('Connected to PostgreSQL database.'))
    .catch((err) => console.error('Could not connect to the database:', err));
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
