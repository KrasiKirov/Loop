import React from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { useQuizSettings } from '../QuizContext';
import '../subject.css';

const LEVELS = [
  { key: 'easy', label: 'Easy', desc: 'Warm up', pips: 1 },
  { key: 'medium', label: 'Medium', desc: 'Steady challenge', pips: 2 },
  { key: 'hard', label: 'Hard', desc: 'Push your limits', pips: 3 },
];

/**
 * Shared layout for a single topic (e.g. Calculus).
 * @param {string} subject - DB table/subject name sent to the quiz.
 * @param {string} title - Display title.
 * @param {string} description - Short blurb.
 * @param {Array<{label: string, to?: string}>} breadcrumb - Trail items.
 */
const TopicPage = ({ subject, title, description, breadcrumb = [] }) => {
  const { setQuizSettings } = useQuizSettings();
  const navigate = useNavigate();

  const start = (difficulty) => {
    setQuizSettings({ subject, difficulty });
    navigate('/home/quiz');
  };

  return (
    <div className="subject-page">
      <Helmet>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/css/all.min.css" />
      </Helmet>

      <div className="subject-head">
        <nav className="breadcrumb">
          {breadcrumb.map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="sep">/</span>}
              {item.to ? <Link to={item.to}>{item.label}</Link> : <span>{item.label}</span>}
            </React.Fragment>
          ))}
        </nav>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>

      <div className="difficulty-grid">
        {LEVELS.map((level) => (
          <div
            key={level.key}
            className="difficulty-card"
            role="button"
            tabIndex={0}
            onClick={() => start(level.key)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && start(level.key)}
          >
            <div className="pips">
              {[1, 2, 3].map((n) => (
                <span key={n} className={`pip ${n <= level.pips ? 'filled' : ''}`} />
              ))}
            </div>
            <h5>{level.label}</h5>
            <span className="difficulty-desc">{level.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopicPage;
