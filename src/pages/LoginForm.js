import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './auth.css';
import { Link } from 'react-router-dom';
import { useUser } from '../UserContext';

function LoginForm() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    const navigate = useNavigate(); // Hook for navigation
    const { setUser } = useUser();
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Send a POST request to the server
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                const data = await response.json();
                setUser({ name: data.name, username: data.username, elo: data.elo });
                // Redirect to /home on successful login
                navigate('/home');
            } else {
                setMessage('Login failed');
            }
        } catch (error) {
            console.error('Error:', error);
            setMessage('An error occurred');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-brand">Bold<span>.</span></div>
                <p className="auth-title">Welcome back</p>
                {message && <p className="auth-message">{message}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="auth-button">Log in</button>
                </form>
                <p className="auth-switch">
                    New here? <Link to="/signup">Create an account</Link>
                </p>
            </div>
        </div>
    );
}

export default LoginForm;
