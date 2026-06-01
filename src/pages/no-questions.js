import React from 'react';
import { Link } from 'react-router-dom';
import './NoQuestions.css'; // Import the CSS file
const NoQuestions = () => {
  return (
    <div>
      <h2>Your ELO got too high for the available questions. Our team is working on adding higher level questions — please come back soon.</h2>
      <Link to="/">Return Home</Link>
    </div>
  );
};

export default NoQuestions;
