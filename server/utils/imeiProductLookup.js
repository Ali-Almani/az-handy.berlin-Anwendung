import { normalizeImeiKey } from './imeiKey.js';

export function getProductFullFromImeiRow(item) {
  if (!item?.rowData || typeof item.rowData !== 'object') return '';
  const keysToCheck =
    Array.isArray(item.columnOrder) && item.columnOrder.length > 0
      ? item.columnOrder
      : Object.keys(item.rowData);

  for (const key of keysToCheck) {
    if (!key) continue;
    const lowerKey = String(key).toLowerCase().trim();
    if (
      (lowerKey === 'produkt' ||
        lowerKey === 'product' ||
        lowerKey.includes('produkt') ||
        lowerKey.includes('product')) &&
      item.rowData[key] != null &&
      String(item.rowData[key]).trim()
    ) {
      return String(item.rowData[key]).trim();
    }
  }

  for (const key of keysToCheck) {
    if (!key) continue;
    const lowerKey = String(key).toLowerCase().trim();
    if (
      lowerKey.includes('artikel') &&
      (lowerKey.includes('bezeichnung') || lowerKey.includes('name')) &&
      item.rowData[key] != null &&
      String(item.rowData[key]).trim()
    ) {
      return String(item.rowData[key]).trim();
    }
  }

  return '';
}

export function buildImeiProductLookup(imeis) {
  const map = new Map();
  for (const item of Array.isArray(imeis) ? imeis : []) {
    const key = normalizeImeiKey(item?.imei);
    const product = getProductFullFromImeiRow(item);
    if (key && product) map.set(key, product);
  }
  return map;
}

export function isEmptyHistoryProduct(product) {
  const s = String(product ?? '').trim();
  return !s || s === '-';
}

export function enrichHistoryEntryProduct(entry, lookup) {
  if (!entry || !lookup?.get) return entry;
  if (!isEmptyHistoryProduct(entry.product)) return entry;
  const key = normalizeImeiKey(entry.imei);
  if (!key) return entry;
  const product = lookup.get(key);
  if (!product) return entry;
  return { ...entry, product };
}

export function enrichCopyHistoryWithProducts(history, lookup) {
  if (!Array.isArray(history) || history.length === 0) return history;
  if (!lookup?.size) return history;
  return history.map((e) => enrichHistoryEntryProduct(e, lookup));
}
