import { useState, useRef, useEffect, useId } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  canAccessImeisList,
  canAccessVoucherList,
  canAccessDashboard,
  isAdmin,
  isBüroMitarbeiter,
  isPartner,
  canSubmitVoucherManualRequest,
  isMarketing
} from '../../utils/roles';
import logo from '../../photo/AZ-Logo.svg';
import './Navbar.scss';

const navLinkClassName = ({ isActive }) =>
  `navbar-link${isActive ? ' navbar-link--active' : ''}`;

const archivDropdownLinkClass = ({ isActive }) =>
  `navbar-dropdown-item${isActive ? ' navbar-dropdown-item--active' : ''}`;

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
  onOpenReminderResponseModal,
  hasVoucherManualRequestBadge = false,
  voucherManualRequestCount = 0,
  onOpenVoucherManualRequestsModal,
  onOpenVoucherRequestModal
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
  const dropdownHoverCloseRef = useRef(null);
  const archivHoverCloseRef = useRef(null);
  const [useHoverDropdowns, setUseHoverDropdowns] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 993px)').matches
  );

  const archivPathActive =
    location.pathname === '/archiv-news' || location.pathname === '/archiv-anweisung';

  const partnerUser = Boolean(user && isPartner(user));

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 993px)');
    const onChange = () => setUseHoverDropdowns(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const clearHoverTimer = (ref) => {
    if (ref.current) {
      clearTimeout(ref.current);
      ref.current = null;
    }
  };

  const openDropdownHover = () => {
    clearHoverTimer(dropdownHoverCloseRef);
    setArchivOpen(false);
    setDropdownOpen(true);
  };

  const scheduleDropdownClose = () => {
    clearHoverTimer(dropdownHoverCloseRef);
    dropdownHoverCloseRef.current = setTimeout(() => {
      setDropdownOpen(false);
      dropdownHoverCloseRef.current = null;
    }, 200);
  };

  const openArchivHover = () => {
    clearHoverTimer(archivHoverCloseRef);
    setDropdownOpen(false);
    setArchivOpen(true);
  };

  const scheduleArchivClose = () => {
    clearHoverTimer(archivHoverCloseRef);
    archivHoverCloseRef.current = setTimeout(() => {
      setArchivOpen(false);
      archivHoverCloseRef.current = null;
    }, 200);
  };

  useEffect(
    () => () => {
      clearHoverTimer(dropdownHoverCloseRef);
      clearHoverTimer(archivHoverCloseRef);
    },
    []
  );

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
    setDropdownOpen(false);
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
    clearHoverTimer(dropdownHoverCloseRef);
    setArchivOpen(false);
    setDropdownOpen((o) => !o);
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

  const handleOpenVoucherRequestModal = () => {
    onOpenVoucherRequestModal?.();
    setDropdownOpen(false);
    setArchivOpen(false);
    setMobileMenuOpen(false);
  };

  const handleOpenVoucherManualRequestsModal = () => {
    onOpenVoucherManualRequestsModal?.();
    setDropdownOpen(false);
    setArchivOpen(false);
    setMobileMenuOpen(false);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const renderArchivItem = (containerRef, triggerId, submenuId, enableHover = false) => {
    if (!user || isAdmin(user) || isPartner(user)) return null;
    return (
      <li
        className="navbar-nav-archiv"
        ref={containerRef}
        onMouseEnter={enableHover ? openArchivHover : undefined}
        onMouseLeave={enableHover ? scheduleArchivClose : undefined}
      >
        <button
          type="button"
          className={`navbar-link navbar-archiv-trigger${archivPathActive ? ' navbar-link--active' : ''}${archivOpen ? ' navbar-archiv-trigger--open' : ''}`}
          aria-expanded={archivOpen}
          aria-haspopup="true"
          aria-controls={submenuId}
          id={triggerId}
          onClick={() => {
            setDropdownOpen(false);
            if (!enableHover) {
              setArchivOpen((o) => !o);
            }
          }}
          onKeyDown={(e) => {
            if (enableHover && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              setDropdownOpen(false);
              setArchivOpen((o) => !o);
            }
          }}
        >
          <span className="navbar-archiv-trigger-label">
            <span className="navbar-link-icon navbar-archiv-trigger-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 7V6a2 2 0 012-2h2M20 7V6a2 2 0 00-2-2h-2M4 7v10a2 2 0 002 2h12a2 2 0 002-2V7M4 7h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 12h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </span>
            Archiv
          </span>
          <span className="navbar-archiv-chevron" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
        {archivOpen && (
          <div
            id={submenuId}
            className="navbar-dropdown navbar-archiv-dropdown"
            role="menu"
            aria-labelledby={triggerId}
          >
            <NavLink
              to="/archiv-news"
              className={archivDropdownLinkClass}
              onClick={closeMobileMenu}
              role="menuitem"
              end
            >
              <span className="navbar-dropdown-icon" aria-hidden>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M3 2.5h10c.28 0 .5.22.5.5v10a.5.5 0 01-.5.5H3a.5.5 0 01-.5-.5V3c0-.28.22-.5.5-.5z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                  <path d="M4.5 5h7M4.5 8h7M4.5 11h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </span>
              Archiv NEWS
            </NavLink>
            <NavLink
              to="/archiv-anweisung"
              className={archivDropdownLinkClass}
              onClick={closeMobileMenu}
              role="menuitem"
              end
            >
              <span className="navbar-dropdown-icon" aria-hidden>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M3 2.5h10c.28 0 .5.22.5.5v10a.5.5 0 01-.5.5H3a.5.5 0 01-.5-.5V3c0-.28.22-.5.5-.5z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                  <path d="M5 5.5l2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              Archiv Anweisung
            </NavLink>
          </div>
        )}
      </li>
    );
  };

  const renderImeisItem = () =>
    canAccessImeisList(user) ? (
      <li>
        <NavLink to="/imeis" className={navLinkClassName} onClick={closeMobileMenu} end>
          <span className="navbar-link-inner">
            <span className="navbar-link-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="7" y="3" width="10" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" />
                <path d="M10 7h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            IMEIs
          </span>
        </NavLink>
      </li>
    ) : null;

  const renderVoucherItem = () =>
    canAccessVoucherList(user) ? (
      <li>
        <NavLink to="/voucher" className={navLinkClassName} onClick={closeMobileMenu} end>
          <span className="navbar-link-inner">
            <span className="navbar-link-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 7V6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
              </svg>
            </span>
            Voucher
          </span>
        </NavLink>
      </li>
    ) : null;

  const renderFormularCenterNavItem = () => (
    <li>
      <NavLink to="/formular-center" className={navLinkClassName} onClick={closeMobileMenu} end>
        <span className="navbar-link-inner">
          <span className="navbar-link-icon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M9.5 1.5H4a1 1 0 00-1 1v11a1 1 0 001 1h8a1 1 0 001-1V5.5L9.5 1.5z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
              />
              <path d="M9.5 1.5V5h3.5" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
              <path d="M5 9h6M5 11.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          Formular Center
        </span>
      </NavLink>
    </li>
  );

  const renderDashboardItem = () =>
    canAccessDashboard(user) ? (
      <li>
        <NavLink to="/dashboard" className={navLinkClassName} onClick={closeMobileMenu} end>
          <span className="navbar-link-inner">
            <span className="navbar-link-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 20V10M10 20V4M16 20v-6M22 20v-9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </span>
            Dashboard
          </span>
        </NavLink>
      </li>
    ) : null;

  const renderMitarbeiterNavItem = () => (
    <li>
      <NavLink to="/mitarbeiter" className={navLinkClassName} onClick={closeMobileMenu} end>
        <span className="navbar-link-inner">
          <span className="navbar-link-icon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.75" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </span>
          Mitarbeiter Übersicht
        </span>
      </NavLink>
    </li>
  );

  const renderMarketingTshirtNavItem = () =>
    user && isMarketing(user) ? (
      <li>
        <NavLink to="/marketing/tshirt-groessen" className={navLinkClassName} onClick={closeMobileMenu}>
          <span className="navbar-link-inner">
            <span className="navbar-link-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 3h12l2 4v6l-3 3v8H7v-8l-3-3V7l2-4z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
                <path d="M6 7h12M9 11h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </span>
            T-Shirt-Größen
          </span>
        </NavLink>
      </li>
    ) : null;

  const navLinksDesktop = partnerUser ? (
    <>
      {renderFormularCenterNavItem()}
      {renderMitarbeiterNavItem()}
    </>
  ) : (
    <>
      {renderDashboardItem()}
      {renderImeisItem()}
      {renderVoucherItem()}
      {renderArchivItem(archivDesktopRef, archivDesktopTriggerId, archivDesktopSubmenuId, useHoverDropdowns)}
      {renderMitarbeiterNavItem()}
      {renderMarketingTshirtNavItem()}
    </>
  );

  const navLinksMobile = partnerUser ? (
    <>
      {renderFormularCenterNavItem()}
      {renderMitarbeiterNavItem()}
    </>
  ) : (
    <>
      {renderDashboardItem()}
      {renderImeisItem()}
      {renderVoucherItem()}
      {renderArchivItem(archivMobileRef, archivMobileTriggerId, archivMobileSubmenuId)}
      {renderMitarbeiterNavItem()}
      {renderMarketingTshirtNavItem()}
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
              <li
                className="navbar-avatar-container"
                ref={dropdownRef}
                onMouseEnter={useHoverDropdowns ? openDropdownHover : undefined}
                onMouseLeave={useHoverDropdowns ? scheduleDropdownClose : undefined}
              >
                <button
                  type="button"
                  onClick={toggleDropdown}
                  className="navbar-avatar-btn navbar-avatar-btn--with-greeting"
                  aria-label="Benutzermenü"
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
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
                  {!partnerUser && (
                    <>
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
                  {hasVoucherManualRequestBadge && (isBüroMitarbeiter(user) || isAdmin(user)) && onOpenVoucherManualRequestsModal && (
                    <span
                      className="navbar-avatar-badge navbar-avatar-badge--voucher-request"
                      title="Voucher anfrage – Klicken zum Öffnen"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleOpenVoucherManualRequestsModal(); }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenVoucherManualRequestsModal(); } }}
                    >
                      {voucherManualRequestCount > 9 ? '9+' : voucherManualRequestCount}
                    </span>
                  )}
                    </>
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
                    <Link
                      to={`/mitarbeiter/${user.id}`}
                      className="navbar-dropdown-item"
                      onClick={() => { setDropdownOpen(false); closeMobileMenu(); }}
                    >
                      <span className="navbar-dropdown-icon" aria-hidden>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </span>
                      Mitarbeiterprofil
                    </Link>
                    {!partnerUser && (
                      <>
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
                    {hasVoucherManualRequestBadge && onOpenVoucherManualRequestsModal && (isBüroMitarbeiter(user) || isAdmin(user)) && (
                      <button
                        type="button"
                        className="navbar-dropdown-item navbar-dropdown-item--reminder"
                        onClick={handleOpenVoucherManualRequestsModal}
                      >
                        <span className="navbar-avatar-badge navbar-avatar-badge--small navbar-avatar-badge--voucher-request">{voucherManualRequestCount > 9 ? '9+' : voucherManualRequestCount}</span>
                        <span>Voucher anfrage</span>
                      </button>
                    )}
                    {canSubmitVoucherManualRequest(user) && onOpenVoucherRequestModal && (
                      <button type="button" className="navbar-dropdown-item" onClick={handleOpenVoucherRequestModal}>
                        <span className="navbar-dropdown-icon" aria-hidden>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 5.5h10v8a1 1 0 01-1 1H4a1 1 0 01-1-1v-8z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                            <path d="M5 2.5h6l1.5 3H3.5l1.5-3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                          </svg>
                        </span>
                        Voucher eintragen
                      </button>
                    )}
                      </>
                    )}
                    {!partnerUser && (
                    <Link
                      to="/formular-center"
                      className="navbar-dropdown-item"
                      onClick={() => { setDropdownOpen(false); closeMobileMenu(); }}
                    >
                      <span className="navbar-dropdown-icon" aria-hidden>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M9.5 1.5H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.5L9.5 1.5z"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinejoin="round"
                          />
                          <path d="M9.5 1.5V5h3.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                          <path d="M5 9h6M5 11.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                      </span>
                      Formular Center
                    </Link>
                    )}
                    {!partnerUser && (
                    <Link
                      to="/benutzerhandbuch"
                      className="navbar-dropdown-item"
                      onClick={() => { setDropdownOpen(false); closeMobileMenu(); }}
                    >
                      <span className="navbar-dropdown-icon">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 3h12v10H2V3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      Benutzerhandbuch
                    </Link>
                    )}
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
          ) : null}
        </ul>
        <div className="navbar-mobile-right">
          {user ? (
            <div className="navbar-avatar-container" ref={mobileHeaderDropdownRef}>
              <button
                type="button"
                onClick={toggleDropdown}
                className="navbar-avatar-btn navbar-avatar-btn--with-greeting"
                aria-label="Benutzermenü"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                <span className="navbar-avatar-wrap">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="navbar-avatar-image" />
                  ) : (
                    <div className="navbar-avatar-placeholder">{getInitials(user.name)}</div>
                  )}
                {!partnerUser && (
                  <>
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
                {hasVoucherManualRequestBadge && (isBüroMitarbeiter(user) || isAdmin(user)) && onOpenVoucherManualRequestsModal && (
                  <span
                    className="navbar-avatar-badge navbar-avatar-badge--voucher-request"
                    title="Voucher anfrage"
                    onClick={(e) => { e.stopPropagation(); handleOpenVoucherManualRequestsModal(); }}
                    role="button"
                    tabIndex={0}
                  >
                    {voucherManualRequestCount > 9 ? '9+' : voucherManualRequestCount}
                  </span>
                )}
                  </>
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
                  <Link
                    to={`/mitarbeiter/${user.id}`}
                    className="navbar-dropdown-item"
                    onClick={() => { setDropdownOpen(false); closeMobileMenu(); }}
                  >
                    <span className="navbar-dropdown-icon" aria-hidden>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </span>
                    Mitarbeiterprofil
                  </Link>
                  {!partnerUser && (
                    <>
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
                  {hasVoucherManualRequestBadge && onOpenVoucherManualRequestsModal && (isBüroMitarbeiter(user) || isAdmin(user)) && (
                    <button type="button" className="navbar-dropdown-item navbar-dropdown-item--reminder" onClick={handleOpenVoucherManualRequestsModal}>
                      <span className="navbar-avatar-badge navbar-avatar-badge--small navbar-avatar-badge--voucher-request">{voucherManualRequestCount > 9 ? '9+' : voucherManualRequestCount}</span>
                      <span>Voucher anfrage</span>
                    </button>
                  )}
                  {canSubmitVoucherManualRequest(user) && onOpenVoucherRequestModal && (
                    <button type="button" className="navbar-dropdown-item" onClick={handleOpenVoucherRequestModal}>
                      <span className="navbar-dropdown-icon" aria-hidden>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 5.5h10v8a1 1 0 01-1 1H4a1 1 0 01-1-1v-8z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                          <path d="M5 2.5h6l1.5 3H3.5l1.5-3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                        </svg>
                      </span>
                      Voucher eintragen
                    </button>
                  )}
                    </>
                  )}
                  {!partnerUser && (
                  <Link
                    to="/formular-center"
                    className="navbar-dropdown-item"
                    onClick={() => { setDropdownOpen(false); closeMobileMenu(); }}
                  >
                    <span className="navbar-dropdown-icon" aria-hidden>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M9.5 1.5H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.5L9.5 1.5z"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinejoin="round"
                        />
                        <path d="M9.5 1.5V5h3.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                        <path d="M5 9h6M5 11.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                    </span>
                    Formular Center
                  </Link>
                  )}
                  {!partnerUser && (
                  <Link to="/benutzerhandbuch" className="navbar-dropdown-item" onClick={() => { setDropdownOpen(false); closeMobileMenu(); }}>
                    <span className="navbar-dropdown-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3h12v10H2V3z" stroke="currentColor" strokeWidth="1.5"/><path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.5"/></svg></span>
                    Benutzerhandbuch
                  </Link>
                  )}
                  <Link to="/settings" className="navbar-dropdown-item" onClick={() => { setDropdownOpen(false); closeMobileMenu(); }}>
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
          ) : null}
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
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;