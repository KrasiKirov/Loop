// App.js
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './pages/Navbar';
import Home from './pages/Home';
import Mathematics from './pages/Mathematics';
import Calculus1 from './pages/Calculus1';
import NoPage from './pages/NoPage';
import Question from './pages/Question2';
import NoQuestions from './pages/no-questions'; // Import the new component

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navbar />}>
          <Route index element={<Home />} />
          <Route path="math" element={<Mathematics />}>
            <Route path="calculus1" element={<Calculus1 />} />
          </Route>
          <Route path="Question" element={<Question />} />
          <Route path="no-questions" element={<NoQuestions />} /> {/* Add the new route */}
          <Route path="*" element={<NoPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
