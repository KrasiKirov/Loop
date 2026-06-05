import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import './Main.css';

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
                <h1 className="landing-title">Loop<span className="landing-dot">.</span></h1>
                <p className="landing-tagline">Drill the patterns. Climb the ranks.</p>
                <p className="landing-blurb">
                    Competitive, rated prep for coding interviews. Drill DSA patterns in
                    seconds, fix what you forget with spaced repetition, and duel your way
                    up the leaderboard.
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