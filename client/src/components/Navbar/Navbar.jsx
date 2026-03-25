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
                  className="navbar-avatar-btn navbar-avatar-btn--with-greeting"
                  aria-label="Benutzermenü"
                >
                  <span className="navbar-avatar-wrap">
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
                  </span>
                  <span className="navbar-greeting">Hey</span>
                  <span className="navbar-username-inline">{user.name}</span>
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
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <path fillRule="evenodd" clipRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.444c-.84.076-1.647.272-2.42.568l-.833-.946a1.125 1.125 0 0 0-1.667-.177l-1.25 1.25a1.125 1.125 0 0 0-.149 1.37l.833 1.33c-.384.696-.665 1.476-.822 2.323l-1.065.61a1.125 1.125 0 0 0-.52 1.213l.25 1.75a1.125 1.125 0 0 0 1.177.99l1.268-.17c.329.22.675.414 1.036.583l.394 1.234a1.125 1.125 0 0 0 1.074.689h1.75a1.125 1.125 0 0 0 1.074-.69l.394-1.234c.36-.169.707-.363 1.036-.583l1.268.17a1.125 1.125 0 0 0 1.177-.99l.25-1.75a1.125 1.125 0 0 0-.52-1.213l-1.065-.61a6.38 6.38 0 0 0-.822-2.323l.833-1.33c.28-.447.215-1.035-.15-1.37l-1.25-1.25a1.125 1.125 0 0 0-1.667-.177l-.833.946a6.38 6.38 0 0 0-2.42-.568l-.11-1.627C12.782 2.913 11.98 2.25 11.078 2.25Zm.25 7.5a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z" />
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
              <button onClick={toggleDropdown} className="navbar-avatar-btn navbar-avatar-btn--with-greeting" aria-label="Benutzermenü">
                <span className="navbar-avatar-wrap">
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
                </span>
                <span className="navbar-greeting">Hey</span>
                <span className="navbar-username-inline">{user.name}</span>
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
                    <span className="navbar-dropdown-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path fillRule="evenodd" clipRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.444c-.84.076-1.647.272-2.42.568l-.833-.946a1.125 1.125 0 0 0-1.667-.177l-1.25 1.25a1.125 1.125 0 0 0-.149 1.37l.833 1.33c-.384.696-.665 1.476-.822 2.323l-1.065.61a1.125 1.125 0 0 0-.52 1.213l.25 1.75a1.125 1.125 0 0 0 1.177.99l1.268-.17c.329.22.675.414 1.036.583l.394 1.234a1.125 1.125 0 0 0 1.074.689h1.75a1.125 1.125 0 0 0 1.074-.69l.394-1.234c.36-.169.707-.363 1.036-.583l1.268.17a1.125 1.125 0 0 0 1.177-.99l.25-1.75a1.125 1.125 0 0 0-.52-1.213l-1.065-.61a6.38 6.38 0 0 0-.822-2.323l.833-1.33c.28-.447.215-1.035-.15-1.37l-1.25-1.25a1.125 1.125 0 0 0-1.667-.177l-.833.946a6.38 6.38 0 0 0-2.42-.568l-.11-1.627C12.782 2.913 11.98 2.25 11.078 2.25Zm.25 7.5a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z" /></svg></span>
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