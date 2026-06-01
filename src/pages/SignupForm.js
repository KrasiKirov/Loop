import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './auth.css';
import { useUser } from '../AuthContext';

function SignupForm() {
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    const navigate = useNavigate();
    const { signup } = useUser();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await signup(name, username, password);
            navigate('/home');
        } catch (error) {
            setMessage(error.message || 'Signup failed');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-brand">Bold<span>.</span></div>
                <p className="auth-title">Create your account</p>
                {message && <p className="auth-message">{message}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="name">Name</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
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
                    <button type="submit" className="auth-button">Sign up</button>
                </form>
                <p className="auth-switch">
                    Already have an account? <Link to="/login">Log in</Link>
                </p>
            </div>
        </div>
    );
}

export default SignupForm;