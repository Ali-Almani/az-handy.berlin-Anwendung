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