import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import '../Main.css';
import '../Home.css';

function Main() {
    const navigate = useNavigate();

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
        </div>
            <div className="buttons-container">
                <button onClick={() => navigate('/login')} className="btn btn-primary">Login</button>
                <button onClick={() => navigate('/signup')} className="btn btn-secondary">Sign Up</button>
            </div>
        </div>
    );
}

export default Main;