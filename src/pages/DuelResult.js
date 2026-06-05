import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import './Duel.css';
import { apiFetch } from '../api/client';

const Score = ({ name, numCorrect, totalMs }) => (
  <div className="duel-side">
    <div className="name">{name}</div>
    <div className="score">{numCorrect == null ? '—' : numCorrect}</div>
    {totalMs != null && <div className="ms">{(totalMs / 1000).toFixed(1)}s</div>}
  </div>
);

const DuelResult = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const stateResult = location.state && location.state.result;

  const [view, setView] = useState(stateResult ? { kind: 'result', result: stateResult } : null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (stateResult) return; // came straight from submitting — already have the result
    (async () => {
      try {
        const res = await apiFetch(`/duels/${id}`);
        if (!res.ok) throw new Error('failed');
        setView({ kind: 'fetched', duel: await res.json() });
      } catch {
        setError('Could not load this duel.');
      }
    })();
  }, [id, stateResult]);

  if (error) return <div className="duel"><p className="duel-status">{error}</p></div>;
  if (!view) return <div className="duel"><p className="duel-status">Loading…</p></div>;

  // Pending friend duel — waiting for the opponent to play.
  if (view.kind === 'fetched' && view.duel.status !== 'complete') {
    const link = `${window.location.origin}/home/duel/${id}/play`;
    return (
      <div className="duel">
        <div className="duel-header">
          <h1>Challenge sent</h1>
          <p>Waiting for {view.duel.opponent.name} to play. Share this link so they can take their turn:</p>
        </div>
        <div className="duel-card">
          <div className="duel-share"><code>{link}</code></div>
          <button className="btn btn-secondary" onClick={() => navigator.clipboard?.writeText(link)}>Copy link</button>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/home')}>Back to patterns</button>
      </div>
    );
  }

  // Resolve the displayable fields from either source.
  let outcome, you, opponent, ratingDelta;
  if (view.kind === 'result') {
    outcome = view.result.outcome; // 'win' | 'loss' | 'draw'
    you = view.result.you;
    opponent = view.result.opponent;
    ratingDelta = view.result.you.ratingDelta;
  } else {
    const d = view.duel;
    outcome = d.winner === 'you' ? 'win' : d.winner === 'draw' ? 'draw' : 'loss';
    you = d.you;
    opponent = { name: d.opponent.name, numCorrect: d.opponent.numCorrect, totalMs: d.opponent.totalMs };
    ratingDelta = d.yourRatingDelta;
  }

  const headline = outcome === 'win' ? 'You won' : outcome === 'loss' ? 'You lost' : 'Draw';

  return (
    <div className="duel">
      <div className={`duel-outcome ${outcome}`}>{headline}</div>

      <div className="duel-scoreline">
        <Score name="You" numCorrect={you.numCorrect} totalMs={you.totalMs} />
        <span className="duel-vs">vs</span>
        <Score name={opponent.name} numCorrect={opponent.numCorrect} totalMs={opponent.totalMs} />
      </div>

      {ratingDelta != null && (
        <div className="duel-delta">
          Overall rating <strong>{ratingDelta >= 0 ? `+${ratingDelta}` : ratingDelta}</strong>
        </div>
      )}

      <button className="btn btn-primary" onClick={() => navigate('/home/duel')}>Duel again</button>
      <button className="btn btn-secondary" onClick={() => navigate('/home')}>Back to patterns</button>
    </div>
  );
};

export default DuelResult;
