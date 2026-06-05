import './theme.css';
import { UserProvider } from './AuthContext';
import { QuizProvider } from './QuizContext';

import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Navbar from './pages/Navbar';
import Main from './pages/Main';
import LoginForm from './pages/LoginForm';
import SignupForm from './pages/SignupForm';
import NoPage from './pages/NoPage';
import PrivateRoute from './components/PrivateRoute';

import PatternHub from './pages/PatternHub';
import PatternPage from './pages/PatternPage';
import Drill from './pages/Drill';
import Review from './pages/Review';
import DuelCreate from './pages/DuelCreate';
import DuelPlay from './pages/DuelPlay';
import DuelResult from './pages/DuelResult';

export default function App() {
  return (
    <QuizProvider>
      <UserProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Main />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/signup" element={<SignupForm />} />

            {/* Protected — auth guard then Navbar layout */}
            <Route element={<PrivateRoute />}>
              <Route element={<Navbar />}>
                <Route path="/home" element={<PatternHub />} />
                <Route path="/home/pattern/:slug" element={<PatternPage />} />
                <Route path="/home/drill" element={<Drill />} />
                <Route path="/home/review" element={<Review />} />
                <Route path="/home/duel" element={<DuelCreate />} />
                <Route path="/home/duel/:id" element={<DuelResult />} />
                <Route path="/home/duel/:id/play" element={<DuelPlay />} />
              </Route>
            </Route>

            <Route path="*" element={<NoPage />} />
          </Routes>
        </BrowserRouter>
      </UserProvider>
    </QuizProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
