import '../Home.css';
import { Helmet } from 'react-helmet';

const Home = () => {
  return (
    <div>
        <Helmet>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/css/all.min.css" />
        </Helmet>
        <div className="container text-center py-5">
            <h1><span className="app-title">Bold</span></h1>
            <p className="tagline">Test yourself.</p>
            <hr />
            <p className="description">Compete.</p>
            <a className="btn">Get Started</a>
        </div>

        <div className="features-container">
            <div className="feature">
                <i>ICON</i>
                <h5>Mathematics</h5>
                <p>DESCRIPTION</p>
            </div>
            <div className="feature">
                <i> ICON</i>
                <h5>Chemistry</h5>
                <p>DESCRIPTION</p>
            </div>
            <div className="feature">
                <i>ICON</i>
                <h5>Physics</h5>
                <p>DESCRIPTION</p>
            </div>
            <div className="feature">
            <i>ICON</i>
            <h5>Biology</h5>
            <p>DESCRIPTION</p>
        </div>
        </div>
    </div>
);
};
  
  export default Home;