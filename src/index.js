import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./pages/Navbar";
import Home from "./pages/Home";
import Mathematics from "./Mathematics/Mathematics";
import Calculus from "./Mathematics/Calculus/Calculus";
import NoPage from "./pages/NoPage";
import LoginForm from './pages/LoginForm';
import Question from './pages/Question';
import LinearAlgebra  from "./Mathematics/LinearAlgebra/LinearAlgebra";
import DiscreteMath from "./Mathematics/DiscreteMath/DiscreteMath";
import Stats from "./Mathematics/Stats/Stats";
import SignupForm from './pages/SignupForm';
import Main from './pages/Main'

export default function App() {
  return (
      <BrowserRouter>
    <Routes>
        {/* Main Route */}
        <Route path="/" element={<Main />}/>
        <Route path="/login" element={<LoginForm />}/>
        <Route path="/signup" element={<SignupForm />}/>

        {/* Nested Routes under Home */}
        <Route path="/home" element={<Navbar />}>
            <Route index element={<Home />} />
            <Route path="math" element={<Mathematics />}/>
            <Route path="math/calculus" element={<Calculus />}/>
            <Route path="math/calculus/questions" element={<Question />} />
            <Route path="math/discreteMath" element={<DiscreteMath />} />
            <Route path="math/linearAlgebra" element={<LinearAlgebra />} />
            <Route path="math/statistics" element={<Stats />} />

            {/* Fallback for any other path */}
            <Route path="*" element={<NoPage />} />
        </Route>
    </Routes>
</BrowserRouter>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);