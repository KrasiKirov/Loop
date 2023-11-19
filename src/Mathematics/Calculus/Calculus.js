import '../Math.css';
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from "react-router-dom";
import { useQuizSettings } from '../../QuizContext';


const Calculus = () => {
    const { setQuizSettings } = useQuizSettings();

    const handleDifficultySelection = (difficulty) => {
        setQuizSettings({ subject: 'Calculus', difficulty: difficulty });
    };
  return (
    <div>
        <Helmet>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/css/all.min.css" />
        </Helmet>
        <div className="container text-center py-5">
            <h1><span className="app-title">Calculus</span></h1>
            <p>From simple number theory to complex discrete math.</p>
            <p>Choose a level of difficulty</p>

        </div>
        <div className="features-container icon-container">

        <Link to="/home/question2" onClick={() => handleDifficultySelection('Easy')}>
            <div className="feature icon-difficulty">
                <i class="fas fa-star"></i>
                <h5>Easy question</h5>
            </div>
        </Link>

        <Link to="/home/question2" onClick={() => handleDifficultySelection('Medium')}>
            <div className="feature icon-difficulty">
                <i class="fas fa-star"></i>
                <i class="fas fa-star"></i>
                <h5>Medium question</h5>  
            </div>
        </Link>
        <Link to="/home/question2" onClick={() => handleDifficultySelection('Hard')}>
                <div className="feature icon-difficulty">
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <h5>Hard question</h5>
                </div>
        </Link>
        </div>
    </div>
);
};
  
export default Calculus;