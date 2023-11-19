import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../LoginForm.css';
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
            const response = await fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                setUser({ name: response.name, username: response.username, elo: response.elo });
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
        <div className="login-container">
            <div className="login-form">
                <h2>Login</h2>
                {message && <p className="login-message">{message}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="username"
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
                    <button type="submit" className="login-button">Login</button>
                </form>
            </div>
        </div>
    );
}

export default LoginForm;
