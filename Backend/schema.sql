-- Run this once to set up the database:
--   psql -d adaptive_learning -f schema.sql

CREATE TABLE IF NOT EXISTS users (
    id       SERIAL PRIMARY KEY,
    name     VARCHAR(255) NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    score    INTEGER DEFAULT 1000
);

-- All subject tables share the same structure.
-- Table names are lowercase; the app sends e.g. "Calculus" and we lowercase it before querying.

CREATE TABLE IF NOT EXISTS calculus (
    id            SERIAL PRIMARY KEY,
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS discretemath (
    id            SERIAL PRIMARY KEY,
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS linearalgebra (
    id            SERIAL PRIMARY KEY,
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS statistics (
    id            SERIAL PRIMARY KEY,
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS anatomy (
    id            SERIAL PRIMARY KEY,
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS microbiology (
    id            SERIAL PRIMARY KEY,
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS molecularbiology (
    id            SERIAL PRIMARY KEY,
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS physiology (
    id            SERIAL PRIMARY KEY,
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS analyticalchemistry (
    id            SERIAL PRIMARY KEY,
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS biochemistry (
    id            SERIAL PRIMARY KEY,
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS inorganicchemistry (
    id            SERIAL PRIMARY KEY,
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS organicchemistry (
    id            SERIAL PRIMARY KEY,
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS astrophysics (
    id            SERIAL PRIMARY KEY,
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS electromagnetics (
    id            SERIAL PRIMARY KEY,
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS quantummechanics (
    id            SERIAL PRIMARY KEY,
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS thermodynamics (
    id            SERIAL PRIMARY KEY,
    question      TEXT NOT NULL,
    answer1       TEXT NOT NULL,
    answer2       TEXT NOT NULL,
    answer3       TEXT NOT NULL,
    answer4       TEXT NOT NULL,
    correctanswer TEXT NOT NULL,
    feedback      TEXT,
    score         INTEGER DEFAULT 15,
    subject       VARCHAR(100)
);
