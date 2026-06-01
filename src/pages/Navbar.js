import React from 'react';
import { useUser } from '../UserContext';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import '../Navbar.css';

function Navbar() {
  const { user, setUser } = useUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    setUser({});
    navigate('/login');
  };

  return (
    <div>
      <nav className="navbar">
        <NavLink className="navbar-brand" to="/home">
          Bold<span className="brand-dot">.</span>
        </NavLink>

        <div className="navbar-right">
          {user && user.elo !== undefined && (
            <span className="navbar-elo">ELO {user.elo}</span>
          )}
          {user && user.username && (
            <span className="navbar-user">{user.username}</span>
          )}
          <button className="navbar-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </nav>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

export default Navbar;
