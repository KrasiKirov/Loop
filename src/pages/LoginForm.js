import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './auth.css';
import { Link } from 'react-router-dom';
import { useUser } from '../context/AuthContext';

function LoginForm() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const navigate = useNavigate(); // Hook for navigation
    const { login } = useUser();
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setMessage('');
        setSubmitting(true);
        try {
            await login(username, password);
            navigate('/home');
        } catch (error) {
            setMessage(error.message || 'Login failed');
            setSubmitting(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-brand">Loop<span>.</span></div>
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
                    <button type="submit" className="auth-button" disabled={submitting}>
                        {submitting ? 'Logging in…' : 'Log in'}
                    </button>
                </form>
                <p className="auth-switch">
                    New here? <Link to="/signup">Create an account</Link>
                </p>
            </div>
        </div>
    );
}

export default LoginForm;
