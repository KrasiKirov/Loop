import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import './Leaderboard.css';

const SUBJECT_GROUPS = [
  { label: 'Mathematics', subjects: ['Calculus', 'DiscreteMath', 'LinearAlgebra', 'Statistics'] },
  { label: 'Biology', subjects: ['Anatomy', 'Microbiology', 'MolecularBiology', 'Physiology'] },
  { label: 'Chemistry', subjects: ['AnalyticalChemistry', 'Biochemistry', 'InorganicChemistry', 'OrganicChemistry'] },
  { label: 'Physics', subjects: ['Astrophysics', 'Electromagnetics', 'QuantumMechanics', 'Thermodynamics'] },
];

const myUsername = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}').username;
  } catch {
    return undefined;
  }
};

const Leaderboard = () => {
  const [subject, setSubject] = useState('Calculus');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const me = myUsername();

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const res = await apiFetch(`/leaderboard/${subject}`);
        if (!res.ok) throw new Error('failed');
        const json = await res.json();
        if (active) { setData(json); setError(''); }
      } catch (e) {
        if (active) setError('Could not load the leaderboard.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [subject]);

  const meInTop = data && data.top.some((r) => r.username === me);

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <h1>Leaderboard</h1>
        <select className="subject-select" value={subject} onChange={(e) => setSubject(e.target.value)}>
          {SUBJECT_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      {loading && <p className="lb-status">Loading…</p>}
      {error && <p className="lb-status">{error}</p>}

      {data && !loading && !error && (
        <>
          {data.top.length === 0 ? (
            <p className="lb-status">No one has played this subject yet.</p>
          ) : (
            <ol className="lb-list">
              {data.top.map((row) => (
                <li key={row.rank} className={`lb-row ${row.username === me ? 'is-me' : ''}`}>
                  <span className="lb-rank">#{row.rank}</span>
                  <span className="lb-name">{row.username}</span>
                  <span className="lb-rating">{row.rating}</span>
                </li>
              ))}
            </ol>
          )}
          {data.me && !meInTop && (
            <div className="lb-me">Your rank — #{data.me.rank} · {data.me.rating}</div>
          )}
          {!data.me && (
            <div className="lb-me">Play this subject to get ranked.</div>
          )}
        </>
      )}
    </div>
  );
};

export default Leaderboard;
