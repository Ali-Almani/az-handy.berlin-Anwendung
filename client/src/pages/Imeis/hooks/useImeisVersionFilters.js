import { useEffect } from 'react';
import { isAppleManufacturerName, isAppleWatchProductFull } from '../utils/imeisProductUtils';

const convertToGB = (gbStr) => {
  const value = parseInt(gbStr.replace(/[^\d]/g, '')) || 0;
  return gbStr.toUpperCase().includes('TB') ? value * 1024 : value;
};

export function useImeisVersionFilters({
  activeManufacturer,
  activeAppleHardwareTab,
  activeProduct,
  activeVersion,
  activeVariant,
  activeGB,
  imeis,
  getManufacturer,
  getProductFull,
  getProduct,
  hasO2Aktion,
  extractProductVersion,
  extractProductVariant,
  extractGB,
  extractColor,
  setAvailableProducts,
  setActiveProduct,
  setAvailableVersions,
  setAvailableVariants,
  setAvailableGBs,
  setAvailableColors,
  setActiveVersion,
  setActiveVariant,
  setActiveGB,
  setActiveColor
}) {
  useEffect(() => {
    if (!activeManufacturer) {
      setAvailableProducts([]);
      setActiveProduct(null);
      setAvailableVersions([]);
      setAvailableVariants([]);
      setAvailableGBs([]);
      setAvailableColors([]);
      setActiveVersion(null);
      setActiveVariant(null);
      setActiveGB(null);
      setActiveColor(null);
      return;
    }

    // Leere Liste kurzzeitig (z. B. API-/Netzwerkfehler beim Poll): Filter nicht zurücksetzen,
    // sonst springt useImeisMainFilter auf Seite 1 und Pagination wirkt „kaputt“.
    if (imeis.length === 0) return;

    let allManufacturerItems = imeis.filter(item => {
      const manufacturer = getManufacturer(item);
      return manufacturer && manufacturer.trim() === activeManufacturer;
    });
    if (activeManufacturer && isAppleManufacturerName(activeManufacturer) && activeAppleHardwareTab) {
      allManufacturerItems = allManufacturerItems.filter((item) => {
        const pf = getProductFull(item);
        const isWatch = isAppleWatchProductFull(pf);
        if (activeAppleHardwareTab === 'watch') return isWatch;
        if (activeAppleHardwareTab === 'iphone') return !isWatch;
        return true;
      });
    }

    const versions = new Set();
    allManufacturerItems.forEach(item => {
      const productFull = getProductFull(item);
      const version = extractProductVersion(productFull);
      if (version) versions.add(version);
    });
    const versionsArray = Array.from(versions).sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
    setAvailableVersions(versionsArray);

    if (activeVersion) {
      const versionFiltered = allManufacturerItems.filter(item => {
        const productFull = getProductFull(item);
        return extractProductVersion(productFull) === activeVersion;
      });
      const variants = new Set();
      versionFiltered.forEach(item => {
        const variant = extractProductVariant(getProductFull(item));
        variants.add(variant || '');
      });
      setAvailableVariants(Array.from(variants).sort((a, b) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b))));
    } else {
      setAvailableVariants([]);
    }

    if (activeVersion && activeVariant !== null) {
      const versionVariantFiltered = allManufacturerItems.filter(item => {
        const productFull = getProductFull(item);
        const version = extractProductVersion(productFull);
        const variant = extractProductVariant(productFull);
        if (version !== activeVersion) return false;
        if (activeVariant === '') return variant === '';
        return variant === activeVariant;
      });
      const gbs = new Set();
      versionVariantFiltered.forEach(item => {
        const gb = extractGB(getProductFull(item));
        if (gb) gbs.add(gb);
      });
      setAvailableGBs(Array.from(gbs).sort((a, b) => convertToGB(a) - convertToGB(b)));
    } else {
      setAvailableGBs([]);
    }

    if (activeVersion && activeVariant !== null && activeGB) {
      const versionVariantGBFiltered = allManufacturerItems.filter(item => {
        const productFull = getProductFull(item);
        const version = extractProductVersion(productFull);
        const variant = extractProductVariant(productFull);
        const gb = extractGB(productFull);
        if (version !== activeVersion) return false;
        if (activeVariant === '') { if (variant !== '') return false; } else { if (variant !== activeVariant) return false; }
        return gb === activeGB;
      });
      const colors = new Set();
      versionVariantGBFiltered.forEach(item => {
        const color = extractColor(getProductFull(item));
        if (color) colors.add(color);
      });
      setAvailableColors(Array.from(colors).sort());
    } else {
      setAvailableColors([]);
    }

    if (activeVersion && !versionsArray.includes(activeVersion)) {
      setActiveVersion(null);
      setActiveVariant(null);
      setActiveGB(null);
      setActiveColor(null);
    }
    if (activeVariant !== null && activeVersion) {
      const currentVariants = new Set();
      allManufacturerItems.forEach(item => {
        const productFull = getProductFull(item);
        if (extractProductVersion(productFull) === activeVersion) {
          currentVariants.add(extractProductVariant(productFull) || '');
        }
      });
      if (!Array.from(currentVariants).includes(activeVariant)) {
        setActiveVariant(null);
        setActiveGB(null);
        setActiveColor(null);
      }
    }
    if (activeGB && activeVersion && activeVariant !== null) {
      const currentGBs = new Set();
      allManufacturerItems.forEach(item => {
        const productFull = getProductFull(item);
        const version = extractProductVersion(productFull);
        const variant = extractProductVariant(productFull);
        if (version === activeVersion && (activeVariant === '' ? variant === '' : variant === activeVariant)) {
          const gb = extractGB(productFull);
          if (gb) currentGBs.add(gb);
        }
      });
      if (!Array.from(currentGBs).includes(activeGB)) {
        setActiveGB(null);
        setActiveColor(null);
      }
    }
  }, [activeManufacturer, activeAppleHardwareTab, activeVersion, activeVariant, activeGB, imeis, getManufacturer, getProductFull, extractProductVersion, extractProductVariant, extractGB, extractColor]);

  useEffect(() => {
    if (!activeManufacturer) {
      setAvailableProducts([]);
      setActiveProduct(null);
      return;
    }
    if (imeis.length === 0) return;
    const products = new Set();
    let hasO2AktionProducts = false;
    imeis.forEach(item => {
      const manufacturer = getManufacturer(item);
      if (!manufacturer || manufacturer.trim() !== activeManufacturer) return;
      const productFull = getProductFull(item);
      if (activeManufacturer && isAppleManufacturerName(activeManufacturer) && activeAppleHardwareTab) {
        const isWatch = isAppleWatchProductFull(productFull);
        if (activeAppleHardwareTab === 'watch' && !isWatch) return;
        if (activeAppleHardwareTab === 'iphone' && isWatch) return;
      }
      if (hasO2Aktion(item)) hasO2AktionProducts = true;
      const product = getProduct(item);
      if (product && product.trim() !== '') products.add(product.trim());
    });
    const getBaseName = (name) => name.replace(/\s+(pro|plus|mini|max|ultra|titan|titanium|standard|regular)\s*/gi, ' ').replace(/\s+(pro|plus|mini|max|ultra|titan|titanium|standard|regular)$/gi, '').trim();
    const extractVersion = (name) => { const m = name.match(/(\d+)/); return m ? parseInt(m[1]) : 0; };
    const getVariant = (name) => { const m = name.match(/\s+(pro|plus|mini|max|ultra|titan|titanium|standard|regular)\s*/i); return m ? m[1].toLowerCase() : ''; };
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
    setAvailableProducts(productsArray);
    if (activeProduct && !productsArray.includes(activeProduct)) setActiveProduct(null);
  }, [activeManufacturer, activeAppleHardwareTab, imeis, getManufacturer, getProduct, getProductFull, activeProduct, hasO2Aktion, extractGB]);
}
