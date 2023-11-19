import './Physics.css';
import { Helmet } from 'react-helmet';
import { Outlet, Link } from "react-router-dom";


const Physics = () => {
  return (
    <div>
        <Helmet>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/css/all.min.css" />
        </Helmet>
        <div className="container text-center py-5">
            <h1><span className="app-title">Physics</span></h1>

        </div>

        <div className="features-container">
        <Link to="/home/physics/astrophysics">
            <div className="feature">
            <i class="fas fa-star icon"></i>
                <h5>Astrophysics</h5>
                <p>The properties and behavior of celestial bodies and the universe.</p>
            </div>
        </Link>
        <Link to="/home/physics/electromagnetics">
            <div className="feature">
            <i class="fas fa-bolt icon"></i>
                <h5>Electromagnetics</h5>
                <p>The study of interactions between electric and magnetic fields.</p>
            </div>
        </Link>
        <Link to="/home/physics/quantumMechanics">
            <div className="feature">
            <i class="fas fa-atom icon"></i>
                <h5>Quantum Mechanics</h5>
                <p>The study of the principles underlying the fundamental quantum theory of physics.</p>
            </div>
        </Link>
        <Link to="/home/physics/thermodynamics">
            <div className="feature">
            <i class="fas fa-lightbulb icon"></i>
                <h5>Thermodynamics</h5>
                <p>The analysis of principles governing the relationships between forms of energy.</p>
            </div>
        </Link>
        </div>
        <Outlet />
    </div>
    
);
};
  
export default Physics;