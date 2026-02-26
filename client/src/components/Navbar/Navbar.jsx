import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isAdmin } from '../../utils/roles';
import logo from '../../photo/AZ-Logo.svg';
import './Navbar.scss';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Schließe Dropdown beim Klick außerhalb
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
    setDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  return (
    <nav className="navbar">
      <div className="navbar-container container">
        <Link to="/" className="navbar-brand">
          <img src={logo} alt="az-handy.berlin Logo" className="navbar-logo" />
        </Link>
        <ul className="navbar-nav">
          {user ? (
            <>
              <li>
                <Link to="/" className="navbar-link">
                  News
                </Link>
              </li>
              {isAdmin(user) && (
                <li>
                  <Link to="/imeis" className="navbar-link">
                    IMEIs
                  </Link>
                </li>
              )}
              <li>
                <Link to="/dashboard" className="navbar-link">
                  Dashboard 
                </Link>
              </li>
              <li className="navbar-avatar-container" ref={dropdownRef}>
                <button
                  onClick={toggleDropdown}
                  className="navbar-avatar-btn"
                  aria-label="Benutzermenü"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="navbar-avatar-image"
                    />
                  ) : (
                    <div className="navbar-avatar-placeholder">
                      {getInitials(user.name)}
                    </div>
                  )}
                </button>
                {dropdownOpen && (
                  <div className="navbar-dropdown">
                    <div className="navbar-dropdown-header">
                      <div className="navbar-dropdown-user-info">
                        <div className="navbar-dropdown-name">{user.name}</div>
                        <div className="navbar-dropdown-email">{user.email}</div>
                      </div>
                    </div>
                    <Link
                      to="/settings"
                      className="navbar-dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <span className="navbar-dropdown-icon">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M8 1.5V3M8 13V14.5M14.5 8H13M3 8H1.5M12.8995 3.10051L11.8995 4.10051M4.10051 11.8995L3.10051 12.8995M12.8995 12.8995L11.8995 11.8995M4.10051 4.10051L3.10051 3.10051" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      Einstellungen
                    </Link>
                    <div className="navbar-dropdown-divider"></div>
                    <button
                      onClick={handleLogout}
                      className="navbar-dropdown-item navbar-dropdown-item--danger"
                    >
                      <span className="navbar-dropdown-icon">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2H6M10 11L14 7M14 7L10 3M14 7H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      Abmelden
                    </button>
                  </div>
                )}
              </li>
            </>
          ) : (
            <>
              <li>
                <Link to="/login" className="btn btn--primary btn--small">
                  Anmelden
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;