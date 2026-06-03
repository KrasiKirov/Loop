import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Drill.css';
import { useQuizSettings } from '../QuizContext';
import { apiFetch } from '../api/client';
import MathText from '../components/MathText';
import CodeBlock from '../components/CodeBlock';
import { patternLabel, formatLabel } from '../patternLabels';

const BASE_RATING = 1000;
const EMPTY = { id: '', format: '', prompt: '', code: null, answers: [], rating: 0 };

const Drill = () => {
  const { quizSettings, setQuizSettings } = useQuizSettings();
  const navigate = useNavigate();

  const [card, setCard] = useState(EMPTY);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [result, setResult] = useState(null); // { correct, correctAnswer, explanation }
  const [rating, setRating] = useState(BASE_RATING);
  const [ratingDelta, setRatingDelta] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [noCards, setNoCards] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState({ answered: 0, correct: 0, streak: 0, best: 0 });
  const seenIds = useRef([]);      // cards already shown this session (no repeats)
  const startedAt = useRef(Date.now()); // for timing the answer (ms)

  const pattern = quizSettings.pattern;

  useEffect(() => {
    if (!pattern) { navigate('/home'); return; }
    const init = async () => {
      try {
        const r = await apiFetch(`/me/ratings/${pattern}`);
        if (r.ok) setRating((await r.json()).rating);
      } catch (err) { /* display only */ }
      await loadCard(quizSettings.difficulty);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCard = async (difficulty = quizSettings.difficulty) => {
    setLoading(true);
    setLoadError(false);
    setSubmitError('');
    if (difficulty !== quizSettings.difficulty) {
      setQuizSettings((prev) => ({ ...prev, difficulty }));
    }
    try {
      const exclude = seenIds.current.join(',');
      const res = await apiFetch(
        `/cards/next?pattern=${pattern}&difficulty=${difficulty || 'medium'}&exclude=${exclude}`
      );
      if (res.status === 404) { setNoCards(true); setLoading(false); return; }
      if (!res.ok) throw new Error('failed');
      const c = await res.json();
      seenIds.current.push(c.id);
      startedAt.current = Date.now();
      setCard(c);
      setSelectedAnswer('');
      setResult(null);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching card:', err);
      setLoadError(true);
      setLoading(false);
    }
  };

  const handleSelect = (answer) => {
    if (result) return;
    setSelectedAnswer(answer);
  };

  const handleSubmit = async () => {
    if (!selectedAnswer || result || submitting) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      const res = await apiFetch('/attempts', {
        method: 'POST',
        body: { cardId: card.id, selectedAnswer, ms: Date.now() - startedAt.current },
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setResult({ correct: data.correct, correctAnswer: data.correctAnswer, explanation: data.explanation });
      setRating(data.rating);
      setRatingDelta(data.ratingDelta);
      setSession((s) => {
        const streak = data.correct ? s.streak + 1 : 0;
        return {
          answered: s.answered + 1,
          correct: s.correct + (data.correct ? 1 : 0),
          streak,
          best: Math.max(s.best, streak),
        };
      });
    } catch (err) {
      console.error('Error submitting answer:', err);
      setSubmitError('Could not submit your answer. Check your connection and try again.');
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

  const bandProgress = Math.max(0, Math.min(100, rating % 100));

  if (loading) {
    return <div className="drill"><div className="drill-loading">Loading card…</div></div>;
  }

  if (noCards) {
    return (
      <div className="drill">
        <div className="drill-error">
          <p>No cards yet for {patternLabel(pattern)}. More patterns are on the way.</p>
          <button className="btn btn-primary" onClick={() => navigate('/home')}>Back to patterns</button>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="drill">
        <div className="drill-error">
          <p>We couldn't load a card. Check your connection and try again.</p>
          <button className="btn btn-primary" onClick={() => loadCard()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="drill">
      <div className="drill-topbar">
        <span className="pattern-chip">{patternLabel(pattern)}</span>
        <span className="format-chip">{formatLabel(card.format)}</span>
        <div className="elo-meter">
          <div className="elo-meter-head">
            <span className="elo-label">Your rating</span>
            <span className="elo-value">{rating}</span>
          </div>
          <div className="elo-bar"><div className="elo-bar-fill" style={{ width: `${bandProgress}%` }} /></div>
        </div>
        <span className="level-chip">Level {card.rating}</span>
      </div>

      {session.answered > 0 && (
        <div className="session-strip">
          <span><strong>{session.answered}</strong> answered</span>
          <span className="sep">·</span>
          <span><strong>{Math.round((session.correct / session.answered) * 100)}%</strong> correct</span>
          <span className="sep">·</span>
          <span className={session.streak > 0 ? 'streak streak-on' : 'streak'}>
            streak <strong>{session.streak}</strong>
            {session.best > 1 && <span className="streak-best"> (best {session.best})</span>}
          </span>
        </div>
      )}

      <h1 className="drill-prompt"><MathText>{card.prompt}</MathText></h1>
      <CodeBlock code={card.code} />

      <div className="answers">
        {card.answers.map((answer, index) => (
          <button key={index} className={answerClass(answer)} onClick={() => handleSelect(answer)} disabled={!!result}>
            <MathText>{answer}</MathText>
          </button>
        ))}
      </div>

      {result && (
        <div className={`feedback ${result.correct ? 'feedback-correct' : 'feedback-wrong'}`}>
          <div className="feedback-head">
            <strong>{result.correct ? 'Correct' : 'Incorrect'}</strong>
            <span className="elo-delta">{ratingDelta >= 0 ? `+${ratingDelta}` : ratingDelta} rating</span>
          </div>
          {!result.correct && (
            <p className="correct-answer">Correct answer: <strong><MathText>{result.correctAnswer}</MathText></strong></p>
          )}
          {result.explanation && <p className="explanation"><MathText>{result.explanation}</MathText></p>}
        </div>
      )}

      {submitError && <p className="drill-submit-error">{submitError}</p>}

      {!result ? (
        <div className="drill-actions">
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!selectedAnswer || submitting}>
            {submitting ? 'Submitting…' : 'Submit answer'}
          </button>
        </div>
      ) : (
        <div className="drill-next">
          <button className="btn btn-primary" onClick={() => loadCard()}>Next card →</button>
          <div className="next-difficulty">
            <span>Adjust difficulty:</span>
            <button onClick={() => loadCard('easy')}>Easier</button>
            <button onClick={() => loadCard('hard')}>Harder</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Drill;
