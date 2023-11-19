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
  //const [userElo, setUserElo] = useState(user.elo);
  const [answerSubmitted, setAnswerSubmitted] = useState(false); // New state
  const [lastDisplayedQuestion, setLastDisplayedQuestion] = useState('');
  const [multiplier, setMultiplier] = useState(0.2);
  const [lowerBound, setLowerBound] = useState(elo - elo * multiplier);
  const [higherBound, setHigherBound] = useState(elo + elo * multiplier);
  const [answeredQuestionsHistory, setAnsweredQuestionsHistory] = useState([]);
  const { quizSettings } = useQuizSettings();
  const { difficulty, subject } = quizSettings;
 

  console.log(difficulty);
  console.log("Subject: " + subject);

useEffect(() => {
 // setInitialBounds(difficulty);
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

  console.log("Difficulty: " + difficulty)
  setInitialBounds(difficulty,elo );
  console.log("Lowerbound: " + lowerBound)
  console.log("UpperBound: " + higherBound)
  // Fetch and parse CSV data
  try {
    const response = await fetch('/CodeJam.csv');
    const csvData = await response.text();

    Papa.parse(csvData, {
      header: true,
      dynamicTyping: true,
      complete: (result) => {
        if (result.data && result.data.length > 0) {
          // Filter questions within the updated score range, matching subject
          const filteredQuestions = result.data.filter(
            (item) =>
              item.score >= lowerBound &&
              item.score <= higherBound &&
              item.subject === subject // Check if the subject matches
          );

          if (filteredQuestions.length > 0) {
            let randomIndex;

            // Keep trying until a new question is selected
            do {
              // Randomly select a question from the filtered list
              randomIndex = Math.floor(Math.random() * filteredQuestions.length);
            } while (
              filteredQuestions[randomIndex].question === lastDisplayedQuestion
            );

            const randomQuestionData = filteredQuestions[randomIndex];

            // Extract question, answers, correct answer, feedback, score, and subject from CSV data
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
            const subject = randomQuestionData.subject; // Added subject

            setRandomQuestion((prev) => ({
              ...prev,
              question,
              answers,
              correctAnswer,
              feedback,
              score,
              subject,
              lastDisplayedQuestion: question, // Update lastDisplayedQuestion
            }));
          } else {
            // No available questions
            // navigate('/home/no-questions');
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

    // Check if an answer is selected
    if (!selectedAnswer) {
      alert('Please select an answer before submitting.');
      return;
    }
  
    // Calculate the new ELO based on the result (1 for correct, 0 for incorrect)
    const result = selectedAnswer === randomQuestion.correctAnswer ? 1 : 0;
    const updatedUserElo = updateRatings(elo, randomQuestion.score, result);
  
    // Update the user's ELO
    setUserElo(updatedUserElo);
  
    // Display feedback along with the new ELO
    if (selectedAnswer === randomQuestion.correctAnswer) {
      // Correct answer
      setShowFeedback(`Good Job! Your new ELO: ${Math.floor(updatedUserElo)}`);
  
      // Add the answered question to the history
      setAnsweredQuestionsHistory((prev) => [...prev, randomQuestion.question]);
    } else {
      // Incorrect answer
      setShowFeedback('Wrong Answer: ' + randomQuestion.feedback);
    }
    setAnswerSubmitted(true);
  };
  
  
  const handleButtonClick = (type) => {
    console.log('Button Clicked - Type:', type);
  
    switch (type) {
      case 'harder':
        // Increase difficulty by multiplying the current score by 1.2
        setQuizSettings({ subject: 'Calculus', difficulty: "hard" });
        break;
      case 'easier':
        // Decrease difficulty by multiplying the current score by 0.9
        setQuizSettings({ subject: 'Calculus', difficulty: "easy" });
        break;
      case 'similar':
        setQuizSettings({ subject: 'Calculus', difficulty: "medium" });
        break;
      default:
        console.log('Unexpected type:', type);
        break;
    }
  
   
    //setInitialBounds(difficulty)
    // Fetch a new question
    fetchData();
  
    // Reset state for the new question
    setSelectedAnswer('');
    setShowFeedback(false);
    setAnswerSubmitted(false); // Reset answerSubmitted to false
  };
  

  return (
    <div className="container">
      {randomQuestion.question ? (
        <>
          <h1>{randomQuestion.question}</h1>
          <p>{"Level: " + randomQuestion.score + ". Your ELO is: " + Math.floor(elo)}</p>
  
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
            <button className="submit-button" onClick={handleSubmitAnswer}>
              Submit Answer
            </button>
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
  
          <p className="score">Subject: {randomQuestion.subject}</p>
        </>
      ) : (
        <p>No questions available at the moment.</p>
      )}
    </div>
  );
  
};

export default Question2;