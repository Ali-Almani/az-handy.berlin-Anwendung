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
  if (s === '') return null;
  // Wichtig: In PostgreSQL ist user_id (und i.d.R. users.id) INTEGER.
  // Wenn ein alter Client-Token noch eine UUID enthält, darf das nicht zu DB-Fehlern führen.
  // UUIDs akzeptieren wir daher nur im In-Memory-Modus.
  // Hinweis: Nicht "automatisch" über fehlende DB-Env ableiten, weil PM2 ohne --update-env
  // alte/fehlende Variablen haben kann und dann fälschlich UUIDs durchlässt.
  const useMemoryDb = process.env.USE_MEMORY_DB === 'true';
  return useMemoryDb ? s : null;
}

/** req.user nach Login */
export function resolveAuthUserId(reqUser) {
  return coerceUserId(reqUser?.userId ?? reqUser?.id);
}
