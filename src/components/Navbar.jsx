import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logoutVolunteer } from '../firebase/auth';
import { useToast } from '../context/ToastContext';

const Navbar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const toast = useToast();

  const handleLogout = async () => {
    await logoutVolunteer();
    toast('Logged out. See you soon! 👋', 'info');
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="inner">
        <Link to="/" className="logo" aria-label="iCanFlyConnect home">
          <span>🦋</span>
          <span>iCanFly<span style={{ color: 'var(--secondary)' }}>Connect</span></span>
        </Link>

        <ul className="nav-links">
          <li>
            <Link to="/request" className={isActive('/request')}>
              Get Help
            </Link>
          </li>

          {user ? (
            <>
              <li>
                <Link to="/dashboard" className={isActive('/dashboard')}>
                  Queue
                </Link>
              </li>
              <li>
                <Link to="/history" className={isActive('/history')}>
                  My History
                </Link>
              </li>
              <li>
                <button onClick={handleLogout} className="nav-links" style={{
                  background: 'none', color: 'var(--text-secondary)',
                  fontWeight: 700, padding: '0.5rem 1rem', borderRadius: '50px',
                  transition: 'all 0.25s'
                }}>
                  Sign Out
                </button>
              </li>
            </>
          ) : (
            <li>
              <Link to="/volunteer" className="nav-btn">
                Volunteer Login
              </Link>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
