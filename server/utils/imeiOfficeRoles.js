/** Gemeinsame Rollenlogik für IMEI-Büro/Admin (gleich wie früher in imeis.controller) */

const toRoleString = (role) => {
  if (role == null || role === '') return '';
  if (typeof role === 'string') return role;
  return String(role);
};

const normalizeRoleKey = (role) => {
  const s = toRoleString(role)
    .replace(/\u00a0/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ');
  try {
    return s.normalize('NFD').replace(/\p{M}/gu, '');
  } catch {
    return s.replace(/[ü]/g, 'u').replace(/[ö]/g, 'o').replace(/[ä]/g, 'a');
  }
};

export const isMitarbeiterShop = (role) => normalizeRoleKey(role) === 'mitarbeiter shop';

export const isTeamleiterShop = (role) => normalizeRoleKey(role) === 'teamleiter shop';

/** Büro in DB oft mit Tippvarianten: „Büro Mitarbeiter“, „Büro-Mitarbeiter“, nur „Büro“, Unicode-ü */
export const isBüroMitarbeiter = (role) => {
  const k = normalizeRoleKey(role);
  if (!k) return false;
  if (k === 'buro mitarbeiter' || k === 'buro') return true;
  if (k.includes('buro') && k.includes('mitarbeiter')) return true;
  return false;
};

/** Rolle aus Sequelize-/Memory-User zuverlässig lesen */
export const getUserRole = (user) =>
  user?.role ?? user?.get?.('role') ?? user?.dataValues?.role ?? null;

export const isAdmin = (role) => {
  const r = toRoleString(role);
  if (!r) return false;
  const rl = r.toLowerCase();
  return rl.includes('admin') || r.trim() === 'Administrator' || normalizeRoleKey(role) === 'administrator';
};
