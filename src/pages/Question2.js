import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import '../Question2.css'; // Import the CSS file
import { updateRatings } from './elo';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useQuizSettings } from '../QuizContext';
import { diff } from 'semver';
import { useUser } from '../UserContext';

const Question2 = () => {
  const { setQuizSettings } = useQuizSettings();
  const location = useLocation();
  const { user } = useUser();

  const csvFile = './CodeJam.csv';
  const [randomQuestion, setRandomQuestion] = useState({
    question: '',
    answers: [],
    correctAnswer: '',
    feedback: '',
    score: 0,
    subject: '',
    lastDisplayedQuestion: '',
  });

  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [elo, setUserElo] = useState(15); // Initial User Elo
  const [answerSubmitted, setAnswerSubmitted] = useState(false); // New state
  const [lastDisplayedQuestion, setLastDisplayedQuestion] = useState('');
  const [multiplier, setMultiplier] = useState(0.2);
  const [lowerBound, setLowerBound] = useState(elo - elo * multiplier);
  const [higherBound, setHigherBound] = useState(elo + elo * multiplier);
  const [answeredQuestionsHistory, setAnsweredQuestionsHistory] = useState([]);
  const { quizSettings } = useQuizSettings();
  const { difficulty, subject } = quizSettings;

  useEffect(() => {
    fetchData(csvFile);
  }, []); // Empty dependency array to run only once

  const setInitialBounds = (difficulty, elo) => {
    switch (difficulty) {
      case 'easy':
        setLowerBound(elo - Math.round(elo * 2 * multiplier));
        setHigherBound(elo);
        break;
      case 'medium':
        setLowerBound(Math.round(elo - elo * multiplier));
        setHigherBound(Math.round(elo + elo * multiplier));
        break;
      case 'hard':
        setLowerBound(elo);
        setHigherBound(Math.round(elo + elo * multiplier * 2));
        break;
      default:
        // Set default bounds
        console.log("Entered default: value is: " + difficulty)
        setLowerBound(0);
        setHigherBound(1000);
        break;
    }
  };

  const fetchData = async () => {
    setInitialBounds(difficulty, elo);
    try {
      const response = await fetch('/CodeJam.csv');
      const csvData = await response.text();

      Papa.parse(csvData, {
        header: true,
        dynamicTyping: true,
        complete: (result) => {
          if (result.data && result.data.length > 0) {
            const filteredQuestions = result.data.filter(
              (item) =>
                item.score >= lowerBound &&
                item.score <= higherBound &&
                item.subject === subject
            );

            if (filteredQuestions.length > 0) {
              let randomIndex;
              do {
                randomIndex = Math.floor(Math.random() * filteredQuestions.length);
              } while (
                filteredQuestions[randomIndex].question === lastDisplayedQuestion
              );

              const randomQuestionData = filteredQuestions[randomIndex];
              const question = randomQuestionData.question;
              const answers = [
                randomQuestionData.answer1,
                randomQuestionData.answer2,
                randomQuestionData.answer3,
                randomQuestionData.answer4,
              ];
              const correctAnswer = randomQuestionData.correctAnswer;
              const feedback = randomQuestionData.feedback;
              const score = randomQuestionData.score;
              const subject = randomQuestionData.subject;

              setRandomQuestion({
                question,
                answers,
                correctAnswer,
                feedback,
                score,
                subject,
                lastDisplayedQuestion: question,
              });
            } else {
              // Handle no available questions
            }
          }
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
        },
      });
    } catch (error) {
      console.error('Error fetching CSV:', error);
    }
  };

  const handleAnswerSelection = (answer) => {
    setSelectedAnswer(answer);
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) {
      alert('Please select an answer before submitting.');
      return;
    }

    const result = selectedAnswer === randomQuestion.correctAnswer ? 1 : 0;
    const updatedUserElo = updateRatings(elo, randomQuestion.score, result);

    setUserElo(updatedUserElo, () => {
      fetchData();
      setSelectedAnswer('');
      setShowFeedback(false);
      setAnswerSubmitted(false);
    });

    if (selectedAnswer === randomQuestion.correctAnswer) {
      setShowFeedback(`Good Job! Your new ELO: ${Math.floor(updatedUserElo)}`);
      setAnsweredQuestionsHistory((prev) => [...prev, randomQuestion.question]);
    } else {
      setShowFeedback('Wrong Answer: ' + randomQuestion.feedback);
    }
    setAnswerSubmitted(true);
  };

  const handleButtonClick = (type) => {
    switch (type) {
      case 'harder':
        setQuizSettings({ subject: 'Calculus', difficulty: "hard" });
        break;
      case 'easier':
        setQuizSettings({ subject: 'Calculus', difficulty: "easy" });
        break;
      case 'similar':
        setQuizSettings({ subject: 'Calculus', difficulty: "medium" });
        break;
      default:
        console.log('Unexpected type:', type);
        break;
    }

    fetchData();
    setSelectedAnswer('');
    setShowFeedback(false);
    setAnswerSubmitted(false);
  };

  return (
    <div className="container">
      {randomQuestion.question ? (
        <>
          <div className="question-container">
            <h1>{randomQuestion.question}</h1>
          </div>
          <div className="level-elo-container">
            <p>Level: {randomQuestion.score}</p>
            <p>Your ELO: {Math.floor(elo)}</p>
          </div>
  
          <div className="answers-container">
            {randomQuestion.answers.map((answer, index) => (
              <div
                key={index}
                className={`answer ${selectedAnswer === answer ? 'selected' : ''}`}
                onClick={() => handleAnswerSelection(answer)}
              >
                {answer}
              </div>
            ))}
          </div>
  
          {!answerSubmitted && (
            <div className="submit-container">
              <button className="submit-button" onClick={handleSubmitAnswer}>
                Submit Answer
              </button>
            </div>
          )}
  
          {showFeedback && (
            <div className="feedback">
              <p>{showFeedback}</p>
              <p className="center-elo">Your new ELO: {Math.floor(elo)}</p>
              <div className="center-buttons">
                <button onClick={() => handleButtonClick('harder')}>Harder Question</button>
                <button onClick={() => handleButtonClick('easier')}>Easier Question</button>
                <button onClick={() => handleButtonClick('similar')}>Similar Question</button>
              </div>
            </div>
          )}
  
          <p className="subject">Subject: {randomQuestion.subject}</p>
        </>
      ) : (
        <p>No questions available at the moment.</p>
      )}
    </div>
  );  
};

export default Question2;
