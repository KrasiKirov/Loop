import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import '../Navbar.css'; // Ensure this path is correct and loaded after Bootstrap CSS

function Navbar() {
  return (
    <div>
      <nav className="custom-navbar">
        <NavLink className="nav-item" to="/home">Home</NavLink>
        <div className="nav-right">
        </div>
      </nav>
      <Outlet />
    </div>
  );
}

export default Navbar;