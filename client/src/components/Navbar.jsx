import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">
        <span className="brand-icon">🔥</span>
        <span>
          Fitness<span className="brand-accent">Lite</span>
        </span>
      </NavLink>

      <div className="navbar-links">
        {isAuthenticated ? (
          <>
            <NavLink
              to="/"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              📊 Dashboard
            </NavLink>
            <NavLink
              to="/add-food"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              ➕ Add Food
            </NavLink>
            <button className="btn-logout" onClick={handleLogout}>
              🚪 Logout
            </button>
          </>
        ) : (
          <>
            <NavLink
              to="/login"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              Login
            </NavLink>
            <NavLink
              to="/register"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              Register
            </NavLink>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
