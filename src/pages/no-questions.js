import React from 'react';
import { Link } from 'react-router-dom';
import './NoQuestions.css';

const NoQuestions = () => {
  return (
    <div className="empty-state">
      <i className="fas fa-mountain empty-icon"></i>
      <h2>You've outgrown these questions</h2>
      <p>
        Your ELO climbed past the available questions for this topic. Our team is
        adding higher-level challenges — check back soon.
      </p>
      <Link to="/home" className="btn btn-primary">Back to subjects</Link>
    </div>
  );
};

export default NoQuestions;
