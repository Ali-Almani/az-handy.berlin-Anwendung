/**
 * Produkt-Extraktion (Version, Variante, Farbe, GB) aus Produktnamen
 */
export const getProductFull = (item) => {
  if (!item.rowData) return '';
  for (const [key, value] of Object.entries(item.rowData)) {
    if (!key) continue;
    const lowerKey = String(key).toLowerCase().trim();
    if ((lowerKey === 'produkt' || lowerKey === 'product' || lowerKey.includes('produkt') || lowerKey.includes('product')) &&
        value != null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
};

export const extractGB = (productName) => {
  if (!productName) return '';
  const match = String(productName).match(/(\d+)\s*(GB|TB|gb|tb)/i);
  return match ? `${match[1]}${match[2].toUpperCase()}` : '';
};

export const extractProductVersion = (productName) => {
  if (!productName) return '';
  let productStr = String(productName).trim().replace(/\s*\d+\s*(GB|TB|gb|tb)\s*/gi, ' ').trim();
  const iPhoneSEMatch = productStr.match(/iphone[\s\-_]?se(?:\s+\(.*?\))?(?:\s+(\d+)\s*gen)?/i);
  if (iPhoneSEMatch) return iPhoneSEMatch[1] ? `SE (${iPhoneSEMatch[1]}. Gen)` : 'SE';
  const iPhoneMatch = productStr.match(/iphone[\s\-_]?(\d+)/i);
  if (iPhoneMatch) return iPhoneMatch[1];
  const pixelMatch = productStr.match(/pixel[\s\-_]?(\d+)/i);
  if (pixelMatch) return pixelMatch[1];
  const galaxySMatch = productStr.match(/galaxy[\s\-_]?s[\s\-_]?(\d+)/i);
  if (galaxySMatch) return `S${galaxySMatch[1]}`;
  const galaxyNoteMatch = productStr.match(/galaxy[\s\-_]?note[\s\-_]?(\d+)/i);
  if (galaxyNoteMatch) return `Note ${galaxyNoteMatch[1]}`;
  const generalMatch = productStr.match(/(?:iphone|pixel|galaxy|xiaomi|oneplus|oppo|vivo|realme|huawei|honor|motorola|nokia)[\s\-_]?(\d+)/i);
  if (generalMatch) return generalMatch[1];
  const fallbackMatch = productStr.match(/(?:iphone|pixel|galaxy|xiaomi|oneplus|oppo|vivo|realme|huawei|honor|motorola|nokia)[^\d]*(?:[^\d\s]*\s+)?(\d+)(?!\s*(?:GB|TB|gb|tb))/i);
  return fallbackMatch ? fallbackMatch[1] : '';
};

export const extractProductVariant = (productName) => {
  if (!productName) return '';
  let productStr = String(productName).trim().replace(/\s*\d+\s*(GB|TB|gb|tb)\s*/gi, ' ');
  const variants = ['pro max', 'pro plus', 'ultra max', 'note ultra', 'pro', 'plus', 'mini', 'ultra', 'max', 'standard', 'regular', 'lite', 'titan', 'titanium', 'fold', 'flip'];
  const productLower = productStr.toLowerCase();
  for (const variant of [...variants].sort((a, b) => b.length - a.length)) {
    if (new RegExp(`\\b${variant}\\b`, 'i').test(productLower)) {
      return variant.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }
  return '';
};

const COLOR_LIST = [
  'natural titanium', 'blue titanium', 'white titanium', 'space gray', 'space grey', 'spacegray', 'spacegrey',
  'sierra blue', 'alpine green', 'pacific blue', 'product red', 'jet black', 'matte black', 'deep purple', 'light blue',
  'forest green', 'ocean blue', 'arctic white', 'phantom black', 'phantom white', 'aurora green', 'aurora blue',
  'prism white', 'prism black', 'prism blue', 'prism green', 'ceramic white', 'ceramic black', 'pearl white', 'pearl black',
  'cosmic black', 'cosmic grey', 'cosmic gray', 'aurora silver', 'aurora gray', 'aurora grey', 'aurora black',
  'phantom silver', 'phantom gray', 'phantom grey', 'schwarz', 'black', 'weiß', 'white', 'rot', 'red', 'blau', 'blue',
  'grün', 'green', 'gelb', 'yellow', 'grau', 'grey', 'gray', 'silber', 'silver', 'gold', 'golden', 'pink', 'rosa',
  'lila', 'purple', 'violett', 'violet', 'orange', 'türkis', 'turquoise', 'beige', 'braun', 'brown',
  'mint', 'coral', 'midnight', 'starlight', 'graphite', 'lavender', 'sunset', 'onyx black', 'onyx', 'titanium'
];

export const extractColor = (productName) => {
  if (!productName) return '';
  const productLower = String(productName).toLowerCase();
  for (const color of [...COLOR_LIST].sort((a, b) => b.length - a.length)) {
    if (new RegExp(`\\b${color}\\b`, 'i').test(productLower)) return color;
  }
  return '';
};

export const removeColorAndManufacturerFromProduct = (productName, extractGBFn) => {
  if (!productName) return '';
  const manufacturers = ['apple', 'google', 'samsung', 'huawei', 'xiaomi', 'oneplus', 'oppo', 'vivo', 'realme', 'motorola', 'nokia', 'sony', 'lg', 'honor'];
  let cleanedName = String(productName).trim();
  const gbValue = extractGBFn(cleanedName);
  cleanedName = cleanedName.replace(/^o2[- ]?aktion\s+/i, '').replace(/\s+o2[- ]?aktion\s+/i, ' ').replace(/\s+o2[- ]?aktion$/i, '');
  for (const m of manufacturers) {
    cleanedName = cleanedName.replace(new RegExp(`^${m}\\s+`, 'i'), '').replace(new RegExp(`\\s+${m}\\s+`, 'i'), ' ').replace(new RegExp(`\\s+${m}$`, 'i'), '');
  }
  cleanedName = cleanedName.replace(/\s*\d+\s*(GB|TB|gb|tb)\s*/gi, ' ');
  const sortedColors = [...COLOR_LIST].sort((a, b) => b.length - a.length);
  for (let i = 0; i < 5; i++) {
    let prevLen = cleanedName.length;
    for (const color of sortedColors) {
      cleanedName = cleanedName.replace(new RegExp(`^${color}\\s+`, 'i'), '').replace(new RegExp(`\\s+${color}\\s*$`, 'i'), '').replace(new RegExp(`\\s+${color}\\s+`, 'i'), ' ').replace(new RegExp(`[-_]${color}[-_]?`, 'i'), '');
    }
    cleanedName = cleanedName.replace(/\s+/g, ' ').trim();
    if (cleanedName.length === prevLen) break;
  }
  return (cleanedName + (gbValue ? ' ' + gbValue : '')).trim();
};

export const hasO2Aktion = (item) => {
  if (!item.rowData) return false;
  for (const [key, value] of Object.entries(item.rowData)) {
    if (!key) continue;
    const lowerKey = String(key).toLowerCase().trim();
    if ((lowerKey === 'produkt' || lowerKey === 'product' || lowerKey.includes('produkt') || lowerKey.includes('product')) && value != null && String(value).trim()) {
      const p = String(value).trim().toLowerCase();
      return p.includes('o2-aktion') || p.includes('o2 aktion');
    }
  }
  return false;
};

export const getProduct = (item, removeColorAndManufacturerFromProductFn) => {
  if (!item.rowData) return '';
  for (const [key, value] of Object.entries(item.rowData)) {
    if (!key) continue;
    const lowerKey = String(key).toLowerCase().trim();
    if ((lowerKey === 'produkt' || lowerKey === 'product' || lowerKey.includes('produkt') || lowerKey.includes('product')) && value != null && String(value).trim()) {
      return removeColorAndManufacturerFromProductFn(String(value).trim());
    }
  }
  return '';
};
