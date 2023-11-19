const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const sql = require('mssql/msnodesqlv8');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const config = {
    server: 'localhost\\SQLEXPRESS',
    database: 'Questions',
    options: {
        trustedConnection: true
    }
}

async function connectToDatabase() {
    try {
        await sql.connect(config);
        console.log("Connected to the database.");
    } catch (err) {
        console.error("Could not connect to the database:", err);
    }
}

connectToDatabase();

// Login Endpoint
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    console.log("Email received:", email);
    console.log(password)

    if (!email || !password) {
        return res.status(400).send('Email and password are required');
    }

    try {
        const result = await sql.query`SELECT Email, Password FROM Users WHERE Email = ${email}`;
        if (!result.recordset.length) {
            return res.status(401).send('Invalid email or password');
        }

        const user = result.recordset[0];
        console.log(user.Password)
        const validPassword = (password == user.Password);

        if (!validPassword) {
            return res.status(401).send('Invalid email or password');
        }

        res.send('Login successful');
    } catch (err) {
        console.error('Database query error: ', err);
        res.status(500).send('Internal Server Error');
    }
});

// Signup Endpoint
app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).send('Name, email, and password are required');
    }

    try {
        // Check if the user already exists
        const userCheck = await sql.query`SELECT Email FROM Users WHERE Email = ${email}`;
        if (userCheck.recordset.length > 0) {
            return res.status(400).send('User already exists');
        }

        // Insert the new user into the database
        await sql.query`INSERT INTO Users (Name, Email, Password) VALUES (${name}, ${email}, ${password})`;

        res.status(201).send('User registered successfully');
    } catch (err) {
        console.error('Error during user registration:', err);
        res.status(500).send('Internal Server Error');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});