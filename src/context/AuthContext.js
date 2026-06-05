import React, { createContext, useState, useContext } from 'react';
import { setTokens, clearAuth } from '../api/client';

const AuthContext = createContext(null);
export const useUser = () => useContext(AuthContext);

const API_URL = process.env.REACT_APP_API_URL;

export const UserProvider = ({ children }) => {
  const [user, setUserState] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const persistUser = (u) => {
    setUserState(u);
    if (u && u.username) localStorage.setItem('user', JSON.stringify(u));
    else localStorage.removeItem('user');
  };

  const login = async (username, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error('Invalid username or password');
    const data = await res.json();
    setTokens(data);
    persistUser(data.user);
    return data.user;
  };

  const signup = async (name, username, password) => {
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, password }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || 'Signup failed');
    }
    const data = await res.json();
    setTokens(data);
    persistUser(data.user);
    return data.user;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
    clearAuth();
    persistUser({});
  };

  return (
    <AuthContext.Provider value={{ user, setUser: persistUser, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
