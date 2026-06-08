import {
  getProductFull,
  extractGB,
  extractColor,
  removeColorAndManufacturerFromProduct,
  getProduct as getProductUtil,
  hasO2Aktion
} from '../Imeis/utils/ImeisUtils';

const getProduct = (item) =>
  getProductUtil(item, (pn) => removeColorAndManufacturerFromProduct(pn, extractGB));

const convertToGB = (gbStr) => {
  const value = parseInt(String(gbStr).replace(/[^\d]/g, '')) || 0;
  return String(gbStr).toUpperCase().includes('TB') ? value * 1024 : value;
};

/** Produktliste wie IMEI-Seite (alle Hersteller, sortiert). */
export function buildGeraeteOptionsFromImeis(imeis = []) {
  const products = new Set();
  let hasO2AktionProducts = false;

  for (const item of imeis) {
    if (hasO2Aktion(item)) hasO2AktionProducts = true;
    const product = getProduct(item);
    if (product && product.trim()) products.add(product.trim());
  }

  const getBaseName = (name) =>
    name
      .replace(/\s+(pro|plus|mini|max|ultra|titan|titanium|standard|regular)\s*/gi, ' ')
      .replace(/\s+(pro|plus|mini|max|ultra|titan|titanium|standard|regular)$/gi, '')
      .trim();
  const extractVersion = (name) => {
    const m = name.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  };
  const getVariant = (name) => {
    const m = name.match(/\s+(pro|plus|mini|max|ultra|titan|titanium|standard|regular)\s*/i);
    return m ? m[1].toLowerCase() : '';
  };

  const productsArray = Array.from(products).sort((a, b) => {
    const gbA = extractGB(a);
    const gbB = extractGB(b);
    const nameA = a.replace(/\s*\d+\s*(GB|TB|gb|tb)\s*/gi, '').trim();
    const nameB = b.replace(/\s*\d+\s*(GB|TB|gb|tb)\s*/gi, '').trim();
    const baseNameA = getBaseName(nameA);
    const baseNameB = getBaseName(nameB);
    const versionA = extractVersion(nameA);
    const versionB = extractVersion(nameB);
    const variantA = getVariant(nameA);
    const variantB = getVariant(nameB);
    const baseCompare = baseNameA.localeCompare(baseNameB, undefined, { numeric: true, sensitivity: 'base' });
    if (baseCompare !== 0) return baseCompare;
    if (versionA !== versionB) return versionA - versionB;
    if (variantA !== variantB) return variantA.localeCompare(variantB);
    if (gbA && gbB) return convertToGB(gbA) - convertToGB(gbB);
    if (gbA && !gbB) return 1;
    if (!gbA && gbB) return -1;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });

  if (hasO2AktionProducts) productsArray.unshift('o2-Aktion');
  return productsArray;
}

/** Farben aus IMEI-Bestand für gewähltes Gerät (Produktzeile wie auf IMEI-Seite). */
export function buildFarbenForGeraet(imeis = [], geraet) {
  const key = String(geraet || '').trim();
  if (!key) return [];

  const colors = new Set();
  for (const item of imeis) {
    const product = getProduct(item);
    if (product?.trim() !== key) continue;
    const color = extractColor(getProductFull(item));
    if (color) colors.add(color);
  }

  return Array.from(colors).sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));
}

export function formatVerfuegbarkeit(value) {
  if (value === 'bestellen') return 'Bestellen';
  if (value === 'in_shop') return 'Im Shop';
  return '';
}

export function parseAusgabeDetails(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return {
      geraet: String(raw.geraet ?? '').trim(),
      farbe: String(raw.farbe ?? '').trim(),
      verfuegbarkeit: String(raw.verfuegbarkeit ?? '').trim()
    };
  }
  const legacy = String(raw ?? '').trim();
  return { geraet: legacy, farbe: '', verfuegbarkeit: '' };
}
