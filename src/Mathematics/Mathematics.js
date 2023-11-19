import './Math.css';
import { Helmet } from 'react-helmet';
import { Outlet, Link } from "react-router-dom";


const Mathematics = () => {
  return (
    <div>
        <Helmet>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/css/all.min.css" />
        </Helmet>
        <div className="container text-center py-5">
            <h1><span className="app-title">Mathematics</span></h1>

        </div>

        <div className="features-container">
        <Link to="/math/discreteMath">
            <div className="feature">
                <i className="fas fa-plus icon"></i>
                <h5>Discrete Mathematics</h5>
                <p>From simple number theory to complex discrete mathematics.</p>
            </div>
        </Link>
        <Link to="/math/calculus">
            <div className="feature">
                <i className="fas fa-calculator icon"></i>
                <h5>Calculus</h5>
                <p>From single variable limits to multivariable and vector calculus.</p>
            </div>
        </Link>
        <Link to="/math/linearAlgebra">
            <div className="feature">
                <i className="fas fa-equals icon"></i>
                <h5>Linear Algebra</h5>
                <p>From vectors to abstract and complex linear algebra.</p>
            </div>
        </Link>
        <Link to="/math/statistics">
            <div className="feature">
                <i className="fas fa-dice icon"></i>
                <h5>Statistics and Probability</h5>
                <p>From elementary statistical tools to advanced probabilities and statistical methods.</p>
            </div>
        </Link>
        </div>
        <Outlet />
    </div>
    
);
};
  
export default Mathematics;