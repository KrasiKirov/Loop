import React from 'react';
import { Link } from 'react-router-dom';
import './NoQuestions.css'; // Import the CSS file
const NoQuestions = () => {
  return (
    <div>
      <h2>Your ELO got to high for the Questions. Our team is working on making higher level questions. Please come back tomorrow.</h2>
      <Link to="/">Return Home</Link>
    </div>
  );
};

export default NoQuestions;
