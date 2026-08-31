import { getProductFull, extractGB, extractProductVariant } from './ImeisUtils';

/** Extrahiert Produktname bis zur Version - verwendet getProductFull aus ImeisUtils */
export const getProductToVersion = (item, getProductFullFn) => {
  const gpf = getProductFullFn || getProductFull;
  const productFull = gpf(item);
  if (!productFull || productFull.trim() === '') return null;

  let productStr = String(productFull).trim();
  productStr = productStr.replace(/\s*ultramarin\s*/gi, ' ').replace(/ultramarin/gi, '');
  productStr = productStr.replace(/\s*marin\s*/gi, ' ').replace(/marin/gi, '');
  productStr = productStr.replace(/\s+/g, ' ').trim();
  productStr = productStr.replace(/\s*\d+\s*(GB|TB|gb|tb)\s*/gi, ' ').trim();
  productStr = productStr.replace(/^o2[- ]?aktion\s+/i, '').replace(/\s+o2[- ]?aktion\s+/gi, ' ').replace(/\s+o2[- ]?aktion$/i, '').trim();

  const manufacturers = ['apple', 'google', 'samsung', 'huawei', 'xiaomi', 'oneplus', 'oppo', 'vivo', 'realme', 'motorola', 'nokia', 'sony', 'lg', 'honor'];
  manufacturers.forEach(m => {
    productStr = productStr.replace(new RegExp(`^${m}\\s+`, 'i'), '').replace(new RegExp(`\\s+${m}\\s+`, 'i'), ' ');
  });
  productStr = productStr.trim();

  const colors = ['natural titanium', 'blue titanium', 'white titanium', 'space gray', 'space grey', 'spacegray', 'spacegrey', 'sierra blue', 'alpine green', 'pacific blue', 'product red', 'jet black', 'matte black', 'deep purple', 'light blue', 'forest green', 'ocean blue', 'arctic white', 'phantom black', 'phantom white', 'aurora green', 'aurora blue', 'prism white', 'prism black', 'prism blue', 'prism green', 'ceramic white', 'ceramic black', 'pearl white', 'pearl black', 'cosmic black', 'cosmic grey', 'cosmic gray', 'aurora silver', 'aurora gray', 'aurora grey', 'aurora black', 'phantom silver', 'phantom gray', 'phantom grey', 'schwarz', 'black', 'weiß', 'weiss', 'white', 'rot', 'red', 'blau', 'blue', 'grün', 'green', 'gelb', 'yellow', 'grau', 'grey', 'gray', 'silber', 'silver', 'gold', 'golden', 'pink', 'rosa', 'lila', 'purple', 'violett', 'violet', 'orange', 'türkis', 'turquoise', 'beige', 'braun', 'brown', 'mint', 'coral', 'midnight', 'mitternacht', 'mittern', 'starlight', 'graphite', 'graphit', 'lavender', 'sunset', 'onyx black', 'onyx', 'titanium', 'tiefblau', 'salbei', 'cosmic', 'titan', 'lavendel', 'nebelblau', 'blaugrün', 'blaugruen', 'ultramarin', 'marin', 'wüstensand', 'wuestensand', 'natur', 'natural', 'titanium blue', 'titanium white', 'titanium natural', 'polarstern', 'lightgray', 'light gray', 'olive', 'dunkelblau', 'iris', 'obsidian', 'porcelain', 'arcanine', 'ocean', 'trail', 'alpine', 'awesome'];

  const sortedColors = [...colors].sort((a, b) => b.length - a.length);
  for (let i = 0; i < 15; i++) {
    let prevLen = productStr.length;
    sortedColors.forEach(color => {
      const esc = color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      productStr = productStr.replace(new RegExp(`^${esc}\\s+`, 'i'), '').replace(new RegExp(`\\s+${esc}\\s*$`, 'i'), '').replace(new RegExp(`\\s+${esc}\\s+`, 'i'), ' ').replace(new RegExp(`[-_]${esc}[-_]?`, 'i'), '').replace(new RegExp(`(\\d+)\\s+${esc}\\b`, 'gi'), '$1').replace(new RegExp(`(\\w+)\\s+${esc}\\b`, 'gi'), '$1');
    });
    productStr = productStr.replace(/\s+/g, ' ').trim();
    if (productStr.length === prevLen) break;
  }

  productStr = productStr.replace(/(\d+)\s+marin/gi, '$1').replace(/\s+marin\s*$/gi, '').replace(/\s+marin\b/gi, '').replace(/\s+marin\s+/gi, ' ');
  productStr = productStr.replace(/\s+/g, ' ').trim();

  const variants = ['pro max', 'pro plus', 'ultra max', 'note ultra', 'pro', 'plus', 'mini', 'ultra', 'max', 'standard', 'regular', 'lite', 'titan', 'titanium', 'fold', 'flip'];
  variants.forEach(v => { productStr = productStr.replace(new RegExp(`\\s+${v}\\s*`, 'i'), ' '); });
  productStr = productStr.replace(/\s*\([^)]*\)\s*/gi, ' ').replace(/\s*5G\s*/gi, ' ').replace(/\s*Dual SIM\s*/gi, ' ').replace(/\s*LTE\s*/gi, ' ').replace(/\s*\d+mm\s*/gi, ' ').replace(/\s*Alu\s*/gi, ' ').replace(/\s*Sport\s*/gi, ' ').replace(/\s*S\/M\s*/gi, ' ').replace(/\s*M4\s*/gi, ' ').replace(/\s*CPE\s*/gi, ' ').replace(/\s*\d+S\s*/gi, ' ').replace(/\s*Router\s*/gi, ' ').replace(/\s*Smartwatch\s*/gi, ' ').replace(/\s*Nano SIM\s*/gi, ' ').replace(/\s*Gen\s*/gi, ' ').replace(/\s*\.\s*/g, ' ').replace(/\s*-\s*/g, ' ').replace(/\s*\d{4}\s*/g, ' ').replace(/\s*BL\s*/gi, ' ').replace(/\s*ASUS\s*/gi, ' ').replace(/\s*CM\d+\s*/gi, ' ').replace(/\s*\+.*$/gi, ' ').replace(/\s*Edge\s*/gi, ' ').replace(/\s*FE\s*/gi, ' ').replace(/\s*Brovi\s*/gi, ' ').replace(/\s*H\d+-\d+\s*/gi, ' ').replace(/\s*B\d+-\d+\s*/gi, ' ').replace(/\s*X\d+\s*/gi, ' ').replace(/\s*Play\s*/gi, ' ').replace(/\s*\d+\.\s*/gi, ' ').replace(/\s+/g, ' ').trim();

  return productStr || null;
};

