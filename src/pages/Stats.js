import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import Sparkline from '../components/Sparkline';
import './Stats.css';

const pct = (a) => `${Math.round(a * 100)}%`;

const Stats = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/me/stats');
        if (!res.ok) throw new Error('failed');
        setData(await res.json());
      } catch (e) {
        setError('Could not load your stats.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="stats"><p className="stats-status">Loading…</p></div>;
  if (error) return <div className="stats"><p className="stats-status">{error}</p></div>;

  const { overall, subjects } = data;

  return (
    <div className="stats">
      <div className="stats-header">
        <h1>Your progress</h1>
        {overall.answered > 0 ? (
          <p>{overall.answered} questions answered · {pct(overall.accuracy)} accuracy</p>
        ) : (
          <p>No questions answered yet.</p>
        )}
      </div>

      {subjects.length === 0 ? (
        <div className="stats-empty">
          <p>Answer some questions to see your progress.</p>
          <Link to="/home" className="btn btn-primary">Start practicing</Link>
        </div>
      ) : (
        <div className="stats-grid">
          {subjects.map((s) => (
            <div key={s.subject} className="stat-card">
              <div className="stat-card-head">
                <h5>{s.subject}</h5>
                <span className="stat-rating">{s.rating}</span>
              </div>
              <Sparkline points={s.trend} width={260} height={48} className="stat-spark" />
              <div className="stat-meta">
                <span>{pct(s.accuracy)} accuracy</span>
                <span>{s.answered} answered</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Stats;
