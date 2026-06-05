import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import './Leagues.css';

const myUsername = () => {
  try { return JSON.parse(localStorage.getItem('user') || '{}').username; } catch { return undefined; }
};

const Leagues = () => {
  const [patterns, setPatterns] = useState([]);
  const [view, setView] = useState('overall'); // 'overall' | 'weekly' | <pattern slug>
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const me = myUsername();

  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch('/patterns');
        if (r.ok) setPatterns(await r.json());
      } catch { /* dropdown optional */ }
    })();
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const path = view === 'weekly' ? '/league/current' : `/leaderboard/${view}`;
        const res = await apiFetch(path);
        if (!res.ok) throw new Error('failed');
        const json = await res.json();
        if (active) { setData(json); setError(''); }
      } catch {
        if (active) setError('Could not load the league.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [view]);

  const meInTop = data && me && data.top.some((r) => r.username === me);

  return (
    <div className="leagues">
      <div className="leagues-header">
        <h1>Leagues</h1>
      </div>

      <div className="leagues-tabs">
        <button className={view === 'overall' ? 'tab active' : 'tab'} onClick={() => setView('overall')}>Duel rating</button>
        <button className={view === 'weekly' ? 'tab active' : 'tab'} onClick={() => setView('weekly')}>This week</button>
        <select
          className="tab-select"
          value={patterns.some((p) => p.slug === view) ? view : ''}
          onChange={(e) => e.target.value && setView(e.target.value)}
        >
          <option value="">By pattern…</option>
          {patterns.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
        </select>
      </div>

      {loading && <p className="leagues-status">Loading…</p>}
      {error && <p className="leagues-status">{error}</p>}

      {data && !loading && !error && (
        <>
          {view === 'weekly' && data.weekStart && (
            <p className="leagues-sub">Week of {data.weekStart} · ranked by duel rating</p>
          )}
          {data.top.length === 0 ? (
            <p className="leagues-status">No one ranked here yet — be the first.</p>
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
            <div className="lb-me">Play to get ranked here.</div>
          )}
        </>
      )}
    </div>
  );
};

export default Leagues;
