require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./db');
const requireAuth = require('./middleware/requireAuth');
const authRoutes = require('./auth/routes');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/auth', authRoutes);

const VALID_SUBJECTS = [
  'Calculus', 'DiscreteMath', 'LinearAlgebra', 'Statistics',
  'Anatomy', 'Microbiology', 'MolecularBiology', 'Physiology',
  'AnalyticalChemistry', 'Biochemistry', 'InorganicChemistry', 'OrganicChemistry',
  'Astrophysics', 'Electromagnetics', 'QuantumMechanics', 'Thermodynamics',
];

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

app.post('/user/elo', requireAuth, async (req, res) => {
  const { elo } = req.body;
  if (elo === undefined) return res.status(400).json({ error: 'elo is required' });
  try {
    await pool.query('UPDATE users SET score = $1 WHERE id = $2', [elo, req.user.id]);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error updating ELO:', err);
    res.status(500).json({ error: 'Internal Server Error' });
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
