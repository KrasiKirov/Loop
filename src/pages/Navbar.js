import React from 'react';
import { useUser } from '../UserContext';
import { NavLink, Outlet } from 'react-router-dom';
import '../Navbar.css'; 

function Navbar() {

  const { user } = useUser();

  return (
    <div>
      <nav className="custom-navbar">
        <NavLink className="nav-item" to="/home">Home</NavLink>
        <div className="nav-item">{user ? user.username : 'Log in'}</div>
        <div className="nav-right">
        </div>
      </nav>
      <Outlet />
    </div>
  );
}

export default Navbar;
