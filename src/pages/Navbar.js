import React from 'react';
import { useUser } from '../AuthContext';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import '../Navbar.css';

function Navbar() {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div>
      <nav className="navbar">
        <NavLink className="navbar-brand" to="/home">
          Bold<span className="brand-dot">.</span>
        </NavLink>

        <div className="navbar-right">
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
