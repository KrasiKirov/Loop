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
        <div className="container text-center py-5">
            <h1><span className="app-title">Bold.</span></h1>
            <p className="tagline">Test yourself. <i>Compete.</i></p>
            <p className="Explanation">Learning has never been so fun. Compete against yourself, your friends or the world! With Questions tailored for your level and personalized feedback, learning is a garanteed outcome.</p>
            <hr />
            <a className="btn">Get Started</a>
        </div>

        <div className="features-container">
        <Link to="/math">
            <div className="feature">
                <i className="fas fa-square-root-alt icon"></i>
                <h5>Mathematics</h5>
                <p>Explore the universe of numbers and patterns.</p>
            </div>
        </Link>
        <Link to="/chemistry">
            <div className="feature">
                <i className="fas fa-flask icon"></i>
                <h5>Chemistry</h5>
                <p>Dive into the world of atoms and reactions.</p>
            </div>
        </Link>
        <Link to="/physics">
            <div className="feature">
                <i className="fas fa-atom icon"></i>
                <h5>Physics</h5>
                <p>Unravel the mysteries of energy and matter.</p>
            </div>
        </Link>
        <Link to="/biology">
            <div className="feature">
                <i className="fas fa-dna icon"></i>
                <h5>Biology</h5>
                <p>Discover the science of life and living organisms.</p>
            </div>
        </Link>
        </div>
    </div>
);
};
  
export default Home;