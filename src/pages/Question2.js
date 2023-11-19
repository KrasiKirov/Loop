import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import '../Question2.css'; // Import the CSS file
import { updateRatings } from './elo';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useQuizSettings } from '../QuizContext';
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
  const [userElo, setUserElo] = useState(user.elo);
  const [answerSubmitted, setAnswerSubmitted] = useState(false); // New state
  const [lastDisplayedQuestion, setLastDisplayedQuestion] = useState('');
  const [multiplier, setMultiplier] = useState(0.2);
  const [lowerBound, setLowerBound] = useState(userElo - userElo * multiplier);
  const [higherBound, setHigherBound] = useState(userElo + userElo * multiplier);
  const [answeredQuestionsHistory, setAnsweredQuestionsHistory] = useState([]);

  const { quizSettings } = useQuizSettings();
  const { difficulty, subject } = quizSettings;

  console.log(difficulty);
  console.log("Subject: " + subject);
  setInitialBounds(difficulty);
 useEffect(() => {
    // Set initial bounds based on difficulty level
    setInitialBounds(difficulty);
    console.log("LowerBound: " + lowerBound)
    console.log("HigherBound: " + higherBound)
    fetchData(csvFile);
  
}, [csvFile, difficulty]);

const setInitialBounds = (difficulty) => {
  switch (difficulty) {
    case 'easy':
      setLowerBound(userElo - Math.round(userElo * 2 * multiplier));
      setHigherBound(userElo);
      break;
    case 'medium':
      setLowerBound(Math.round(userElo - userElo * multiplier));
      setHigherBound(Math.round(userElo + userElo * multiplier));
      break;
    case 'hard':
      setLowerBound(userElo);
      setHigherBound(Math.round(userElo + userElo * multiplier * 2));
      break;
    default:
      break;
  }
};




const fetchData = async () => {
  console.log("Lower Bound: " + lowerBound)
  console.log("Upper Bound: " + higherBound)
  // Fetch and parse CSV data
  try {
    const response = await fetch('/CodeJam.csv');
    const csvData = await response.text();

    Papa.parse(csvData, {
      header: true,
      dynamicTyping: true,
      complete: (result) => {
        if (result.data && result.data.length > 0) {
          // Filter questions within the updated score range, matching subject,
          // and not in the answered questions history
          const filteredQuestions = result.data.filter(
            (item) =>
              item.score >= lowerBound &&
              item.score <= higherBound &&
              !answeredQuestionsHistory.includes(item.question) &&
              item.subject === subject // Check if the subject matches
          );

          if (filteredQuestions.length > 0) {
            let randomIndex;
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

    // Check if the question was already answered correctly in the last 24 hours
    if (answeredQuestionsHistory.includes(randomQuestion.question)) {
      alert('You already answered this question correctly in the last 24 hours.');
      return;
    }

    // Calculate the new ELO based on the result (1 for correct, 0 for incorrect)
    const result = selectedAnswer === randomQuestion.correctAnswer ? 1 : 0;
    const updatedUserElo = updateRatings(userElo, randomQuestion.score, result);

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
 

    switch (type) {
      case 'harder':
        // Increase difficulty by multiplying the current score by 1.2
        setQuizSettings({ subject: 'Calculus', difficulty: "hard" });
        break;
      case 'easier':
        setQuizSettings({ subject: 'Calculus', difficulty: "easy" });
        break;
      case 'similar':
        setQuizSettings({ subject: 'Calculus', difficulty: "medium" });
        break;
      default:
        break;
    }


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
          <p>{"Level: " + randomQuestion.score + ". Your ELO is: " + Math.floor(userElo)}</p>
  
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
              <p className="center-elo">Your new ELO: {Math.floor(userElo)}</p>
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