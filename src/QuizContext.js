import React, { createContext, useContext, useState } from 'react';

// Carries the active drill selection (which pattern + difficulty) between the
// pattern hub/page and the drill screen.
const QuizContext = createContext();

export const QuizProvider = ({ children }) => {
  const [quizSettings, setQuizSettings] = useState({ pattern: '', difficulty: '' });

  return (
    <QuizContext.Provider value={{ quizSettings, setQuizSettings }}>
      {children}
    </QuizContext.Provider>
  );
};

export const useQuizSettings = () => useContext(QuizContext);
