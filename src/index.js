import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./pages/Navbar";
import Home from "./pages/Home";
import Mathematics from "./pages/Mathematics";
import Calculus1 from "./pages/Calculus1";
import NoPage from "./pages/NoPage";
import LoginForm from './pages/LoginForm';

export default function App() {
  return (
      <BrowserRouter>
          <Routes>
              {/* Main Route */}
              <Route path="/" element={<LoginForm />} />

              {/* Nested Routes under Home */}
              <Route path="home" element={<Navbar />}>
                  <Route index element={<Home />} />
                  <Route path="math" element={<Mathematics />}>
                      <Route path="calculus1" element={<Calculus1 />} />
                  </Route>
              </Route>

              {/* Fallback for any other path */}
              <Route path="*" element={<NoPage />} />
          </Routes>
      </BrowserRouter>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);