import { UserProvider } from './UserContext';
import { QuizProvider } from './QuizContext';
// App.js

import Question2 from './pages/Question2';
import NoQuestions from './pages/no-questions'; // Import the new component


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

import Biology from "./Biology/Biology";
import Microbiology from "./Biology/Microbiology/microbiology";
import Anatomy from "./Biology/Anatomy/anatomy";
import MolecularBiology from "./Biology/MolecularBiology/molecular";
import Physiology from "./Biology/Physiology/physiology";

import Chemistry from "./Chemistry/Chemistry";
import AnalyticalChemistry from "./Chemistry/Analytical/analytical";
import Biochemistry from "./Chemistry/Biochemistry/biochemistry";
import InorganicChemistry from "./Chemistry/Inorganic/inorganic";
import OrganicChemistry from "./Chemistry/Organic/organic";

import Physics from "./Physics/Physics";
import Astrophysics from "./Physics/Astrophysics/astrophysics";
import Electromagnetics from "./Physics/Electromagnetics/electromagnetics";
import QuantumMechanics from "./Physics/QuantumMechanics/quantummechanics";
import Thermodynamics from "./Physics/Thermodynamics/thermodynamics";



export default function App() {
  return (
    <QuizProvider>
    <UserProvider>
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

        
            <Route path="biology" element={<Biology />}/>
            <Route path="biology/anatomy" element={<Anatomy/>}/>
            <Route path="biology/microbiology" element={<Microbiology />} />
            <Route path="biology/molecularBiology" element={<MolecularBiology />} />
            <Route path="biology/physiology" element={<Physiology />} />

           
            <Route path="chemistry" element={<Chemistry />}/>
            <Route path="chemistry/analyticalChemistry" element={<AnalyticalChemistry />}/>
            <Route path="chemistry/biochemistry" element={<Biochemistry />} />
            <Route path="chemistry/organicChemistry" element={<OrganicChemistry/>} />
            <Route path="chemistry/inorganicChemistry" element={<InorganicChemistry />} />

            
            <Route path="physics" element={<Physics />}/>
            <Route path="physics/astrophysics" element={<Astrophysics />} />
            <Route path="physics/electromagnetics" element={<Electromagnetics />} />
            <Route path="physics/quantumMechanics" element={<QuantumMechanics />} />
            <Route path="physics/thermodynamics" element={<Thermodynamics />} />
              
             <Route path="Question2" element={<Question2 />} />
             <Route path="no-questions" element={<NoQuestions />} /> {/* Add the new route */}

            {/* Fallback for any other path */}
            <Route path="*" element={<NoPage />} />
        </Route>
    </Routes>
</BrowserRouter>
</UserProvider>
</QuizProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
