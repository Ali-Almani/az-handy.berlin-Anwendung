import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { canAccessImeis, canAccessDashboard, isAdmin } from '../../utils/roles';
import logo from '../../photo/AZ-Logo.svg';
import './Navbar.scss';

const Navbar = ({
  hasReminderBadge = false,
  reminderCount = 0,
  onOpenVerlauf,
  hasExtraCopyBadge = false,
  extraCopyCount = 0,
  onOpenExtraCopyModal,
  hasExtraCopyResultBadge = false,
  extraCopyResultCount = 0,
  onOpenExtraCopyResultModal,
  hasReminderResponseBadge = false,
  reminderResponseCount = 0,
  onOpenReminderResponseModal
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const mobileHeaderDropdownRef = useRef(null);

  // Schließe Dropdown beim Klick außerhalb
  useEffect(() => {
    const handleClickOutside = (event) => {
      const outsideDesktop = !dropdownRef.current?.contains(event.target);
      const outsideMobileHeader = !mobileHeaderDropdownRef.current?.contains(event.target);
      if (outsideDesktop && outsideMobileHeader) {
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

  // Schließe Mobile-Menü bei Resize zu Desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 992) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Body-Scroll sperren wenn Mobile-Menü offen
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
    setDropdownOpen(false);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleOpenVerlauf = () => {
    onOpenVerlauf?.();
    setDropdownOpen(false);
  };

  const handleOpenExtraCopyModal = () => {
    onOpenExtraCopyModal?.();
    setDropdownOpen(false);
  };

  const handleOpenExtraCopyResultModal = () => {
    onOpenExtraCopyResultModal?.();
    setDropdownOpen(false);
  };

  const handleOpenReminderResponseModal = () => {
    onOpenReminderResponseModal?.();
    setDropdownOpen(false);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const navLinks = (
    <>
      {canAccessImeis(user) && (
        <li>
          <Link to="/imeis" className="navbar-link" onClick={closeMobileMenu}>IMEIs</Link>
        </li>
      )}
      {user && !isAdmin(user) && (
        <li>
          <Link to="/archiv-anweisung" className="navbar-link" onClick={closeMobileMenu}>Archiv Anweisung</Link>
        </li>
      )}
      {canAccessDashboard(user) && (
        <li>
          <Link to="/dashboard" className="navbar-link" onClick={closeMobileMenu}>Dashboard</Link>
        </li>
      )}
    </>
  );

  return (
    <nav className="navbar">
      <div className="navbar-container container">
        <Link to="/" className="navbar-brand" onClick={closeMobileMenu}>
          <img src={logo} alt="az-handy.berlin Logo" className="navbar-logo" />
        </Link>
        <ul className="navbar-nav">
          {user ? (
            <>
              {navLinks}
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
                  {hasReminderBadge && (
                    <span
                      className="navbar-avatar-badge"
                      title="Erinnerung: Verlauf prüfen – Klicken zum Öffnen"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleOpenVerlauf(); }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenVerlauf(); } }}
                    >
                      {reminderCount > 9 ? '9+' : reminderCount}
                    </span>
                  )}
                  {hasExtraCopyBadge && (
                    <span
                      className="navbar-avatar-badge navbar-avatar-badge--extra"
                      title="Anfragen für Extra-Kopie – Klicken zum Öffnen"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleOpenExtraCopyModal(); }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenExtraCopyModal(); } }}
                    >
                      {extraCopyCount > 9 ? '9+' : extraCopyCount}
                    </span>
                  )}
                  {hasExtraCopyResultBadge && (
                    <span
                      className="navbar-avatar-badge navbar-avatar-badge--result"
                      title="Benachrichtigung: Extra-Kopie-Anfrage – Klicken zum Öffnen"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleOpenExtraCopyResultModal(); }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenExtraCopyResultModal(); } }}
                    >
                      {extraCopyResultCount > 9 ? '9+' : extraCopyResultCount}
                    </span>
                  )}
                  {hasReminderResponseBadge && (
                    <span
                      className="navbar-avatar-badge navbar-avatar-badge--reminder-response"
                      title="Erinnerung beantwortet – Klicken zum Öffnen"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleOpenReminderResponseModal(); }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenReminderResponseModal(); } }}
                    >
                      {reminderResponseCount > 9 ? '9+' : reminderResponseCount}
                    </span>
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
                    {hasReminderBadge && onOpenVerlauf && (
                      <button
                        type="button"
                        className="navbar-dropdown-item navbar-dropdown-item--reminder"
                        onClick={handleOpenVerlauf}
                      >
                        <span className="navbar-avatar-badge navbar-avatar-badge--small">{reminderCount > 9 ? '9+' : reminderCount}</span>
                        <span>Verlauf prüfen</span>
                      </button>
                    )}
                    {hasExtraCopyBadge && onOpenExtraCopyModal && (
                      <button
                        type="button"
                        className="navbar-dropdown-item navbar-dropdown-item--reminder"
                        onClick={handleOpenExtraCopyModal}
                      >
                        <span className="navbar-avatar-badge navbar-avatar-badge--small">{extraCopyCount > 9 ? '9+' : extraCopyCount}</span>
                        <span>Extra-Kopie-Anfragen</span>
                      </button>
                    )}
                    {hasExtraCopyResultBadge && onOpenExtraCopyResultModal && (
                      <button
                        type="button"
                        className="navbar-dropdown-item navbar-dropdown-item--reminder"
                        onClick={handleOpenExtraCopyResultModal}
                      >
                        <span className="navbar-avatar-badge navbar-avatar-badge--small">{extraCopyResultCount > 9 ? '9+' : extraCopyResultCount}</span>
                        <span>Benachrichtigung: Extra-Kopie</span>
                      </button>
                    )}
                    {hasReminderResponseBadge && onOpenReminderResponseModal && (
                      <button
                        type="button"
                        className="navbar-dropdown-item navbar-dropdown-item--reminder"
                        onClick={handleOpenReminderResponseModal}
                      >
                        <span className="navbar-avatar-badge navbar-avatar-badge--small">{reminderResponseCount > 9 ? '9+' : reminderResponseCount}</span>
                        <span>Erinnerung beantwortet</span>
                      </button>
                    )}
                    <Link
                      to="/dokumentation"
                      className="navbar-dropdown-item"
                      onClick={() => { setDropdownOpen(false); closeMobileMenu(); }}
                    >
                      <span className="navbar-dropdown-icon">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 3h12v10H2V3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      Dokumentation
                    </Link>
                    <Link
                      to="/settings"
                      className="navbar-dropdown-item"
                      onClick={() => { setDropdownOpen(false); closeMobileMenu(); }}
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
        <div className="navbar-mobile-right">
          {user ? (
            <div className="navbar-avatar-container" ref={mobileHeaderDropdownRef}>
              <button onClick={toggleDropdown} className="navbar-avatar-btn" aria-label="Benutzermenü">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="navbar-avatar-image" />
                ) : (
                  <div className="navbar-avatar-placeholder">{getInitials(user.name)}</div>
                )}
                {hasReminderBadge && (
                  <span className="navbar-avatar-badge" title="Erinnerung: Verlauf prüfen" onClick={(e) => { e.stopPropagation(); handleOpenVerlauf(); }} role="button" tabIndex={0}>
                    {reminderCount > 9 ? '9+' : reminderCount}
                  </span>
                )}
                {hasExtraCopyBadge && (
                  <span className="navbar-avatar-badge navbar-avatar-badge--extra" onClick={(e) => { e.stopPropagation(); handleOpenExtraCopyModal(); }} role="button" tabIndex={0}>
                    {extraCopyCount > 9 ? '9+' : extraCopyCount}
                  </span>
                )}
                {hasExtraCopyResultBadge && (
                  <span className="navbar-avatar-badge navbar-avatar-badge--result" onClick={(e) => { e.stopPropagation(); handleOpenExtraCopyResultModal(); }} role="button" tabIndex={0}>
                    {extraCopyResultCount > 9 ? '9+' : extraCopyResultCount}
                  </span>
                )}
                {hasReminderResponseBadge && (
                  <span className="navbar-avatar-badge navbar-avatar-badge--reminder-response" onClick={(e) => { e.stopPropagation(); handleOpenReminderResponseModal(); }} role="button" tabIndex={0}>
                    {reminderResponseCount > 9 ? '9+' : reminderResponseCount}
                  </span>
                )}
              </button>
              {dropdownOpen && (
                <div className="navbar-dropdown navbar-dropdown--header">
                  <div className="navbar-dropdown-header">
                    <div className="navbar-dropdown-user-info">
                      <div className="navbar-dropdown-name">{user.name}</div>
                      <div className="navbar-dropdown-email">{user.email}</div>
                    </div>
                  </div>
                  {hasReminderBadge && onOpenVerlauf && (
                    <button type="button" className="navbar-dropdown-item navbar-dropdown-item--reminder" onClick={handleOpenVerlauf}>
                      <span className="navbar-avatar-badge navbar-avatar-badge--small">{reminderCount > 9 ? '9+' : reminderCount}</span>
                      <span>Verlauf prüfen</span>
                    </button>
                  )}
                  {hasExtraCopyBadge && onOpenExtraCopyModal && (
                    <button type="button" className="navbar-dropdown-item navbar-dropdown-item--reminder" onClick={handleOpenExtraCopyModal}>
                      <span className="navbar-avatar-badge navbar-avatar-badge--small">{extraCopyCount > 9 ? '9+' : extraCopyCount}</span>
                      <span>Extra-Kopie-Anfragen</span>
                    </button>
                  )}
                  {hasExtraCopyResultBadge && onOpenExtraCopyResultModal && (
                    <button type="button" className="navbar-dropdown-item navbar-dropdown-item--reminder" onClick={handleOpenExtraCopyResultModal}>
                      <span className="navbar-avatar-badge navbar-avatar-badge--small">{extraCopyResultCount > 9 ? '9+' : extraCopyResultCount}</span>
                      <span>Benachrichtigung: Extra-Kopie</span>
                    </button>
                  )}
                  {hasReminderResponseBadge && onOpenReminderResponseModal && (
                    <button type="button" className="navbar-dropdown-item navbar-dropdown-item--reminder" onClick={handleOpenReminderResponseModal}>
                      <span className="navbar-avatar-badge navbar-avatar-badge--small">{reminderResponseCount > 9 ? '9+' : reminderResponseCount}</span>
                      <span>Erinnerung beantwortet</span>
                    </button>
                  )}
                  <Link to="/dokumentation" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
                    <span className="navbar-dropdown-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3h12v10H2V3z" stroke="currentColor" strokeWidth="1.5"/><path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.5"/></svg></span>
                    Dokumentation
                  </Link>
                  <Link to="/settings" className="navbar-dropdown-item" onClick={() => setDropdownOpen(false)}>
                    <span className="navbar-dropdown-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M8 1.5V3M8 13V14.5M14.5 8H13M3 8H1.5" stroke="currentColor" strokeWidth="1.5"/></svg></span>
                    Einstellungen
                  </Link>
                  <div className="navbar-dropdown-divider" />
                  <button onClick={handleLogout} className="navbar-dropdown-item navbar-dropdown-item--danger">
                    <span className="navbar-dropdown-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2H6M10 11L14 7M14 7L10 3M14 7H6" stroke="currentColor" strokeWidth="1.5"/></svg></span>
                    Abmelden
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn--primary btn--small" onClick={closeMobileMenu}>
              Anmelden
            </Link>
          )}
          <button
            type="button"
            className="navbar-hamburger"
            onClick={toggleMobileMenu}
            aria-label="Menü öffnen"
            aria-expanded={mobileMenuOpen}
          >
            <span className="navbar-hamburger-bar" />
            <span className="navbar-hamburger-bar" />
            <span className="navbar-hamburger-bar" />
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      <div
        className={`navbar-mobile-overlay ${mobileMenuOpen ? 'navbar-mobile-overlay--open' : ''}`}
        onClick={closeMobileMenu}
        role="button"
        tabIndex={-1}
        aria-hidden={!mobileMenuOpen}
      >
        <div
          className="navbar-mobile-panel"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="navbar-mobile-header">
            <Link to="/" className="navbar-brand" onClick={closeMobileMenu}>
              <img src={logo} alt="az-handy.berlin Logo" className="navbar-logo" />
            </Link>
            <button
              type="button"
              className="navbar-mobile-close"
              onClick={closeMobileMenu}
              aria-label="Menü schließen"
            >
              <span />
              <span />
            </button>
          </div>
          <ul className="navbar-mobile-nav">
            {navLinks}
            {!user && (
              <li>
                <Link to="/login" className="btn btn--primary btn--small" onClick={closeMobileMenu}>Anmelden</Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;