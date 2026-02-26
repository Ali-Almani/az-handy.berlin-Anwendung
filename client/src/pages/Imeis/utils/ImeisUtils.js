export const maskImei = (imei) => {
  if (!imei || typeof imei !== 'string') return imei;
  if (imei.length <= 4) return imei;
  const lastFour = imei.slice(-4);
  const masked = '*'.repeat(imei.length - 4) + lastFour;
  return masked;
};

export const getProductFull = (item) => {
  if (!item.rowData) return '';
  
  for (const [key, value] of Object.entries(item.rowData)) {
    if (!key) continue;
    const lowerKey = String(key).toLowerCase().trim();
    
    if (lowerKey === 'produkt' || lowerKey === 'product' || 
        lowerKey.includes('produkt') || lowerKey.includes('product')) {
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
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
  let productStr = String(productName).trim();
  
  productStr = productStr.replace(/\s*\d+\s*(GB|TB|gb|tb)\s*/gi, ' ');
  productStr = productStr.trim();
  
  const iPhoneSEMatch = productStr.match(/iphone[\s\-_]?se(?:\s+\(.*?\))?(?:\s+(\d+)\s*gen)?/i);
  if (iPhoneSEMatch) {
    const gen = iPhoneSEMatch[1];
    return gen ? `SE (${gen}. Gen)` : 'SE';
  }
  
  const iPhoneMatch = productStr.match(/iphone[\s\-_]?(\d+)/i);
  if (iPhoneMatch) {
    return iPhoneMatch[1];
  }
  
  const pixelMatch = productStr.match(/pixel[\s\-_]?(\d+)/i);
  if (pixelMatch) {
    return pixelMatch[1];
  }
  
  const galaxySMatch = productStr.match(/galaxy[\s\-_]?s[\s\-_]?(\d+)/i);
  if (galaxySMatch) {
    return `S${galaxySMatch[1]}`;
  }
  
  const galaxyNoteMatch = productStr.match(/galaxy[\s\-_]?note[\s\-_]?(\d+)/i);
  if (galaxyNoteMatch) {
    return `Note ${galaxyNoteMatch[1]}`;
  }
  
  const generalMatch = productStr.match(/(?:iphone|pixel|galaxy|xiaomi|oneplus|oppo|vivo|realme|huawei|honor|motorola|nokia)[\s\-_]?(\d+)/i);
  if (generalMatch) {
    return generalMatch[1];
  }
  
  const fallbackMatch = productStr.match(/(?:iphone|pixel|galaxy|xiaomi|oneplus|oppo|vivo|realme|huawei|honor|motorola|nokia)[^\d]*(?:[^\d\s]*\s+)?(\d+)(?!\s*(?:GB|TB|gb|tb))/i);
  return fallbackMatch ? fallbackMatch[1] : '';
};

export const extractProductVariant = (productName) => {
  if (!productName) return '';
  let productStr = String(productName).trim();
  
  productStr = productStr.replace(/\s*\d+\s*(GB|TB|gb|tb)\s*/gi, ' ');
  
  const variants = [
    'pro max', 'pro plus', 'ultra max', 'note ultra',
    'pro', 'plus', 'mini', 'ultra', 'max', 'standard', 'regular',
    'lite', 'titan', 'titanium', 'fold', 'flip'
  ];
  
  const productLower = productStr.toLowerCase();
  const sortedVariants = [...variants].sort((a, b) => b.length - a.length);
  
  for (const variant of sortedVariants) {
    const regex = new RegExp(`\\b${variant}\\b`, 'i');
    if (regex.test(productLower)) {
      return variant.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
  }
  
  return '';
};

export const extractColor = (productName) => {
  if (!productName) return '';
  
  const colors = [
    'natural titanium', 'blue titanium', 'white titanium', 'space gray', 'space grey',
    'spacegray', 'spacegrey', 'sierra blue', 'alpine green', 'pacific blue',
    'product red', 'jet black', 'matte black', 'deep purple', 'light blue',
    'forest green', 'ocean blue', 'arctic white', 'phantom black', 'phantom white',
    'aurora green', 'aurora blue', 'prism white', 'prism black', 'prism blue',
    'prism green', 'ceramic white', 'ceramic black', 'pearl white', 'pearl black',
    'cosmic black', 'cosmic grey', 'cosmic gray', 'aurora silver', 'aurora gray',
    'aurora grey', 'aurora black', 'phantom silver', 'phantom gray', 'phantom grey',
    'schwarz', 'black', 'weiß', 'white', 'rot', 'red', 'blau', 'blue',
    'grün', 'green', 'gelb', 'yellow', 'grau', 'grey', 'gray', 'silber',
    'silver', 'gold', 'golden', 'pink', 'rosa', 'lila', 'purple', 'violett',
    'violet', 'orange', 'türkis', 'turquoise', 'beige', 'braun', 'brown',
    'mint', 'coral', 'midnight', 'starlight', 'graphite', 'lavender', 'sunset',
    'onyx black', 'onyx', 'titanium'
  ];
  
  const productLower = String(productName).toLowerCase();
  const sortedColors = [...colors].sort((a, b) => b.length - a.length);
  
  for (const color of sortedColors) {
    const regex = new RegExp(`\\b${color}\\b`, 'i');
    if (regex.test(productLower)) {
      return color;
    }
  }
  
  return '';
};

export const removeColorAndManufacturerFromProduct = (productName, extractGBFn) => {
  if (!productName) return '';
  
  const colors = [
    'natural titanium', 'blue titanium', 'white titanium', 'space gray', 'space grey',
    'spacegray', 'spacegrey', 'sierra blue', 'alpine green', 'pacific blue',
    'product red', 'jet black', 'matte black', 'deep purple', 'light blue',
    'forest green', 'ocean blue', 'arctic white', 'phantom black', 'phantom white',
    'aurora green', 'aurora blue', 'prism white', 'prism black', 'prism blue',
    'prism green', 'ceramic white', 'ceramic black', 'pearl white', 'pearl black',
    'cosmic black', 'cosmic grey', 'cosmic gray', 'aurora silver', 'aurora gray',
    'aurora grey', 'aurora black', 'phantom silver', 'phantom gray', 'phantom grey',
    'schwarz', 'black', 'weiß', 'white', 'rot', 'red', 'blau', 'blue',
    'grün', 'green', 'gelb', 'yellow', 'grau', 'grey', 'gray', 'silber',
    'silver', 'gold', 'golden', 'pink', 'rosa', 'lila', 'purple', 'violett',
    'violet', 'orange', 'türkis', 'turquoise', 'beige', 'braun', 'brown',
    'mint', 'coral', 'midnight', 'starlight', 'graphite', 'lavender', 'sunset',
    'onyx black', 'onyx', 'titanium'
  ];
  
  const manufacturers = [
    'apple', 'google', 'samsung', 'huawei', 'xiaomi', 'oneplus', 'oppo', 
    'vivo', 'realme', 'motorola', 'nokia', 'sony', 'lg', 'honor'
  ];
  
  let cleanedName = String(productName).trim();
  
  const gbValue = extractGBFn(cleanedName);
  
  cleanedName = cleanedName.replace(/^o2[- ]?aktion\s+/i, '');
  cleanedName = cleanedName.replace(/\s+o2[- ]?aktion\s+/i, ' ');
  cleanedName = cleanedName.replace(/\s+o2[- ]?aktion$/i, '');
  
  for (const manufacturer of manufacturers) {
    const regexStart = new RegExp(`^${manufacturer}\\s+`, 'i');
    cleanedName = cleanedName.replace(regexStart, '');
    
    const regexMiddle = new RegExp(`\\s+${manufacturer}\\s+`, 'i');
    cleanedName = cleanedName.replace(regexMiddle, ' ');
    
    const regexEnd = new RegExp(`\\s+${manufacturer}$`, 'i');
    cleanedName = cleanedName.replace(regexEnd, '');
  }
  
  cleanedName = cleanedName.replace(/\s*\d+\s*(GB|TB|gb|tb)\s*/gi, ' ');
  
  const sortedColors = [...colors].sort((a, b) => b.length - a.length);
  
  let previousLength = cleanedName.length;
  let iterations = 0;
  const maxIterations = 5;
  
  while (iterations < maxIterations) {
    for (const color of sortedColors) {
      const regexStart = new RegExp(`^${color}\\s+`, 'i');
      cleanedName = cleanedName.replace(regexStart, '');
      
      const regexEnd = new RegExp(`\\s+${color}\\s*$`, 'i');
      cleanedName = cleanedName.replace(regexEnd, '');
      
      const regexMiddle = new RegExp(`\\s+${color}\\s+`, 'i');
      cleanedName = cleanedName.replace(regexMiddle, ' ');
      
      const regexHyphen = new RegExp(`[-_]${color}[-_]?`, 'i');
      cleanedName = cleanedName.replace(regexHyphen, '');
    }
    
    cleanedName = cleanedName.replace(/\s+/g, ' ').trim();
    
    if (cleanedName.length === previousLength) {
      break;
    }
    previousLength = cleanedName.length;
    iterations++;
  }
  
  cleanedName = cleanedName.replace(/\s+/g, ' ').trim();
  
  if (gbValue) {
    cleanedName = cleanedName + ' ' + gbValue;
  }
  
  return cleanedName.trim();
};

export const hasO2Aktion = (item) => {
  if (!item.rowData) return false;
  
  for (const [key, value] of Object.entries(item.rowData)) {
    if (!key) continue;
    const lowerKey = String(key).toLowerCase().trim();
    
    if (lowerKey === 'produkt' || lowerKey === 'product' || 
        lowerKey.includes('produkt') || lowerKey.includes('product')) {
      if (value !== undefined && value !== null && String(value).trim()) {
        const productName = String(value).trim().toLowerCase();
        return productName.includes('o2-aktion') || productName.includes('o2 aktion');
      }
    }
  }
  
  return false;
};

export const getProduct = (item, removeColorAndManufacturerFromProductFn) => {
  if (!item.rowData) return '';
  
  for (const [key, value] of Object.entries(item.rowData)) {
    if (!key) continue;
    const lowerKey = String(key).toLowerCase().trim();
    
    if (lowerKey === 'produkt' || lowerKey === 'product' || 
        lowerKey.includes('produkt') || lowerKey.includes('product')) {
      if (value !== undefined && value !== null && String(value).trim()) {
        const productName = String(value).trim();
        return removeColorAndManufacturerFromProductFn(productName);
      }
    }
  }
  
  return '';
};

export const getManufacturer = (item) => {
  if (!item.rowData) return '';
  
  const knownManufacturers = ['apple', 'google', 'huawei', 'samsung', 'xiaomi', 'oneplus', 'oppo', 'vivo', 'realme', 'motorola', 'nokia', 'sony', 'lg', 'honor', 'o2', 'nothing'];
  const knownCarriers = ['vodafone', 'telekom', 't-mobile', 'e-plus', 'base', 'otelo', 'blau', 'simyo', 'congstar'];
  
  const keysToCheck = item.columnOrder && Array.isArray(item.columnOrder) && item.columnOrder.length > 0
    ? item.columnOrder
    : Object.keys(item.rowData);
  
  const manufacturerKeys = keysToCheck.filter(key => {
    if (!key) return false;
    const lowerKey = String(key).toLowerCase().trim();
    return (lowerKey.includes('hersteller') || 
           lowerKey.includes('manufacturer') || 
           lowerKey.includes('make') ||
           (lowerKey.includes('brand') && !lowerKey.includes('marke'))) &&
           !lowerKey.includes('marke') &&
           !lowerKey.includes('datum');
  });
  
  if (manufacturerKeys.length > 0) {
    const manufacturerKey = manufacturerKeys[0];
    const value = item.rowData[manufacturerKey];
    if (value !== undefined && value !== null && value !== '') {
      const valueStr = String(value).trim();
      const lowerValue = valueStr.toLowerCase();
      if (lowerValue !== 'datum' && !knownCarriers.some(carrier => lowerValue.includes(carrier))) {
        const matchedManufacturer = knownManufacturers.find(manufacturer => {
          return lowerValue === manufacturer || lowerValue.includes(manufacturer) || manufacturer.includes(lowerValue);
        });
        if (matchedManufacturer) {
          if (matchedManufacturer === 'o2') {
            return 'o2 Prepaid';
          }
          if (lowerValue === matchedManufacturer) {
            return valueStr;
          } else if (lowerValue.includes(matchedManufacturer)) {
            return matchedManufacturer.charAt(0).toUpperCase() + matchedManufacturer.slice(1);
          }
        }
        return valueStr;
      }
    }
  }
  
  const markeKey = keysToCheck.find(key => {
    if (!key) return false;
    const lowerKey = String(key).toLowerCase().trim();
    return lowerKey === 'marke';
  });
  
  if (markeKey) {
    const markeValue = item.rowData[markeKey];
    if (markeValue !== undefined && markeValue !== null && markeValue !== '') {
      const markeValueStr = String(markeValue).trim();
      const lowerMarkeValue = markeValueStr.toLowerCase();
      if (lowerMarkeValue !== 'datum' && !knownCarriers.some(carrier => lowerMarkeValue.includes(carrier))) {
        const matchedManufacturer = knownManufacturers.find(manufacturer => {
          return lowerMarkeValue === manufacturer || lowerMarkeValue.includes(manufacturer) || manufacturer.includes(lowerMarkeValue);
        });
        if (matchedManufacturer) {
          if (matchedManufacturer === 'o2') {
            return 'o2 Prepaid';
          }
          if (lowerMarkeValue === matchedManufacturer) {
            return markeValueStr;
          } else {
            return matchedManufacturer.charAt(0).toUpperCase() + matchedManufacturer.slice(1);
          }
        }
        return markeValueStr;
      }
    }
  }
  
  const skipKeys = ['provider', 'netzbetreiber', 'carrier', 'imei', 'datum', 'date'];
  skipKeys.push(...knownCarriers);
  
  const alreadyCheckedKeys = new Set();
  if (manufacturerKeys.length > 0) {
    manufacturerKeys.forEach(key => alreadyCheckedKeys.add(key.toLowerCase().trim()));
  }
  if (markeKey) {
    alreadyCheckedKeys.add(String(markeKey).toLowerCase().trim());
  }
  
  for (const key of keysToCheck) {
    if (!key) continue;
    const lowerKey = String(key).toLowerCase().trim();
    
    if (alreadyCheckedKeys.has(lowerKey)) {
      continue;
    }
    
    if (skipKeys.some(skip => lowerKey.includes(skip))) {
      continue;
    }
    
    const value = item.rowData[key];
    if (value !== undefined && value !== null && value !== '') {
      const valueStr = String(value).trim();
      if (valueStr === '') continue;
      
      const lowerValue = valueStr.toLowerCase();
      
      if (lowerValue === 'datum') {
        continue;
      }
      
      const matchedManufacturer = knownManufacturers.find(manufacturer => {
        return lowerValue === manufacturer || lowerValue.includes(manufacturer) || manufacturer.includes(lowerValue);
      });
      if (matchedManufacturer) {
        if (matchedManufacturer === 'o2') {
          return 'o2 Prepaid';
        }
        if (lowerValue === matchedManufacturer) {
          return valueStr;
        } else if (lowerValue.includes(matchedManufacturer)) {
          return matchedManufacturer.charAt(0).toUpperCase() + matchedManufacturer.slice(1);
        }
        return valueStr;
      }
      
      const isCarrier = knownCarriers.some(carrier => lowerValue.includes(carrier));
      const isImeiColumn = lowerKey.includes('imei');
      
      if (!isCarrier && !isImeiColumn) {
        if (valueStr.length >= 2 && valueStr.length <= 50) {
          if (!/^\d+$/.test(valueStr)) {
            return valueStr;
          }
        }
      }
    }
  }
  
  return '';
};
