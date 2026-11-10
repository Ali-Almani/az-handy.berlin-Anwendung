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

const KNOWN_MANUFACTURERS = [
  'apple', 'google', 'huawei', 'samsung', 'xiaomi', 'oneplus', 'oppo', 'vivo',
  'realme', 'motorola', 'nokia', 'sony', 'lg', 'honor', 'o2', 'nothing'
];
const KNOWN_CARRIERS = [
  'vodafone', 'telekom', 't-mobile', 'e-plus', 'base', 'otelo', 'blau', 'simyo', 'congstar'
];

function tryMatchManufacturer(valueStr, lowerValue) {
  const matched = KNOWN_MANUFACTURERS.find(
    (m) => lowerValue === m || lowerValue.includes(m) || m.includes(lowerValue)
  );
  if (matched) {
    if (matched === 'o2') return 'o2 Prepaid';
    if (lowerValue === matched) return valueStr;
    if (lowerValue.includes(matched)) return matched.charAt(0).toUpperCase() + matched.slice(1);
  }
  return null;
}

function resolveManufacturerFromValue(valueStr) {
  if (getIphoneVersionForArticleCode(valueStr)) return 'Apple';
  const result = tryMatchManufacturer(valueStr, valueStr.toLowerCase());
  if (result) return result;
  return valueStr;
}

/** Gleicher Hersteller-Tab wie in der IMEI-Liste (nicht Excel-Blattname). */
export function getImeiManufacturerTab(item) {
  if (!item?.rowData) return '';
  const keysToCheck =
    item.columnOrder?.length > 0 ? item.columnOrder : Object.keys(item.rowData);
  const manufacturerKeys = keysToCheck.filter(isManufacturerColumnKey);
  if (manufacturerKeys.length > 0) {
    const value = item.rowData[manufacturerKeys[0]];
    if (value != null && value !== '') {
      const valueStr = String(value).trim();
      const lowerValue = valueStr.toLowerCase();
      if (lowerValue !== 'datum' && !KNOWN_CARRIERS.some((c) => lowerValue.includes(c))) {
        return resolveManufacturerFromValue(valueStr);
      }
    }
  }
  const markeKey = keysToCheck.find((key) => key && String(key).toLowerCase().trim() === 'marke');
  if (markeKey) {
    const markeValue = item.rowData[markeKey];
    if (markeValue != null && markeValue !== '') {
      const markeValueStr = String(markeValue).trim();
      const lowerMarkeValue = markeValueStr.toLowerCase();
      if (lowerMarkeValue !== 'datum' && !KNOWN_CARRIERS.some((c) => lowerMarkeValue.includes(c))) {
        return resolveManufacturerFromValue(markeValueStr);
      }
    }
  }
  const skipKeys = [...['provider', 'netzbetreiber', 'carrier', 'imei', 'datum', 'date'], ...KNOWN_CARRIERS];
  const alreadyChecked = new Set(
    [
      ...manufacturerKeys.map((k) => String(k).toLowerCase().trim()),
      markeKey && String(markeKey).toLowerCase().trim()
    ].filter(Boolean)
  );
  for (const key of keysToCheck) {
    if (
      !key
      || alreadyChecked.has(String(key).toLowerCase().trim())
      || skipKeys.some((skip) => String(key).toLowerCase().includes(skip))
    ) continue;
    const value = item.rowData[key];
    if (value == null || value === '') continue;
    const valueStr = String(value).trim();
    if (valueStr === '' || valueStr.toLowerCase() === 'datum') continue;
    const lowerValue = valueStr.toLowerCase();
    const result = tryMatchManufacturer(valueStr, lowerValue);
    if (result) return result;
    if (getIphoneVersionForArticleCode(valueStr)) return 'Apple';
    const isCarrier = KNOWN_CARRIERS.some((c) => lowerValue.includes(c));
    const isImeiColumn = String(key).toLowerCase().includes('imei');
    if (!isCarrier && !isImeiColumn && valueStr.length >= 2 && valueStr.length <= 50 && !/^\d+$/.test(valueStr)) {
      return valueStr;
    }
  }
  return '';
}

/** Nur die sichtbaren Tabs „Prepaid“ und „o2 Prepaid“, keine anderen Hersteller. */
export function isPrepaidOrO2PrepaidImeiRow(item) {
  const tab = String(getImeiManufacturerTab(item) || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return tab === 'prepaid' || tab === 'o2 prepaid';
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
