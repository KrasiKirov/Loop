import './Chemistry.css';
import { Helmet } from 'react-helmet';
import { Outlet, Link } from "react-router-dom";


const Chemistry = () => {
  return (
    <div>
        <Helmet>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/css/all.min.css" />
        </Helmet>
        <div className="container text-center py-5">
            <h1><span className="app-title">Chemistry</span></h1>

        </div>

        <div className="features-container">
        <Link to="/home/chemistry/biochemistry">
            <div className="feature">
             <i className="fas fa-leaf icon"></i>
                <h5>Biochemistry</h5>
                <p>The chemical processes and substances that occur in living organisms.</p>
            </div>
        </Link>
        <Link to="/home/chemistry/organicChemistry">
            <div className="feature">
                <i className="fas fa-dna icon"></i>
                <h5>Organic Chemistry</h5>
                <p>The study of carbon-containing compounds and their applications.</p>
            </div>
        </Link>
        <Link to="/home/chemistry/inorganicChemistry">
            <div className="feature">
            <i class="fas fa-atom icon"></i>
                <h5>Inorganic Chemistry</h5>
                <p>The study of compounds that lack carbon-hydrogen bonds.</p>
            </div>
        </Link>
        <Link to="/home/chemistry/analyticalChemistry">
            <div className="feature">
            <i className="fas fa-flask icon"></i>
                <h5>Analytical Chemistry</h5>
                <p>The analysis of the composition of matter through various techniques.</p>
            </div>
        </Link>
        </div>
        <Outlet />
    </div>
    
);
};
  
export default Chemistry;