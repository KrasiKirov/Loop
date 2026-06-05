import React from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDrillSettings } from '../context/DrillContext';
import { patternLabel } from '../utils/patternLabels';
import './PatternPage.css';

const LEVELS = [
  { key: 'easy', label: 'Easy', desc: 'Warm up', pips: 1 },
  { key: 'medium', label: 'Medium', desc: 'Steady challenge', pips: 2 },
  { key: 'hard', label: 'Hard', desc: 'Push your limits', pips: 3 },
];

const PatternPage = () => {
  const { slug } = useParams();
  const { setDrillSettings } = useDrillSettings();
  const navigate = useNavigate();

  const start = (difficulty) => {
    setDrillSettings({ pattern: slug, difficulty });
    navigate('/home/drill');
  };

  return (
    <div className="pattern-page">
      <div className="pattern-head">
        <nav className="breadcrumb">
          <Link to="/home">Patterns</Link>
          <span className="sep">/</span>
          <span>{patternLabel(slug)}</span>
        </nav>
        <h1>{patternLabel(slug)}</h1>
        <p>Choose a difficulty to start drilling. Your rating adapts as you go.</p>
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

export default PatternPage;
