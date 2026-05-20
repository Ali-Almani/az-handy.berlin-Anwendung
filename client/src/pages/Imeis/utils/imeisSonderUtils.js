import { sortImeisOldestFirst, normalizeImeiSortKey } from './imeisSortUtils';

/** Zeilen, die in der Hauptliste sichtbar sind (nicht reserviert) und eine plausibele IMEI haben. */
export function getNonReservedImeiRows(imeis, rowActions) {
  return (imeis || []).filter((item) => {
    const rowId = `${item.sheet || 'default'}-${item.imei}-${item.row}`;
    if (rowActions?.[rowId]?.action === 'reservieren') return false;
    const k = normalizeImeiSortKey(item?.imei);
    return k.length >= 8;
  });
}

/** Die 10 ältesten IMEI-Zeilen (nach _addedAt / Listenposition), für Büro-Freigabe. */
export function pickOldestTenImeisForSonder(imeis, rowActions) {
  const avail = getNonReservedImeiRows(imeis, rowActions);
  const sorted = sortImeisOldestFirst(avail);
  return sorted.slice(0, 10);
}
