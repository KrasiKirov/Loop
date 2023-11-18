var express = require('express');
var router = express.Router();
const sql = require('mssql/msnodesqlv8');

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
        await createTable();
        console.log("Created table.");
    } catch (err) {
        console.error("Could not connect to the database:", err);
    }
}


async function createTable() {
    const createTableQuery = `
        IF NOT EXISTS (
            SELECT * 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = N'QuestionsTable'
        )
        CREATE TABLE QuestionsTable (
            Id INT PRIMARY KEY IDENTITY(1,1),
            Question NVARCHAR(MAX),
            Answer NVARCHAR(MAX),
            Difficulty INT
        )
    `;
    try {
        await sql.query(createTableQuery);
        console.log("Table created successfully.");
    } catch (err) {
        console.error("Could not create table:", err);
    }
}

// Connect to the database
connectToDatabase();