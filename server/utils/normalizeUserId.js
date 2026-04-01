/**
 * JWT liefert userId oft als Number, in manchen Stacks als String.
 * Für Sequelize/PG (INTEGER user_id) einheitlich normalisieren.
 */
export function normalizeUserId(raw) {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Rohe ID aus JWT oder Speicher: INTEGER oder String (z. B. In-Memory-UUID) */
export function coerceUserId(raw) {
  if (raw == null || raw === '') return null;
  const n = normalizeUserId(raw);
  if (n != null) return n;
  const s = String(raw).trim();
  return s === '' ? null : s;
}

/** req.user nach Login */
export function resolveAuthUserId(reqUser) {
  return coerceUserId(reqUser?.userId ?? reqUser?.id);
}
