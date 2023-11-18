import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import '../Navbar.css'; // Ensure this path is correct and loaded after Bootstrap CSS

function Navbar() {
  return (
    <div>
      <nav className="custom-navbar">
        <NavLink className="nav-item" to="/">Home</NavLink>
        <div className="nav-right">
          <NavLink className="nav-item" to="/login">Log In</NavLink>
          <NavLink className="nav-item" to="/score">Score</NavLink>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}

export default Navbar;