import { useState, useRef, useEffect, useId } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { canAccessImeis, canAccessDashboard, isAdmin } from '../../utils/roles';
import logo from '../../photo/AZ-Logo.svg';
import './Navbar.scss';

const navLinkClassName = ({ isActive }) =>
  `navbar-link${isActive ? ' navbar-link--active' : ''}`;

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
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [archivOpen, setArchivOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const mobileHeaderDropdownRef = useRef(null);
  const archivDesktopRef = useRef(null);
  const archivMobileRef = useRef(null);
  const archivDesktopTriggerId = useId();
  const archivDesktopSubmenuId = useId();
  const archivMobileTriggerId = useId();
  const archivMobileSubmenuId = useId();

  const archivPathActive =
    location.pathname === '/archiv-news' || location.pathname === '/archiv-anweisung';

  // Schließe Dropdown beim Klick außerhalb
  useEffect(() => {
    const handleClickOutside = (event) => {
      const outsideDesktop = !dropdownRef.current?.contains(event.target);
      const outsideMobileHeader = !mobileHeaderDropdownRef.current?.contains(event.target);
      const outsideArchiv =
        !archivDesktopRef.current?.contains(event.target) &&
        !archivMobileRef.current?.contains(event.target);
      if (outsideDesktop && outsideMobileHeader) {
        setDropdownOpen(false);
      }
      if (outsideArchiv) {
        setArchivOpen(false);
      }
    };

    if (dropdownOpen || archivOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen, archivOpen]);

  useEffect(() => {
    setArchivOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!archivOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setArchivOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [archivOpen]);

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
    setArchivOpen(false);
    setMobileMenuOpen(false);
  };

  const toggleDropdown = () => {
    setArchivOpen(false);
    setDropdownOpen(!dropdownOpen);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
    setDropdownOpen(false);
    setArchivOpen(false);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setArchivOpen(false);
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

  const renderArchivItem = (containerRef, triggerId, submenuId) => {
    if (!user || isAdmin(user)) return null;
    return (
      <li className="navbar-nav-archiv" ref={containerRef}>
        <button
          type="button"
          className={`navbar-link navbar-archiv-trigger${archivPathActive ? ' navbar-link--active' : ''}${archivOpen ? ' navbar-archiv-trigger--open' : ''}`}
          aria-expanded={archivOpen}
          aria-haspopup="true"
          aria-controls={submenuId}
          id={triggerId}
          onClick={() => {
            setDropdownOpen(false);
            setArchivOpen((o) => !o);
          }}
        >
          Archiv
          <span className="navbar-archiv-chevron" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
        {archivOpen && (
          <ul id={submenuId} className="navbar-archiv-submenu" role="list" aria-labelledby={triggerId}>
            <li role="none">
              <NavLink
                to="/archiv-news"
                className={navLinkClassName}
                onClick={closeMobileMenu}
                end
              >
                  Alte NEWS
              </NavLink>
            </li>
            <li role="none">
              <NavLink
                to="/archiv-anweisung"
                className={navLinkClassName}
                onClick={closeMobileMenu}
                end
              >
                Archiv Anweisung
              </NavLink>
            </li>
          </ul>
        )}
      </li>
    );
  };

  const renderImeisItem = () =>
    canAccessImeis(user) ? (
      <li>
        <NavLink to="/imeis" className={navLinkClassName} onClick={closeMobileMenu} end>
          IMEIs
        </NavLink>
      </li>
    ) : null;

  const renderDashboardItem = () =>
    canAccessDashboard(user) ? (
      <li>
        <NavLink to="/dashboard" className={navLinkClassName} onClick={closeMobileMenu} end>
          Dashboard
        </NavLink>
      </li>
    ) : null;

  const navLinksDesktop = (
    <>
      {renderImeisItem()}
      {renderArchivItem(archivDesktopRef, archivDesktopTriggerId, archivDesktopSubmenuId)}
      {renderDashboardItem()}
    </>
  );

  const navLinksMobile = (
    <>
      {renderImeisItem()}
      {renderArchivItem(archivMobileRef, archivMobileTriggerId, archivMobileSubmenuId)}
      {renderDashboardItem()}
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
              {navLinksDesktop}
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
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 4h4.5M11.5 4H14" />
                            <circle cx="8" cy="4" r="1.2" />
                            <path d="M2 8h4M11 8h3" />
                            <circle cx="8" cy="8" r="1.2" />
                            <path d="M2 12h5.5M10.5 12H14" />
                            <circle cx="8" cy="12" r="1.2" />
                          </g>
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
                    <span className="navbar-dropdown-icon">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 4h4.5M11.5 4H14" />
                          <circle cx="8" cy="4" r="1.2" />
                          <path d="M2 8h4M11 8h3" />
                          <circle cx="8" cy="8" r="1.2" />
                          <path d="M2 12h5.5M10.5 12H14" />
                          <circle cx="8" cy="12" r="1.2" />
                        </g>
                      </svg>
                    </span>
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
            {navLinksMobile}
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