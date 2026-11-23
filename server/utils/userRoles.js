const ALLOWED_ASSIGN_ROLES = new Set([
  'admin',
  'Administrator',
  'Büro Mitarbeiter',
  'Marketing',
  'Social Media',
  'Mitarbeiter social media',
  'Teamleiter social media',
  'Callcenter',
  'Shops',
  'Buchhaltung',
  'Einkauf',
  'Partner',
  'Teamleiter shop',
  'Mitarbeiter shop'
]);

export function parseRolesField(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return value.split(',').map((part) => part.trim()).filter(Boolean);
    }
  }
  return [];
}

export function userRoles(user) {
  const primary = String(user?.role ?? user?.get?.('role') ?? user?.dataValues?.role ?? '')
    .replace(/\u00a0/g, ' ')
    .trim();
  const extra = parseRolesField(user?.roles ?? user?.get?.('roles') ?? user?.dataValues?.roles);
  const out = [];
  const add = (raw) => {
    const value = String(raw || '').replace(/\u00a0/g, ' ').trim();
    if (value && !out.includes(value)) out.push(value);
  };
  add(primary);
  extra.forEach(add);
  return out;
}

export function sanitizeAssignedRoles(list) {
  const out = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const value = String(raw || '').replace(/\u00a0/g, ' ').trim();
    if (!value || !ALLOWED_ASSIGN_ROLES.has(value)) continue;
    if (!out.includes(value)) out.push(value);
  }
  return out.slice(0, 12);
}

export function rolesEquivalent(a, b) {
  const na = String(a || '').replace(/\u00a0/g, ' ').trim().toLowerCase();
  const nb = String(b || '').replace(/\u00a0/g, ' ').trim().toLowerCase();
  if (!na || !nb) return false;
  if (na === nb) return true;
  return na.includes('admin') && nb.includes('admin');
}

export function pickPrimaryRole(existingRole, selected) {
  const current = String(existingRole || '').replace(/\u00a0/g, ' ').trim();
  const list = sanitizeAssignedRoles(selected);
  if (current && list.some((role) => rolesEquivalent(role, current))) return current;
  return list[0] || current || 'Marketing';
}

function roleKey(role) {
  return String(role || '')
    .replace(/\u00a0/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ');
}

export function userHasShopImeiLimit(user) {
  return userRoles(user).some((role) => {
    const k = roleKey(role);
    return k === 'mitarbeiter shop' || k === 'teamleiter shop';
  });
}

export function isAdminRole(role) {
  const r = String(role || '').trim();
  return r === 'Administrator' || r === 'admin' || r.toLowerCase().includes('admin');
}

export function isTeamleiterSocialMediaRole(role) {
  const k = roleKey(role);
  return k === 'teamleiter social media' || (k.includes('teamleiter') && k.includes('social media'));
}

export function isSocialMediaRole(role) {
  const k = roleKey(role);
  return k === 'mitarbeiter social media' || k === 'social media';
}

export function userDisplayName(user) {
  return String(user?.name ?? user?.get?.('name') ?? user?.dataValues?.name ?? '')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function normalizePersonName(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

const ANWEISUNG_TEAMLEITER_ALLOW_NAME = 'alissar oklar';

export function isAnweisungTeamleiterAllow(user) {
  return normalizePersonName(userDisplayName(user)) === ANWEISUNG_TEAMLEITER_ALLOW_NAME;
}

/** Automatisierte Abfrage nur Administrator. */
export function canManageAutoAbfrage(user) {
  return userRoles(user).some(isAdminRole);
}

/** Anweisung: Admin und Mitarbeiter SM; Teamleiter SM nur Alissar Oklar. */
export function canSeeTicketingAnweisung(user) {
  const roles = userRoles(user);
  if (roles.some(isAdminRole)) return true;
  if (roles.some(isTeamleiterSocialMediaRole)) return isAnweisungTeamleiterAllow(user);
  return roles.some(isSocialMediaRole);
}

export function canWriteTicketingAnweisung(user) {
  const roles = userRoles(user);
  if (roles.some(isAdminRole)) return true;
  return roles.some(isTeamleiterSocialMediaRole) && isAnweisungTeamleiterAllow(user);
}
