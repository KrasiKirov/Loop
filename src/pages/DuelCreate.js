import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Duel.css';
import { apiFetch } from '../api/client';

const DuelCreate = () => {
  const navigate = useNavigate();
  const [patterns, setPatterns] = useState([]);
  const [pattern, setPattern] = useState('');   // '' = mixed
  const [size, setSize] = useState(5);
  const [opponent, setOpponent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch('/patterns');
        if (r.ok) setPatterns((await r.json()).filter((p) => p.rating !== undefined));
      } catch { /* dropdown is optional */ }
    })();
  }, []);

  const create = async (withFriend) => {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const body = { size: Number(size) };
      if (pattern) body.patternSlug = pattern;
      if (withFriend && opponent.trim()) body.opponentUsername = opponent.trim();
      const res = await apiFetch('/duels', { method: 'POST', body });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Could not create the duel.');
      }
      const { id } = await res.json();
      // A friend duel waits for the opponent; a ghost duel you play immediately.
      if (withFriend && opponent.trim()) navigate(`/home/duel/${id}`);
      else navigate(`/home/duel/${id}/play`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="duel">
      <div className="duel-header">
        <h1>Start a duel</h1>
        <p>Race a set of cards. Fastest with the most correct wins — and your rating moves.</p>
      </div>

      <div className="duel-card">
        <div className="duel-field">
          <label>Pattern</label>
          <select value={pattern} onChange={(e) => setPattern(e.target.value)}>
            <option value="">Mixed (any pattern)</option>
            {patterns.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
          </select>
        </div>
        <div className="duel-field">
          <label>Cards</label>
          <select value={size} onChange={(e) => setSize(e.target.value)}>
            {[3, 5, 7, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {error && <p className="duel-error">{error}</p>}

        <button className="btn btn-primary" onClick={() => create(false)} disabled={busy}>
          {busy ? 'Starting…' : 'Quick duel vs a ghost'}
        </button>

        <div className="duel-divider">or challenge a friend</div>

        <div className="duel-field">
          <label>Friend's username</label>
          <input
            type="text"
            value={opponent}
            placeholder="username"
            onChange={(e) => setOpponent(e.target.value)}
          />
        </div>
        <button className="btn btn-secondary" onClick={() => create(true)} disabled={busy || !opponent.trim()}>
          Send challenge
        </button>
      </div>
    </div>
  );
};

export default DuelCreate;
