/**
 * JWT liefert userId oft als Number, in manchen Stacks als String.
 * Für Sequelize/PG (INTEGER user_id) einheitlich normalisieren.
 */
export function normalizeUserId(raw) {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
