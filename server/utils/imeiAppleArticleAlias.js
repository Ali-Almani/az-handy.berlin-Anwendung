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

function prepaidLabelKey(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** UI-Tabs „Prepaid“ und „o2 Prepaid“ (o2 wird in der Liste als o2 Prepaid angezeigt). */
export function isPrepaidManufacturerTabLabel(value) {
  const n = prepaidLabelKey(value);
  if (!n) return false;
  if (n === 'prepaid') return true;
  if (n === 'o2' || n === 'o2 prepaid' || n === 'o2prepaid') return true;
  if (/\bo2\b/.test(n) && n.includes('prepaid')) return true;
  if (/\bo2\b/.test(n)) return true;
  return false;
}

function manufacturerLikeValues(item) {
  const values = [];
  const row = item?.rowData && typeof item.rowData === 'object' ? item.rowData : {};
  const keys =
    Array.isArray(item?.columnOrder) && item.columnOrder.length > 0
      ? item.columnOrder
      : Object.keys(row);
  for (const key of keys) {
    if (!key) continue;
    const lowerKey = String(key).toLowerCase().trim();
    if (
      lowerKey.includes('hersteller') ||
      lowerKey.includes('manufacturer') ||
      lowerKey.includes('make') ||
      lowerKey === 'marke' ||
      (lowerKey.includes('brand') && !lowerKey.includes('marke'))
    ) {
      values.push(row[key]);
    }
  }
  const mk = getManufacturerColumnKey(item);
  if (mk) values.push(row[mk]);
  return values;
}

export function isPrepaidOrO2PrepaidImeiRow(item) {
  if (!item) return false;
  if (isPrepaidManufacturerTabLabel(item.sheet)) return true;
  return manufacturerLikeValues(item).some((value) => isPrepaidManufacturerTabLabel(value));
}

export function stripPrepaidAndO2PrepaidImeis(imeis) {
  const list = Array.isArray(imeis) ? imeis : [];
  const filtered = [];
  let excludedCount = 0;
  for (const row of list) {
    if (isPrepaidOrO2PrepaidImeiRow(row)) {
      excludedCount += 1;
      continue;
    }
    filtered.push(row);
  }
  return { filtered, excludedCount };
}
