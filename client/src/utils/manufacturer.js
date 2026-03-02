const KNOWN_MANUFACTURERS = ['apple', 'google', 'huawei', 'samsung', 'xiaomi', 'oneplus', 'oppo', 'vivo', 'realme', 'motorola', 'nokia', 'sony', 'lg', 'honor'];
const KNOWN_CARRIERS = ['o2', 'vodafone', 'telekom', 't-mobile', 'e-plus', 'base', 'otelo', 'blau', 'simyo', 'congstar'];
const SKIP_KEYS = ['marke', 'brand', 'provider', 'netzbetreiber', 'carrier', 'imei', ...KNOWN_CARRIERS];

export const getManufacturer = (item) => {
  if (!item?.rowData) return '';

  const keysToCheck = item.columnOrder?.length > 0
    ? item.columnOrder
    : Object.keys(item.rowData);

  const manufacturerKeys = keysToCheck.filter(key => {
    if (!key) return false;
    const lowerKey = String(key).toLowerCase().trim();
    return (lowerKey.includes('hersteller') || lowerKey.includes('manufacturer') || lowerKey.includes('make') ||
            (lowerKey.includes('brand') && !lowerKey.includes('marke'))) && !lowerKey.includes('marke');
  });

  if (manufacturerKeys.length > 0) {
    const value = item.rowData[manufacturerKeys[0]];
    if (value != null && value !== '') {
      const valueStr = String(value).trim();
      if (!KNOWN_CARRIERS.some(c => valueStr.toLowerCase().includes(c))) {
        return valueStr;
      }
    }
  }

  for (const key of keysToCheck) {
    if (!key || SKIP_KEYS.some(skip => String(key).toLowerCase().includes(skip))) continue;

    const value = item.rowData[key];
    if (value == null || value === '') continue;

    const valueStr = String(value).trim();
    const lowerValue = valueStr.toLowerCase();

    if (KNOWN_MANUFACTURERS.some(m => lowerValue.includes(m))) return valueStr;
    if (!KNOWN_CARRIERS.some(c => lowerValue.includes(c)) && !String(key).toLowerCase().includes('imei')) {
      return valueStr;
    }
  }

  return '';
};
