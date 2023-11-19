import './Biology.css';
import { Helmet } from 'react-helmet';
import { Outlet, Link } from "react-router-dom";


const Biology = () => {
  return (
    <div>
        <Helmet>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/css/all.min.css" />
        </Helmet>
        <div className="container text-center py-5">
            <h1><span className="app-title">Biology</span></h1>

        </div>

        <div className="features-container">
        <Link to="/home/biology/anatomy">
            <div className="feature">
            
            <i class="fas fa-brain icon"></i>
                <h5>Anatomy</h5>
                <p>The strucutre and organization of living organisms.</p>
            </div>
        </Link>
        <Link to="/home/biology/microbiology">
            <div className="feature">
            <i class="fas fa-microchip icon"></i>
                <h5>Microbiology</h5>
                <p>The study of microscopic organisms.</p>
            </div>
        </Link>
        <Link to="/home/biology/molecularBiology">
            <div className="feature">
            <i class="fas fa-atom icon"></i>
                <h5>Molecular Biology</h5>
                <p>The study of molecular mechanisms necessary to life.</p>
            </div>
        </Link>
        <Link to="/home/biology/physiology">
            <div className="feature">
            <i class="fas fa-user icon"></i>
                <h5>Physiology</h5>
                <p>The analysis of functions and activities of living organisms and their response to environmental stimuli.</p>
            </div>
        </Link>
        </div>
        <Outlet />
    </div>
    
);
};
  
export default Biology;