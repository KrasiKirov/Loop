import { Helmet } from 'react-helmet';
import { Link } from "react-router-dom";

const Calculus1 = () => {
  return (
    <div>
        <Helmet>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/css/all.min.css" />
        </Helmet>
        <div className="container text-center py-5">
            <p className="tagline">Level of Difficulty</p>
        </div>

        <div className="features-container">
        <Link to="/easy">
            <div className="feature">
                <h5>Easy</h5>
            </div>
        </Link>
        <Link to="/medium">
            <div className="feature">
                <h5>Medium</h5>
            </div>
        </Link>
        <Link to="/hard">
            <div className="feature">
                <h5>Hard</h5>   
            </div>
        </Link>
        </div>
    </div>
);
  };
  export default Calculus1;