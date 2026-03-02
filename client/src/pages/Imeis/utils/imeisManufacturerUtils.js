/**
 * Hersteller-Extraktion und Zellauswahl
 */
const KNOWN_MANUFACTURERS = ['apple', 'google', 'huawei', 'samsung', 'xiaomi', 'oneplus', 'oppo', 'vivo', 'realme', 'motorola', 'nokia', 'sony', 'lg', 'honor', 'o2', 'nothing'];
const KNOWN_CARRIERS = ['vodafone', 'telekom', 't-mobile', 'e-plus', 'base', 'otelo', 'blau', 'simyo', 'congstar'];

export const getManufacturerColumnKey = (item) => {
  const keysToCheck = item.columnOrder?.length > 0 ? item.columnOrder : Object.keys(item.rowData || {});
  let manufacturerKey = keysToCheck.find(key => {
    if (!key) return false;
    const lowerKey = String(key).toLowerCase().trim();
    return (lowerKey.includes('hersteller') || lowerKey.includes('manufacturer') || lowerKey.includes('make') || (lowerKey.includes('brand') && !lowerKey.includes('marke'))) && !lowerKey.includes('marke');
  });
  if (!manufacturerKey && keysToCheck.length >= 2) {
    const imeiKey = keysToCheck.find(key => key && String(key).toLowerCase().includes('imei'));
    if (imeiKey) {
      const idx = keysToCheck.indexOf(imeiKey);
      if (idx + 1 < keysToCheck.length) manufacturerKey = keysToCheck[idx + 1];
    } else if (keysToCheck[1]) manufacturerKey = keysToCheck[1];
  }
  return manufacturerKey || null;
};

const tryMatchManufacturer = (valueStr, lowerValue) => {
  const matched = KNOWN_MANUFACTURERS.find(m => lowerValue === m || lowerValue.includes(m) || m.includes(lowerValue));
  if (matched) {
    if (matched === 'o2') return 'o2 Prepaid';
    if (lowerValue === matched) return valueStr;
    if (lowerValue.includes(matched)) return matched.charAt(0).toUpperCase() + matched.slice(1);
  }
  return null;
};

export const getManufacturer = (item) => {
  if (!item.rowData) return '';
  const keysToCheck = item.columnOrder?.length > 0 ? item.columnOrder : Object.keys(item.rowData);
  const manufacturerKeys = keysToCheck.filter(key => {
    if (!key) return false;
    const lowerKey = String(key).toLowerCase().trim();
    return (lowerKey.includes('hersteller') || lowerKey.includes('manufacturer') || lowerKey.includes('make') || (lowerKey.includes('brand') && !lowerKey.includes('marke'))) && !lowerKey.includes('marke') && !lowerKey.includes('datum');
  });
  if (manufacturerKeys.length > 0) {
    const value = item.rowData[manufacturerKeys[0]];
    if (value != null && value !== '') {
      const valueStr = String(value).trim();
      const lowerValue = valueStr.toLowerCase();
      if (lowerValue !== 'datum' && !KNOWN_CARRIERS.some(c => lowerValue.includes(c))) {
        const result = tryMatchManufacturer(valueStr, lowerValue);
        if (result) return result;
        return valueStr;
      }
    }
  }
  const markeKey = keysToCheck.find(key => key && String(key).toLowerCase().trim() === 'marke');
  if (markeKey) {
    const markeValue = item.rowData[markeKey];
    if (markeValue != null && markeValue !== '') {
      const markeValueStr = String(markeValue).trim();
      const lowerMarkeValue = markeValueStr.toLowerCase();
      if (lowerMarkeValue !== 'datum' && !KNOWN_CARRIERS.some(c => lowerMarkeValue.includes(c))) {
        const result = tryMatchManufacturer(markeValueStr, lowerMarkeValue);
        if (result) return result;
        return markeValueStr;
      }
    }
  }
  const skipKeys = [...['provider', 'netzbetreiber', 'carrier', 'imei', 'datum', 'date'], ...KNOWN_CARRIERS];
  const alreadyChecked = new Set([...manufacturerKeys.map(k => String(k).toLowerCase().trim()), markeKey && String(markeKey).toLowerCase().trim()].filter(Boolean));
  for (const key of keysToCheck) {
    if (!key || alreadyChecked.has(String(key).toLowerCase().trim()) || skipKeys.some(skip => String(key).toLowerCase().includes(skip))) continue;
    const value = item.rowData[key];
    if (value == null || value === '') continue;
    const valueStr = String(value).trim();
    if (valueStr === '' || valueStr.toLowerCase() === 'datum') continue;
    const lowerValue = valueStr.toLowerCase();
    const result = tryMatchManufacturer(valueStr, lowerValue);
    if (result) return result;
    const isCarrier = KNOWN_CARRIERS.some(c => lowerValue.includes(c));
    const isImeiColumn = String(key).toLowerCase().includes('imei');
    if (!isCarrier && !isImeiColumn && valueStr.length >= 2 && valueStr.length <= 50 && !/^\d+$/.test(valueStr)) return valueStr;
  }
  return '';
};

export const expandSelection = (currentImeis, startCellId, endCellId) => {
  const selected = new Set();
  let startRow = -1, startCol = -1, endRow = -1, endCol = -1;
  currentImeis.forEach((item, rowIdx) => {
    const rowId = `${item.sheet || 'default'}-${item.imei}-${item.row}`;
    const imeiCellId = `${rowId}-imei`;
    if (imeiCellId === startCellId) { startRow = rowIdx; startCol = 0; }
    if (imeiCellId === endCellId) { endRow = rowIdx; endCol = 0; }
    const mk = getManufacturerColumnKey(item);
    if (mk) {
      const mCellId = `${rowId}-${mk}`;
      if (mCellId === startCellId) { startRow = rowIdx; startCol = 1; }
      if (mCellId === endCellId) { endRow = rowIdx; endCol = 1; }
    }
  });
  if (startRow === -1 || endRow === -1) {
    selected.add(endCellId);
    return selected;
  }
  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);
  const minCol = Math.min(startCol, endCol);
  const maxCol = Math.max(startCol, endCol);
  for (let r = minRow; r <= maxRow; r++) {
    const item = currentImeis[r];
    if (!item) continue;
    const rowId = `${item.sheet || 'default'}-${item.imei}-${item.row}`;
    const mk = getManufacturerColumnKey(item);
    if (minCol <= 0 && maxCol >= 0) selected.add(`${rowId}-imei`);
    if (minCol <= 1 && maxCol >= 1 && mk) selected.add(`${rowId}-${mk}`);
  }
  return selected;
};
