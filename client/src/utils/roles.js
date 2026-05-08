// Verfügbare Rollen im System
export const ROLES = {
  ADMINISTRATOR: 'Administrator',
  BUERO_MITARBEITER: 'Büro Mitarbeiter',
  MARKETING: 'Marketing',
  CALLCENTER: 'Callcenter',
  SHOPS: 'Shops',
  BUCHHALTUNG: 'Buchhaltung',
  EINKAUF: 'Einkauf',
  PARTNER: 'Partner',
  TEAMLEITER_SHOP: 'Teamleiter shop',
  MITARBEITER_SHOP: 'Mitarbeiter shop'
};

/** Rollen-Vergleich (analog Server): NBSP, Bindestrich, Unicode */
const normRole = (role) => {
  const s = String(role || '')
    .replace(/\u00a0/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ');
  try {
    return s.normalize('NFD').replace(/\p{M}/gu, '');
  } catch {
    return s.replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ä/g, 'a');
  }
};

// Einsatzorte für Shop-Mitarbeiter (Reihenfolge: Zentrale, Sonne, KM127, KM169, KM50, Turm, Bad, Haupt)
export const EINSATZ_ORT_OPTIONS = [
  { value: '', label: '– Keiner –' },
  { value: 'Zentrale', label: 'Zentrale' },
  { value: 'Sonne', label: 'Sonne' },
  { value: 'KM127', label: 'KM127' },
  { value: 'KM169', label: 'KM169' },
  { value: 'KM50', label: 'KM50' },
  { value: 'Turm', label: 'Turm' },
  { value: 'Bad', label: 'Bad' },
  { value: 'Haupt', label: 'Haupt' }
];

/** Uniform-Größen / Größenoptionen (Einstellungen, Rolle Mitarbeiter shop) */
export const TSHIRT_GROESSE_OPTIONS = [
  { value: '', label: '– Bitte wählen –' },
  { value: 'S', label: 'S' },
  { value: 'M', label: 'M' },
  { value: 'L', label: 'L' },
  { value: 'XL', label: 'XL' },
  { value: '2XL', label: '2XL' },
  { value: '3XL', label: '3XL' },
  { value: '4XL', label: '4XL' },
  { value: '5XL', label: '5XL' }
];

const EINSATZ_ORT_ORDER = EINSATZ_ORT_OPTIONS.filter((o) => o.value).map((o) => o.value);

/** Sortierung wie in der Benutzerverwaltung: zuerst nach Einsatzort, dann Name. */
export const sortUsersByEinsatzOrt = (users) => {
  return [...users].sort((a, b) => {
    const aOrt = (a.einsatz_ort || '').trim();
    const bOrt = (b.einsatz_ort || '').trim();
    const aIdx = aOrt ? EINSATZ_ORT_ORDER.indexOf(aOrt) : 999;
    const bIdx = bOrt ? EINSATZ_ORT_ORDER.indexOf(bOrt) : 999;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return (a.name || '').localeCompare(b.name || '');
  });
};

// Rollen als Array für Dropdown
export const ROLE_OPTIONS = [
  { value: ROLES.ADMINISTRATOR, label: 'Administrator' },
  { value: ROLES.BUERO_MITARBEITER, label: 'Büro Mitarbeiter' },
  { value: ROLES.TEAMLEITER_SHOP, label: 'Teamleiter shop' },
  { value: ROLES.MITARBEITER_SHOP, label: 'Mitarbeiter shop' },
  { value: ROLES.MARKETING, label: 'Marketing' },
  { value: ROLES.CALLCENTER, label: 'Callcenter' },
  { value: ROLES.BUCHHALTUNG, label: 'Buchhaltung' },
  { value: ROLES.EINKAUF, label: 'Einkauf' },
  { value: ROLES.PARTNER, label: 'Partner' }
];

// Prüfe ob Benutzer Admin ist (inkl. Tippfehler "Adminstrator" und alle admin-Varianten)
export const isAdmin = (user) => {
  if (!user) return false;
  const role = String(user.role || '').trim();
  const roleLower = role.toLowerCase();
  if (roleLower.includes('admin')) return true;
  if (user.email && String(user.email).toLowerCase() === 'admin@az-handy.berlin') return true;
  return false;
};

// Prüfe ob Benutzer Mitarbeiter shop ist
export const isMitarbeiterShop = (user) => {
  if (!user) return false;
  return user.role === ROLES.MITARBEITER_SHOP;
};

/** Rolle Marketing (exakt, inkl. NBSP-Normalisierung über trim-Vergleich auf ROLES) */
export const isMarketing = (user) => {
  if (!user) return false;
  const r = String(user.role || '').replace(/\u00a0/g, ' ').trim();
  return r === ROLES.MARKETING;
};

