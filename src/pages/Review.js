import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Drill.css';
import { apiFetch } from '../api/client';
import MathText from '../components/MathText';
import CodeBlock from '../components/CodeBlock';
import { patternLabel, formatLabel } from '../utils/patternLabels';

const EMPTY = { id: '', format: '', prompt: '', code: null, answers: [], rating: 0, pattern: '' };

// Spaced-repetition review: serves the user's due cards one at a time (across all
// patterns) until the queue is empty. Reviews never change rating — they update the
// SRS schedule — so this is about retention, not the leaderboard.
const Review = () => {
  const navigate = useNavigate();
  const [due, setDue] = useState(null);
  const [started, setStarted] = useState(false);
  const [card, setCard] = useState(EMPTY);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const startedAt = useRef(Date.now());

  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch('/review/queue');
        if (!r.ok) throw new Error('failed');
        setDue((await r.json()).due);
      } catch {
        setError('Could not load your review queue.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadNext = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/review/next');
      if (!res.ok) throw new Error('failed');
      const c = await res.json();
      if (c.empty) { setDone(true); setLoading(false); return; }
      startedAt.current = Date.now();
      setCard(c);
      setSelectedAnswer('');
      setResult(null);
      setLoading(false);
    } catch {
      setError('Could not load the next card.');
      setLoading(false);
    }
  };

  const start = async () => { setStarted(true); await loadNext(); };

  const handleSubmit = async () => {
    if (!selectedAnswer || result || submitting) return;
    setSubmitting(true);
    try {
      const res = await apiFetch('/attempts', {
        method: 'POST',
        body: { cardId: card.id, selectedAnswer, ms: Date.now() - startedAt.current },
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setResult({ correct: data.correct, correctAnswer: data.correctAnswer, explanation: data.explanation });
      setReviewed((n) => n + 1);
    } catch {
      setError('Could not submit your answer. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const answerClass = (answer) => {
    if (!result) return selectedAnswer === answer ? 'answer selected' : 'answer';
    if (answer === result.correctAnswer) return 'answer correct';
    if (answer === selectedAnswer) return 'answer wrong';
    return 'answer';
  };

  if (loading) return <div className="drill"><div className="drill-loading">Loading…</div></div>;

  if (error) {
    return (
      <div className="drill">
        <div className="drill-error">
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/home')}>Back to patterns</button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="drill">
        <div className="drill-error">
          {due > 0 ? (
            <>
              <p>You have <strong>{due}</strong> card{due === 1 ? '' : 's'} due for review.</p>
              <button className="btn btn-primary" onClick={start}>Start review</button>
            </>
          ) : (
            <>
              <p>All caught up — no cards are due for review right now.</p>
              <button className="btn btn-primary" onClick={() => navigate('/home')}>Back to patterns</button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="drill">
        <div className="drill-error">
          <p>Review complete — you reviewed <strong>{reviewed}</strong> card{reviewed === 1 ? '' : 's'}.</p>
          <button className="btn btn-primary" onClick={() => navigate('/home')}>Back to patterns</button>
        </div>
      </div>
    );
  }

  return (
    <div className="drill">
      <div className="drill-topbar">
        <span className="pattern-chip">{patternLabel(card.pattern)}</span>
        <span className="format-chip">{formatLabel(card.format)}</span>
        <div className="elo-meter">
          <div className="elo-meter-head">
            <span className="elo-label">Review</span>
            <span className="elo-value">{reviewed} done</span>
          </div>
          <div className="elo-bar"><div className="elo-bar-fill" style={{ width: due ? `${Math.min(100, (reviewed / due) * 100)}%` : '0%' }} /></div>
        </div>
        <span className="level-chip">Level {card.rating}</span>
      </div>

      <h1 className="drill-prompt"><MathText>{card.prompt}</MathText></h1>
      <CodeBlock code={card.code} />

      <div className="answers">
        {card.answers.map((answer, index) => (
          <button key={index} className={answerClass(answer)} onClick={() => !result && setSelectedAnswer(answer)} disabled={!!result}>
            <MathText>{answer}</MathText>
          </button>
        ))}
      </div>

      {result && (
        <div className={`feedback ${result.correct ? 'feedback-correct' : 'feedback-wrong'}`}>
          <div className="feedback-head">
            <strong>{result.correct ? 'Correct' : 'Incorrect'}</strong>
          </div>
          {!result.correct && (
            <p className="correct-answer">Correct answer: <strong><MathText>{result.correctAnswer}</MathText></strong></p>
          )}
          {result.explanation && <p className="explanation"><MathText>{result.explanation}</MathText></p>}
        </div>
      )}

      {!result ? (
        <div className="drill-actions">
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!selectedAnswer || submitting}>
            {submitting ? 'Submitting…' : 'Submit answer'}
          </button>
        </div>
      ) : (
        <div className="drill-actions">
          <button className="btn btn-primary" onClick={loadNext}>Next card →</button>
        </div>
      )}
    </div>
  );
};

export default Review;
