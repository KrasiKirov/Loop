import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Quiz.css';
import { useQuizSettings } from '../QuizContext';
import { apiFetch } from '../api/client';
import { subjectLabel } from '../subjectLabels';

const BASE_RATING = 1000;
const EMPTY = { id: '', question: '', answers: [], score: 0, subject: '' };

const Quiz = () => {
  const { quizSettings, setQuizSettings } = useQuizSettings();
  const navigate = useNavigate();

  const [question, setQuestion] = useState(EMPTY);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [result, setResult] = useState(null); // { correct, correctAnswer, feedback }
  const [rating, setRating] = useState(BASE_RATING);
  const [ratingDelta, setRatingDelta] = useState(0);
  const [loading, setLoading] = useState(true);
  const seenIds = useRef([]); // questions already shown this session (no repeats)

  const subject = quizSettings.subject || 'Calculus';

  const loadQuestion = async (difficulty = quizSettings.difficulty) => {
    setLoading(true);
    if (difficulty !== quizSettings.difficulty) {
      setQuizSettings((prev) => ({ ...prev, difficulty }));
    }
    try {
      const exclude = seenIds.current.join(',');
      const res = await apiFetch(
        `/questions/next?subject=${subject}&difficulty=${difficulty || 'medium'}&exclude=${exclude}`
      );
      if (res.status === 404) { navigate('/home/no-questions'); return; }
      if (!res.ok) throw new Error('failed');
      const q = await res.json();
      seenIds.current.push(q.id);
      setQuestion(q);
      setSelectedAnswer('');
      setResult(null);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching question:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const r = await apiFetch(`/me/ratings/${subject}`);
        if (r.ok) setRating((await r.json()).rating);
      } catch (err) { /* display only */ }
      await loadQuestion(quizSettings.difficulty);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (answer) => {
    if (result) return;
    setSelectedAnswer(answer);
  };

  const handleSubmit = async () => {
    if (!selectedAnswer || result) return;
    try {
      const res = await apiFetch('/attempts', {
        method: 'POST',
        body: { subject, questionId: question.id, selectedAnswer },
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setResult({ correct: data.correct, correctAnswer: data.correctAnswer, feedback: data.feedback });
      setRating(data.rating);
      setRatingDelta(data.ratingDelta);
    } catch (err) {
      console.error('Error submitting answer:', err);
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
    return <div className="quiz"><div className="quiz-loading">Loading question…</div></div>;
  }

  return (
    <div className="quiz">
      <div className="quiz-topbar">
        <span className="subject-chip">{subjectLabel(question.subject || subject)}</span>
        <div className="elo-meter">
          <div className="elo-meter-head">
            <span className="elo-label">Your ELO</span>
            <span className="elo-value">{rating}</span>
          </div>
          <div className="elo-bar"><div className="elo-bar-fill" style={{ width: `${bandProgress}%` }} /></div>
        </div>
        <span className="level-chip">Level {question.score}</span>
      </div>

      <h1 className="quiz-question">{question.question}</h1>

      <div className="answers">
        {question.answers.map((answer, index) => (
          <button key={index} className={answerClass(answer)} onClick={() => handleSelect(answer)} disabled={!!result}>
            {answer}
          </button>
        ))}
      </div>

      {result && (
        <div className={`feedback ${result.correct ? 'feedback-correct' : 'feedback-wrong'}`}>
          <div className="feedback-head">
            <strong>{result.correct ? 'Correct' : 'Incorrect'}</strong>
            <span className="elo-delta">{ratingDelta >= 0 ? `+${ratingDelta}` : ratingDelta} ELO</span>
          </div>
          {!result.correct && (
            <p className="correct-answer">Correct answer: <strong>{result.correctAnswer}</strong></p>
          )}
          {result.feedback && <p className="explanation">{result.feedback}</p>}
        </div>
      )}

      {!result ? (
        <div className="quiz-actions">
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!selectedAnswer}>Submit answer</button>
        </div>
      ) : (
        <div className="quiz-next">
          <button className="btn btn-primary" onClick={() => loadQuestion()}>Next question →</button>
          <div className="next-difficulty">
            <span>Adjust difficulty:</span>
            <button onClick={() => loadQuestion('easy')}>Easier</button>
            <button onClick={() => loadQuestion('hard')}>Harder</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quiz;