// Prüfe ob Benutzer Teamleiter shop ist
export const isTeamleiterShop = (user) => {
  if (!user) return false;
  if (user.role === ROLES.TEAMLEITER_SHOP) return true;
  const k = normRole(user.role);
  return k === 'teamleiter shop' || (k.includes('teamleiter') && k.includes('shop'));
};

// Prüfe ob Benutzer Büro Mitarbeiter ist
export const isBüroMitarbeiter = (user) => {
  if (!user) return false;
  if (user.role === ROLES.BUERO_MITARBEITER) return true;
  const k = normRole(user.role);
  if (k === 'buro mitarbeiter' || k === 'buro') return true;
  return k.includes('buro') && k.includes('mitarbeiter');
};

/** Rolle Partner: in der Oberfläche nur Formular Center (plus Einstellungen). */
export const isPartner = (user) => {
  if (!user) return false;
  if (user.role === ROLES.PARTNER) return true;
  return normRole(user.role) === 'partner';
};

/**
 * IMEI-Verlauf Server-Aktionen (PATCH …/history-action): nur Rolle zählt.
 * Nicht {@link isAdmin} mit E-Mail-Fallback — sonst PATCH von „Mitarbeiter“-Konten mit Admin-Mail → 403.
 */
export const canActAsImeiOfficeForHistory = (user) => {
  if (!user) return false;
  if (isBüroMitarbeiter(user) || isTeamleiterShop(user)) return true;
  const r = normRole(user.role);
  return r.includes('admin') || r === 'administrator';
};

// Prüfe ob Benutzer IMEI-Seite sehen darf – alle eingeloggten Benutzer (gemeinsame Liste nach Büro-Upload)
export const canAccessImeis = (user) => {
  return !!user;
};

/**
 * IMEI-Link (Navbar) und IMEI-Seite: für alle außer Benutzer mit Einsatzort Zentrale
 * (ohne Rolle Administrator/Büro). Admin und Büro sehen die Liste immer – auch in Zentrale.
 */
export const canAccessImeisList = (user) => {
  if (!user) return false;
  if (isAdmin(user) || isBüroMitarbeiter(user)) return true;
  return String(user.einsatz_ort || '').trim() !== 'Zentrale';
};

/** Voucher-Navbar + Seite: gleiche Regel wie IMEI-Liste */
export const canAccessVoucherList = canAccessImeisList;

/**
 * Voucher eintragen / Anfrage an Büro (Avatar-Menü): alle außer Zentrale, nicht Büro/Admin.
 */
export const canSubmitVoucherManualRequest = (user) => {
  if (!user) return false;
  if (isAdmin(user) || isBüroMitarbeiter(user)) return false;
  return String(user.einsatz_ort || '').trim() !== 'Zentrale';
};

/** Voucher-Verlauf: Aktionen für andere Benutzer (Server prüft erneut) – Büro, Admin, Teamleiter shop */
export const canUpdateVoucherHistoryForOthers = (user) => {
  if (!user) return false;
  return isAdmin(user) || isBüroMitarbeiter(user) || isTeamleiterShop(user);
};

// Prüfe ob Benutzer Export und Alle löschen sehen darf (Admin, Teamleiter, Büro Mitarbeiter)
export const canUseImeiAdvancedActions = (user) => {
  if (!user) return false;
  const role = user.role;
  return role === ROLES.ADMINISTRATOR ||
         role === 'admin' ||
         role === ROLES.TEAMLEITER_SHOP ||
         role === ROLES.BUERO_MITARBEITER;
};

// Prüfe ob Benutzer Bestand-Button sehen darf (nur Administrator)
export const canSeeBestand = (user) => {
  if (!user) return false;
  const role = user.role;
  return role === ROLES.ADMINISTRATOR || role === 'admin';
};

// Prüfe ob Benutzer Dashboard sehen darf (Navbar + Route: nur Administrator und Büro Mitarbeiter)
export const canAccessDashboard = (user) => {
  if (!user) return false;
  return isAdmin(user) || isBüroMitarbeiter(user);
};

// Prüfe ob Benutzer Excel-Upload sehen darf (Büro Mitarbeiter und Administrator)
export const canShowExcelUpload = (user) => {
  if (!user) return false;
  return user.role === ROLES.BUERO_MITARBEITER || isAdmin(user);
};

// Prüfe ob Benutzer Dashboard-Notizen (TextEditor) sehen darf (nur Admin)
export const canShowDashboardNotes = (user) => {
  return isAdmin(user);
};

// Einstellungen: Alle eingeloggten Benutzer (Profil/Passwort); Benutzerverwaltung liegt im Dashboard (Admin)
