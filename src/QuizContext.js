import React, { createContext, useContext, useState } from 'react';

const QuizContext = createContext();

export const QuizProvider = ({ children }) => {
    const [quizSettings, setQuizSettings] = useState({
        subject: '',
        difficulty: ''
    });

    return (
        <QuizContext.Provider value={{ quizSettings, setQuizSettings }}>
            {children}
        </QuizContext.Provider>
    );
};

export const useQuizSettings = () => useContext(QuizContext);
