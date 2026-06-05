import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import MasteryRing from '../components/MasteryRing';
import './PatternHub.css';

const PatternHub = () => {
  const [patterns, setPatterns] = useState(null);
  const [stats, setStats] = useState(null);   // { streak, answered, goalDate, daysLeft }
  const [due, setDue] = useState(0);
  const [error, setError] = useState('');
  const [goalInput, setGoalInput] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);
  const navigate = useNavigate();

  const loadStats = useCallback(async () => {
    try {
      const [s, q] = await Promise.all([apiFetch('/me/stats'), apiFetch('/review/queue')]);
      if (s.ok) setStats(await s.json());
      if (q.ok) setDue((await q.json()).due);
    } catch { /* header is non-critical */ }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/patterns');
        if (!res.ok) throw new Error('failed');
        setPatterns(await res.json());
      } catch {
        setError('Could not load patterns.');
      }
    })();
    loadStats();
  }, [loadStats]);

  const saveGoal = async () => {
    if (!goalInput) return;
    try {
      const res = await apiFetch('/me/goal', { method: 'PUT', body: { goalDate: goalInput } });
      if (res.ok) { setEditingGoal(false); await loadStats(); }
    } catch { /* ignore */ }
  };

  if (error) return <div className="hub"><p className="hub-status">{error}</p></div>;
  if (!patterns) return <div className="hub"><p className="hub-status">Loading patterns…</p></div>;

  return (
    <div className="hub">
      <div className="hub-header">
        <h1>Drill the patterns</h1>
        <p>Pick a pattern. Race the clock. Watch your rating climb.</p>
      </div>

      <div className="hub-stats">
        {stats && (
          <span className="hub-stat">
            <strong>{stats.streak}</strong> day streak
          </span>
        )}
        {due > 0 && (
          <button className="hub-stat hub-stat-action" onClick={() => navigate('/home/review')}>
            <strong>{due}</strong> due for review →
          </button>
        )}
        {stats && stats.goalDate && !editingGoal ? (
          <span className="hub-stat">
            interview in <strong>{stats.daysLeft}</strong> day{stats.daysLeft === 1 ? '' : 's'}
            <button className="hub-link" onClick={() => { setEditingGoal(true); setGoalInput(stats.goalDate); }}>change</button>
          </span>
        ) : (
          <span className="hub-stat hub-goal-edit">
            <label>Interview date</label>
            <input type="date" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} />
            <button className="hub-link" onClick={saveGoal}>save</button>
          </span>
        )}
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
