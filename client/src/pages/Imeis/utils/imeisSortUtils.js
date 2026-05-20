/** Normalisiert IMEI für Sort/Match (Ziffernfolge ≥14 bevorzugt). */
export function normalizeImeiSortKey(raw) {
  const s = String(raw ?? '').trim().replace(/\s+/g, '');
  if (!s) return '';
  const digits = s.replace(/\D/g, '');
  if (digits.length >= 14) return digits;
  return s;
}

/** Sortiert Liste alt → neu: zuerst _addedAt, sonst ursprüngliche Reihenfolge aus der API. */
export function sortImeisOldestFirst(arr) {
  const list = Array.isArray(arr) ? [...arr] : [];
  return list
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const ta = a.item?._addedAt ? new Date(a.item._addedAt).getTime() : NaN;
      const tb = b.item?._addedAt ? new Date(b.item._addedAt).getTime() : NaN;
      const va = Number.isFinite(ta);
      const vb = Number.isFinite(tb);
      if (va && vb && ta !== tb) return ta - tb;
      if (va && !vb) return -1;
      if (!va && vb) return 1;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}
