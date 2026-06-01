const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const SALT_ROUNDS = 10;

const app = express();
app.use(cors());
app.use(bodyParser.json());

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'adaptive_learning',
    user: process.env.DB_USER || process.env.USER,
    password: process.env.DB_PASSWORD || '',
});

pool.connect()
    .then(() => console.log('Connected to PostgreSQL database.'))
    .catch(err => console.error('Could not connect to the database:', err));

// Login Endpoint
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }

    try {
        const result = await pool.query(
            'SELECT name, username, password, score FROM users WHERE username = $1',
            [username]
        );

        if (!result.rows.length) {
            return res.status(401).send('Invalid username or password');
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).send('Invalid username or password');
        }

        res.json({ name: user.name, username: user.username, elo: user.score });
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Signup Endpoint
app.post('/signup', async (req, res) => {
    const { name, username, password } = req.body;

    if (!name || !username || !password) {
        return res.status(400).send('Name, username, and password are required');
    }

    try {
        const userCheck = await pool.query(
            'SELECT username FROM users WHERE username = $1',
            [username]
        );
        if (userCheck.rows.length > 0) {
            return res.status(400).send('User already exists');
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        await pool.query(
            'INSERT INTO users (name, username, password, score) VALUES ($1, $2, $3, $4)',
            [name, username, hashedPassword, 15]
        );

        res.status(201).send('User registered successfully');
    } catch (err) {
        console.error('Error during user registration:', err);
        res.status(500).send('Internal Server Error');
    }
});

const VALID_SUBJECTS = [
    'Calculus', 'DiscreteMath', 'LinearAlgebra', 'Statistics',
    'Anatomy', 'Microbiology', 'MolecularBiology', 'Physiology',
    'AnalyticalChemistry', 'Biochemistry', 'InorganicChemistry', 'OrganicChemistry',
    'Astrophysics', 'Electromagnetics', 'QuantumMechanics', 'Thermodynamics'
];

app.get('/questions', async (req, res) => {
    const { subject } = req.query;

    if (!subject || !VALID_SUBJECTS.includes(subject)) {
        return res.status(400).send('Invalid or missing subject');
    }

    try {
        // Table names are lowercased in PostgreSQL — safe to interpolate after whitelist check
        const result = await pool.query(`SELECT * FROM ${subject.toLowerCase()}`);

        if (!result.rows.length) {
            return res.status(404).send('No questions found');
        }

        // Map to the field names the frontend expects
        const questions = result.rows.map(row => ({
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

app.post('/user/elo', async (req, res) => {
    const { username, elo } = req.body;

    if (!username || elo === undefined) {
        return res.status(400).send('Username and elo are required');
    }

    try {
        await pool.query(
            'UPDATE users SET score = $1 WHERE username = $2',
            [elo, username]
        );
        res.status(200).send('ELO updated');
    } catch (err) {
        console.error('Error updating ELO:', err);
        res.status(500).send('Internal Server Error');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
