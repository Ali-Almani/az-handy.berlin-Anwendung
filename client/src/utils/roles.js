// Verfügbare Rollen im System
export const ROLES = {
  ADMINISTRATOR: 'Administrator',
  BUERO_MITARBEITER: 'Büro Mitarbeiter',
  MARKETING: 'Marketing',
  CALLCENTER: 'Callcenter',
  SHOPS: 'Shops',
  BUCHHALTUNG: 'Buchhaltung',
  EINKAUF: 'Einkauf',
  TEAMLEITER_SHOP: 'Teamleiter shop',
  MITARBEITER_SHOP: 'Mitarbeiter shop'
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
  { value: ROLES.EINKAUF, label: 'Einkauf' }
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

// Prüfe ob Benutzer Teamleiter shop ist
export const isTeamleiterShop = (user) => {
  if (!user) return false;
  return user.role === ROLES.TEAMLEITER_SHOP;
};

// Prüfe ob Benutzer Büro Mitarbeiter ist
export const isBüroMitarbeiter = (user) => {
  if (!user) return false;
  return user.role === ROLES.BUERO_MITARBEITER;
};

// Prüfe ob Benutzer IMEI-Seite sehen darf – alle eingeloggten Benutzer (gemeinsame Liste nach Büro-Upload)
export const canAccessImeis = (user) => {
  return !!user;
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

// Prüfe ob Benutzer Bestand-Button sehen darf (nur Admin und Teamleiter – nicht Büro/Mitarbeiter shop)
export const canSeeBestand = (user) => {
  if (!user) return false;
  const role = user.role;
  return role === ROLES.ADMINISTRATOR ||
         role === 'admin' ||
         role === ROLES.TEAMLEITER_SHOP;
};

// Prüfe ob Benutzer Dashboard sehen darf (nicht Mitarbeiter shop)
export const canAccessDashboard = (user) => {
  if (!user) return false;
  return !isMitarbeiterShop(user);
};

// Prüfe ob Benutzer Excel-Upload sehen darf (nur Büro Mitarbeiter, nicht Administrator)
export const canShowExcelUpload = (user) => {
  if (!user) return false;
  return user.role === ROLES.BUERO_MITARBEITER;
};

// Prüfe ob Benutzer Dashboard-Notizen (TextEditor) sehen darf (nur Admin)
export const canShowDashboardNotes = (user) => {
  return isAdmin(user);
};

// Einstellungen: Alle dürfen zugreifen (nur Benutzerverwaltung ist Admin-only)
