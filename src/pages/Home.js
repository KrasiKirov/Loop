import '../Home.css';
import { Helmet } from 'react-helmet';
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div>
        <Helmet>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/css/all.min.css" />
        </Helmet>
            <div className="home">
                <div className="home-header">
                    <h1>Choose your arena</h1>
                    <p>Four subjects. Adaptive difficulty. Pick where to compete.</p>
                </div>

                <div className="subject-grid">
                    <Link to="/home/math" className="subject-card" data-subject="math">
                        <i className="fas fa-square-root-alt subject-icon"></i>
                        <h5>Mathematics</h5>
                        <p>Explore the universe of numbers and patterns.</p>
                    </Link>
                    <Link to="/home/chemistry" className="subject-card" data-subject="chemistry">
                        <i className="fas fa-flask subject-icon"></i>
                        <h5>Chemistry</h5>
                        <p>Dive into the world of atoms and reactions.</p>
                    </Link>
                    <Link to="/home/physics" className="subject-card" data-subject="physics">
                        <i className="fas fa-atom subject-icon"></i>
                        <h5>Physics</h5>
                        <p>Unravel the mysteries of energy and matter.</p>
                    </Link>
                    <Link to="/home/biology" className="subject-card" data-subject="biology">
                        <i className="fas fa-dna subject-icon"></i>
                        <h5>Biology</h5>
                        <p>Discover the science of life and living organisms.</p>
                    </Link>
                </div>
            </div>
    </div>
);
};
  
export default Home;