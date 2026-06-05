import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Drill.css';
import { apiFetch } from '../api/client';
import MathText from '../components/MathText';
import CodeBlock from '../components/CodeBlock';
import { formatLabel } from '../patternLabels';

// Play a duel: a fixed set of cards answered in sequence with NO per-card feedback
// (it's a race — you find out the result only after submitting all answers).
const DuelPlay = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);  // { duel, cards, alreadySubmitted }
  const [idx, setIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const answers = useRef([]);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`/duels/${id}/play`);
        if (!res.ok) throw new Error('failed');
        const d = await res.json();
        if (d.alreadySubmitted) { navigate(`/home/duel/${id}`); return; }
        startedAt.current = Date.now();
        setData(d);
      } catch {
        setError('Could not load this duel.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const submit = async (allAnswers) => {
    setSubmitting(true);
    try {
      const res = await apiFetch(`/duels/${id}/submit`, { method: 'POST', body: { answers: allAnswers } });
      if (!res.ok) throw new Error('failed');
      const out = await res.json();
      // Ghost duels resolve immediately (full result); friend duels may be pending.
      navigate(`/home/duel/${id}`, { state: out.status === 'complete' ? { result: out.result } : null });
    } catch {
      setError('Could not submit your duel. Try again.');
      setSubmitting(false);
    }
  };

  const next = () => {
    const card = data.cards[idx];
    const recorded = [...answers.current, { cardId: card.id, selectedAnswer, ms: Date.now() - startedAt.current }];
    answers.current = recorded;
    if (idx + 1 < data.cards.length) {
      setIdx(idx + 1);
      setSelectedAnswer('');
      startedAt.current = Date.now();
    } else {
      submit(recorded);
    }
  };

  if (error) {
    return (
      <div className="drill">
        <div className="drill-error">
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/home/duel')}>Back</button>
        </div>
      </div>
    );
  }
  if (!data) return <div className="drill"><div className="drill-loading">Loading duel…</div></div>;

  const card = data.cards[idx];
  const last = idx + 1 === data.cards.length;

  return (
    <div className="drill">
      <div className="drill-topbar">
        <span className="pattern-chip">vs {data.duel.opponent}</span>
        <span className="format-chip">{formatLabel(card.format)}</span>
        <div className="elo-meter">
          <div className="elo-meter-head">
            <span className="elo-label">Duel</span>
            <span className="elo-value">{idx + 1} / {data.cards.length}</span>
          </div>
          <div className="elo-bar"><div className="elo-bar-fill" style={{ width: `${((idx) / data.cards.length) * 100}%` }} /></div>
        </div>
        <span className="level-chip">Level {card.rating}</span>
      </div>

      <h1 className="drill-prompt"><MathText>{card.prompt}</MathText></h1>
      <CodeBlock code={card.code} />

      <div className="answers">
        {card.answers.map((answer, i) => (
          <button
            key={i}
            className={selectedAnswer === answer ? 'answer selected' : 'answer'}
            onClick={() => setSelectedAnswer(answer)}
          >
            <MathText>{answer}</MathText>
          </button>
        ))}
      </div>

      <div className="drill-actions">
        <button className="btn btn-primary" onClick={next} disabled={!selectedAnswer || submitting}>
          {submitting ? 'Submitting…' : last ? 'Finish duel' : 'Next card →'}
        </button>
      </div>
    </div>
  );
};

export default DuelPlay;