/** Versionsnummer für Sortierung */
export const getVersionNumber = (versionName) => {
  if (!versionName) return -1;
  const s = String(versionName).trim().toLowerCase();
  if (s.includes('iphone se')) return 0;
  const m = s.match(/iphone[\s\-_]?(\d+)|pixel[\s\-_]?(\d+)|galaxy[\s\-_]?s[\s\-_]?(\d+)|galaxy[\s\-_]?note[\s\-_]?(\d+)|(?:iphone|pixel|galaxy|xiaomi|oneplus|oppo|vivo|realme|huawei|honor|motorola|nokia)[\s\-_]?(\d+)|(\d+)/);
  return m ? parseInt(m.slice(1).find(Boolean) || '0', 10) : -1;
};

/** Berechnet Zustandsdaten für Bestand-Modal */
export const getZustandData = (imeis, rowActions, { getManufacturer, getProductFull: gpf, extractProductVariant: epv, extractGB: eg }) => {
  const manufacturerData = {};
  let totalCount = 0;

  imeis.forEach(item => {
    const rowId = `${item.sheet || 'default'}-${item.imei}-${item.row}`;
    if (rowActions[rowId]?.action === 'reservieren') return;
    totalCount++;

    const manufacturer = getManufacturer(item);
    const productFull = gpf(item);
    let productName = getProductToVersion(item, gpf);
    if (productName) {
      productName = productName.replace(/\s*ultramarin\s*/gi, ' ').replace(/ultramarin/gi, '').replace(/(\d+)e\b/gi, '$1').replace(/\s+/g, ' ').trim().replace(/^iphone\s+/i, 'iPhone ');
    }

    const variant = epv(productFull) || '';
    const gb = eg(productFull) || '';
    const mKey = manufacturer?.trim() || 'Unbekannt';
    const vKey = (productName || 'Unbekannt').trim();
    const varKey = variant || 'Standard';
    const gbKey = gb || 'Unbekannt';

    if (!manufacturerData[mKey]) manufacturerData[mKey] = {};
    if (!manufacturerData[mKey][vKey]) manufacturerData[mKey][vKey] = {};
    if (!manufacturerData[mKey][vKey][varKey]) manufacturerData[mKey][vKey][varKey] = {};
    manufacturerData[mKey][vKey][varKey][gbKey] = (manufacturerData[mKey][vKey][varKey][gbKey] || 0) + 1;
  });

  const sortedData = Object.entries(manufacturerData).map(([manufacturer, versions]) => {
    const sortedVersions = Object.entries(versions).map(([version, variants]) => ({
      version,
      variants: Object.entries(variants).map(([variant, gbs]) => ({
        variant,
        gbs: Object.entries(gbs).map(([gb, count]) => ({ gb, count })).sort((a, b) => (parseInt(b.gb.match(/\d+/)?.[0] || '0', 10) - parseInt(a.gb.match(/\d+/)?.[0] || '0', 10)))
      })).sort((a, b) => (a.variant === 'Standard' ? -1 : b.variant === 'Standard' ? 1 : a.variant.localeCompare(b.variant)))
    })).sort((a, b) => {
      const va = a.version.toLowerCase();
      const vb = b.version.toLowerCase();
      const numA = getVersionNumber(a.version);
      const numB = getVersionNumber(b.version);
      if (manufacturer.toLowerCase() === 'apple') {
        const aIPhone = va.includes('iphone'), bIPhone = vb.includes('iphone');
        if (aIPhone && !bIPhone) return -1;
        if (!aIPhone && bIPhone) return 1;
      }
      if (manufacturer.toLowerCase() === 'samsung') {
        const aGalaxyS = va.includes('galaxy s') || /galaxy\s+s\d+/i.test(va);
        const bGalaxyS = vb.includes('galaxy s') || /galaxy\s+s\d+/i.test(vb);
        if (aGalaxyS && !bGalaxyS) return -1;
        if (!aGalaxyS && bGalaxyS) return 1;
      }
      if (numA >= 0 && numB >= 0) return numB - numA;
      if (numA >= 0) return -1;
      if (numB >= 0) return 1;
      return a.version.localeCompare(b.version);
    });

    const total = sortedVersions.reduce((sum, v) => sum + v.variants.reduce((s, vr) => s + vr.gbs.reduce((t, g) => t + g.count, 0), 0), 0);
    return { manufacturer, versions: sortedVersions, total };
  }).sort((a, b) => (b.total !== a.total ? b.total - a.total : a.manufacturer.localeCompare(b.manufacturer)));

  return { manufacturers: sortedData, total: totalCount };
};
