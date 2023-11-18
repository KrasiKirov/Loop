import { Outlet, Link } from "react-router-dom";

const Navbar = () => {
  return (
    <>
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/math">Math</Link>
          </li>
          <li>
            <Link to="/contact">Contact</Link>
          </li>
          <li>
            <Link to="/Login">Login</Link>
          </li>
        </ul>
      </nav>

      <Outlet />
    </>
  )
};

export default Navbar;