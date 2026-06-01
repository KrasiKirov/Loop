import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Quiz.css';
import { updateRatings, BASE_RATING } from './elo';
import { useQuizSettings } from '../QuizContext';
import { apiFetch } from '../api/client';

const EMPTY_QUESTION = {
  question: '',
  answers: [],
  correctAnswer: '',
  feedback: '',
  score: 0,
  subject: '',
};

const Quiz = () => {
  const { quizSettings, setQuizSettings } = useQuizSettings();
  const navigate = useNavigate();

  const [question, setQuestion] = useState(EMPTY_QUESTION);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [elo, setElo] = useState(BASE_RATING);
  const [eloDelta, setEloDelta] = useState(0);
  const [loading, setLoading] = useState(true);

  const getBounds = (difficulty, currentElo) => {
    const m = 0.2;
    switch (difficulty) {
      case 'easy':
        return { lower: currentElo - Math.round(currentElo * 2 * m), upper: currentElo };
      case 'medium':
        return { lower: Math.round(currentElo - currentElo * m), upper: Math.round(currentElo + currentElo * m) };
      case 'hard':
        return { lower: currentElo, upper: Math.round(currentElo + currentElo * m * 2) };
      default:
        return { lower: 0, upper: 100000 };
    }
  };

  // Loads a fresh question. `difficulty` overrides the stored difficulty so the
  // post-answer "Easier/Harder" controls take effect immediately.
  const loadQuestion = async (difficulty = quizSettings.difficulty, currentElo = elo) => {
    setLoading(true);
    if (difficulty !== quizSettings.difficulty) {
      setQuizSettings((prev) => ({ ...prev, difficulty }));
    }
    const { lower, upper } = getBounds(difficulty, currentElo);
    try {
      const subject = quizSettings.subject || 'Calculus';
      const response = await apiFetch(`/questions?subject=${subject}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      const inRange = data.filter((q) => q.score >= lower && q.score <= upper);
      const pool = inRange.length > 0 ? inRange : data;

      if (pool.length === 0) {
        navigate('/home/no-questions');
        return;
      }

      const picked = pool[Math.floor(Math.random() * pool.length)];
      setQuestion({
        question: picked.question,
        answers: [picked.answer1, picked.answer2, picked.answer3, picked.answer4],
        correctAnswer: picked.correctAnswer,
        feedback: picked.feedback,
        score: picked.score,
        subject: picked.subject,
      });
      setSelectedAnswer('');
      setAnswerSubmitted(false);
      setIsCorrect(false);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setLoading(false);
    }
  };

  // On mount: load this subject's saved rating, then the first question.
  useEffect(() => {
    const init = async () => {
      const subject = quizSettings.subject || 'Calculus';
      let rating = BASE_RATING;
      try {
        const res = await apiFetch(`/me/ratings/${subject}`);
        if (res.ok) {
          const data = await res.json();
          rating = data.rating;
          setElo(rating);
        }
      } catch (err) {
        console.error('Failed to load rating:', err);
      }
      await loadQuestion(quizSettings.difficulty, rating);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (answer) => {
    if (answerSubmitted) return;
    setSelectedAnswer(answer);
  };

  const handleSubmit = () => {
    if (!selectedAnswer || answerSubmitted) return;

    const result = selectedAnswer === question.correctAnswer ? 1 : 0;
    const updatedElo = updateRatings(elo, question.score, result);

    setIsCorrect(result === 1);
    setEloDelta(updatedElo - elo);
    setElo(updatedElo);
    setAnswerSubmitted(true);

    const subject = quizSettings.subject || question.subject;
    apiFetch('/answers', {
      method: 'POST',
      body: {
        subject,
        isCorrect: result === 1,
        questionScore: question.score,
        rating: updatedElo,
      },
    }).catch((err) => console.error('Failed to record answer:', err));
  };

  const answerClass = (answer) => {
    if (!answerSubmitted) {
      return selectedAnswer === answer ? 'answer selected' : 'answer';
    }
    if (answer === question.correctAnswer) return 'answer correct';
    if (answer === selectedAnswer) return 'answer wrong';
    return 'answer';
  };

  // ELO progress within the current 100-point band (purely visual).
  const bandProgress = Math.max(0, Math.min(100, elo % 100));

  if (loading) {
    return (
      <div className="quiz">
        <div className="quiz-loading">Loading question…</div>
      </div>
    );
  }

  return (
    <div className="quiz">
      <div className="quiz-topbar">
        <span className="subject-chip">{question.subject || quizSettings.subject}</span>
        <div className="elo-meter">
          <div className="elo-meter-head">
            <span className="elo-label">Your ELO</span>
            <span className="elo-value">{elo}</span>
          </div>
          <div className="elo-bar">
            <div className="elo-bar-fill" style={{ width: `${bandProgress}%` }} />
          </div>
        </div>
        <span className="level-chip">Level {question.score}</span>
      </div>

      <h1 className="quiz-question">{question.question}</h1>

      <div className="answers">
        {question.answers.map((answer, index) => (
          <button
            key={index}
            className={answerClass(answer)}
            onClick={() => handleSelect(answer)}
            disabled={answerSubmitted}
          >
            {answer}
          </button>
        ))}
      </div>

      {answerSubmitted && (
        <div className={`feedback ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`}>
          <div className="feedback-head">
            <strong>{isCorrect ? 'Correct' : 'Incorrect'}</strong>
            <span className="elo-delta">{eloDelta >= 0 ? `+${eloDelta}` : eloDelta} ELO</span>
          </div>
          {!isCorrect && (
            <p className="correct-answer">
              Correct answer: <strong>{question.correctAnswer}</strong>
            </p>
          )}
          {question.feedback && <p className="explanation">{question.feedback}</p>}
        </div>
      )}

      {!answerSubmitted ? (
        <div className="quiz-actions">
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!selectedAnswer}>
            Submit answer
          </button>
        </div>
      ) : (
        <div className="quiz-next">
          <button className="btn btn-primary" onClick={() => loadQuestion()}>
            Next question →
          </button>
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
