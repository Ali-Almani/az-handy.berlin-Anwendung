/** Artikel-/SAP-Codes, die fälschlich als Hersteller in Excel stehen → Apple iPhone-Version */
const APPLE_ARTICLE_IPHONE_VERSION = {
  R261270662: '18'
};

export function normalizeArticleCode(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
}

export function getIphoneVersionForArticleCode(value) {
  const code = normalizeArticleCode(value);
  return code ? APPLE_ARTICLE_IPHONE_VERSION[code] || '' : '';
}

function isManufacturerColumnKey(key) {
  if (!key) return false;
  const lowerKey = String(key).toLowerCase().trim();
  return (
    (lowerKey.includes('hersteller') ||
      lowerKey.includes('manufacturer') ||
      lowerKey.includes('make') ||
      (lowerKey.includes('brand') && !lowerKey.includes('marke'))) &&
    !lowerKey.includes('marke') &&
    !lowerKey.includes('datum')
  );
}

function getManufacturerColumnKey(item) {
  const keysToCheck =
    item.columnOrder?.length > 0 ? item.columnOrder : Object.keys(item.rowData || {});
  let manufacturerKey = keysToCheck.find(isManufacturerColumnKey);
  if (!manufacturerKey && keysToCheck.length >= 2) {
    const imeiKey = keysToCheck.find((key) => key && String(key).toLowerCase().includes('imei'));
    if (imeiKey) {
      const idx = keysToCheck.indexOf(imeiKey);
      if (idx + 1 < keysToCheck.length) manufacturerKey = keysToCheck[idx + 1];
    } else if (keysToCheck[1]) manufacturerKey = keysToCheck[1];
  }
  return manufacturerKey || null;
}

/** Hersteller-/Marken-Zelle von Artikelcode auf „Apple“ setzen (rowData). */
export function normalizeImeiRowHerstellerAppleAlias(item) {
  if (!item?.rowData || typeof item.rowData !== 'object') return item;
  const rowData = { ...item.rowData };
  let changed = false;
  const keysToCheck =
    item.columnOrder?.length > 0 ? [...item.columnOrder] : Object.keys(rowData);

  const patchKey = (key) => {
    if (!key || rowData[key] == null || rowData[key] === '') return;
    if (!getIphoneVersionForArticleCode(rowData[key])) return;
    if (String(rowData[key]).trim() !== 'Apple') {
      rowData[key] = 'Apple';
      changed = true;
    }
  };

  keysToCheck.filter(isManufacturerColumnKey).forEach(patchKey);
  const markeKey = keysToCheck.find((key) => key && String(key).toLowerCase().trim() === 'marke');
  if (markeKey) patchKey(markeKey);
  patchKey(getManufacturerColumnKey({ ...item, rowData }));

  return changed ? { ...item, rowData } : item;
}

export function normalizeImeiListHerstellerAppleAlias(imeis) {
  if (!Array.isArray(imeis)) return [];
  return imeis.map(normalizeImeiRowHerstellerAppleAlias);
}

export function imeiListHerstellerAppleAliasChanged(before, after) {
  if (!Array.isArray(before) || !Array.isArray(after) || before.length !== after.length) return true;
  for (let i = 0; i < before.length; i++) {
    if (before[i] !== after[i] && JSON.stringify(before[i]) !== JSON.stringify(after[i])) return true;
  }
  return false;
}
