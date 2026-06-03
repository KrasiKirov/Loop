import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import MasteryRing from '../components/MasteryRing';
import './PatternHub.css';

const PatternHub = () => {
  const [patterns, setPatterns] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/patterns');
        if (!res.ok) throw new Error('failed');
        setPatterns(await res.json());
      } catch (e) {
        setError('Could not load patterns.');
      }
    })();
  }, []);

  if (error) return <div className="hub"><p className="hub-status">{error}</p></div>;
  if (!patterns) return <div className="hub"><p className="hub-status">Loading patterns…</p></div>;

  return (
    <div className="hub">
      <div className="hub-header">
        <h1>Drill the patterns</h1>
        <p>Pick a pattern. Race the clock. Watch your rating climb.</p>
      </div>

      <div className="pattern-grid">
        {patterns.map((p) => (
          <button
            key={p.slug}
            className="pattern-card"
            onClick={() => navigate(`/home/pattern/${p.slug}`)}
          >
            <div className="pattern-card-top">
              <MasteryRing value={p.mastery} />
              <div className="pattern-card-meta">
                <h5>{p.name}</h5>
                <span className="pattern-rating">{p.rating}</span>
              </div>
            </div>
            <p className="pattern-blurb">{p.blurb}</p>
            {p.due > 0 && <span className="pattern-due">{p.due} due for review</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PatternHub;
