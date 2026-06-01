import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import '../Main.css';

function Main() {
    const navigate = useNavigate();

    return (
        <div className="landing">
        <Helmet>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </Helmet>
            <div className="landing-glow" />
            <div className="landing-content">
                <h1 className="landing-title">Bold<span className="landing-dot">.</span></h1>
                <p className="landing-tagline">Test yourself. Compete.</p>
                <p className="landing-blurb">
                    Adaptive practice that meets you at your level. Every question is
                    matched to your ELO, with instant feedback that pushes you forward.
                </p>
                <div className="landing-actions">
                    <button onClick={() => navigate('/signup')} className="btn btn-primary">Get started</button>
                    <button onClick={() => navigate('/login')} className="btn btn-ghost">Log in</button>
                </div>
            </div>
        </div>
    );
}

export default Main;