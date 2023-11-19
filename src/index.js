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

export default function App() {
  return (
      <BrowserRouter>
    <Routes>
        {/* Main Route */}
        <Route path="/" element={<LoginForm />} />

        {/* Nested Routes under Home */}
        <Route path="home" element={<Navbar />}>
            <Route index element={<Home />} />
            <Route path="math" element={<Mathematics />}/>
            <Route path="math/calculus" element={<Calculus />}/>
            <Route path="math/calculus/questions" element={<Question />} />
            <Route path="math/discreteMath" element={<DiscreteMath />} />
            <Route path="math/linearAlgebra" element={<LinearAlgebra />} />
            <Route path="math/statistics" element={<Stats />} />
        </Route>

        {/* Fallback for any other path */}
        <Route path="*" element={<NoPage />} />
    </Routes>
</BrowserRouter>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);