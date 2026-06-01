import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Quiz.css';
import { updateRatings } from './elo';
import { useQuizSettings } from '../QuizContext';
import { useUser } from '../UserContext';

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
  const { user, setUser } = useUser();
  const navigate = useNavigate();

  const [question, setQuestion] = useState(EMPTY_QUESTION);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [elo, setElo] = useState(user.elo || 15);
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
        return { lower: 0, upper: 1000 };
    }
  };

  const loadQuestion = useCallback(async () => {
    setLoading(true);
    const { lower, upper } = getBounds(quizSettings.difficulty, elo);
    try {
      const subject = quizSettings.subject || 'Calculus';
      const response = await fetch(`${process.env.REACT_APP_API_URL}/questions?subject=${subject}`);
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
  }, [quizSettings.difficulty, quizSettings.subject, elo, navigate]);

  useEffect(() => {
    loadQuestion();
  }, [loadQuestion]);

  const handleSelect = (answer) => {
    if (answerSubmitted) return;
    setSelectedAnswer(answer);
  };

  const handleSubmit = () => {
    if (!selectedAnswer || answerSubmitted) return;

    const result = selectedAnswer === question.correctAnswer ? 1 : 0;
    const updatedElo = Math.round(updateRatings(elo, question.score, result, quizSettings.difficulty));

    setIsCorrect(result === 1);
    setAnswerSubmitted(true);
    setElo(updatedElo);
    setUser({ ...user, elo: updatedElo });

    fetch(`${process.env.REACT_APP_API_URL}/user/elo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, elo: updatedElo }),
    }).catch((err) => console.error('Failed to persist ELO:', err));
  };

  const changeDifficulty = (type) => {
    const difficulty = type === 'harder' ? 'hard' : type === 'easier' ? 'easy' : 'medium';
    setQuizSettings((prev) => ({ ...prev, difficulty }));
  };

  const answerClass = (answer) => {
    if (!answerSubmitted) {
      return selectedAnswer === answer ? 'answer selected' : 'answer';
    }
    if (answer === question.correctAnswer) return 'answer correct';
    if (answer === selectedAnswer) return 'answer wrong';
    return 'answer';
  };

  // ELO progress within the current 50-point tier (purely visual)
  const tierProgress = Math.max(0, Math.min(100, (elo % 50) * 2));

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
            <div className="elo-bar-fill" style={{ width: `${tierProgress}%` }} />
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
          <strong>{isCorrect ? 'Correct!' : 'Not quite.'}</strong>
          <span>{isCorrect ? `Your ELO is now ${elo}.` : question.feedback}</span>
        </div>
      )}

      <div className="quiz-actions">
        {answerSubmitted ? (
          <button className="btn btn-primary" onClick={loadQuestion}>
            Next question →
          </button>
        ) : (
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!selectedAnswer}>
            Submit answer
          </button>
        )}
      </div>

      <div className="difficulty-toggle">
        <button onClick={() => changeDifficulty('easier')}>Easier</button>
        <button onClick={() => changeDifficulty('similar')}>Similar</button>
        <button onClick={() => changeDifficulty('harder')}>Harder</button>
      </div>
    </div>
  );
};

export default Quiz;
