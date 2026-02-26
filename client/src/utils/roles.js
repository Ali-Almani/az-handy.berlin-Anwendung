// Verfügbare Rollen im System
export const ROLES = {
  ADMINISTRATOR: 'Administrator',
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
  { value: ROLES.TEAMLEITER_SHOP, label: 'Teamleiter shop' },
  { value: ROLES.MITARBEITER_SHOP, label: 'Mitarbeiter shop' },
  { value: ROLES.MARKETING, label: 'Marketing' },
  { value: ROLES.CALLCENTER, label: 'Callcenter' },
  { value: ROLES.BUCHHALTUNG, label: 'Buchhaltung' },
  { value: ROLES.EINKAUF, label: 'Einkauf' }
];

// Prüfe ob Benutzer Admin ist
export const isAdmin = (user) => {
  if (!user) return false;
  const role = user.role;
  return role === ROLES.ADMINISTRATOR || 
         role === 'admin' || 
         role === 'Administrator';
};
