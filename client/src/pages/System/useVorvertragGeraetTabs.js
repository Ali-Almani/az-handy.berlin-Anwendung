import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useImeisVersionFilters } from '../Imeis/hooks/useImeisVersionFilters';
import {
  extractColor as extractColorUtil,
  extractGB as extractGBUtil,
  extractProductVariant as extractProductVariantUtil,
  extractProductVersion as extractProductVersionUtil,
  getManufacturer as getManufacturerUtil,
  getProduct as getProductUtil,
  getProductFull as getProductFullUtil,
  hasO2Aktion as hasO2AktionUtil,
  removeColorAndManufacturerFromProduct as removeColorAndManufacturerFromProductUtil
} from '../Imeis/utils/ImeisUtils';
import { isAppleManufacturerName, isAppleWatchProductFull } from '../Imeis/utils/imeisProductUtils';

const extractGB = extractGBUtil;
const extractProductVersion = extractProductVersionUtil;
const extractProductVariant = extractProductVariantUtil;
const extractColor = extractColorUtil;
const getProductFull = getProductFullUtil;
const getManufacturer = getManufacturerUtil;
const hasO2Aktion = hasO2AktionUtil;

function getProduct(item) {
  return getProductUtil(item, (pn) =>
    removeColorAndManufacturerFromProductUtil(pn, extractGBUtil)
  );
}

function filterImeisByTabs(imeis, {
  activeManufacturer,
  activeAppleHardwareTab,
  activeVersion,
  activeVariant,
  activeGB
}) {
  if (!activeManufacturer) return [];

  let filtered = imeis.filter((item) => {
    const manufacturer = getManufacturer(item);
    return manufacturer && manufacturer.trim() === activeManufacturer;
  });

  if (isAppleManufacturerName(activeManufacturer) && activeAppleHardwareTab) {
    filtered = filtered.filter((item) => {
      const pf = getProductFull(item);
      const isWatch = isAppleWatchProductFull(pf);
      if (activeAppleHardwareTab === 'watch') return isWatch;
      if (activeAppleHardwareTab === 'iphone') return !isWatch;
      return true;
    });
  }

  if (activeVersion) {
    filtered = filtered.filter(
      (item) => extractProductVersion(getProductFull(item)) === activeVersion
    );
  }

  if (activeVersion && activeVariant !== null) {
    filtered = filtered.filter((item) => {
      const productFull = getProductFull(item);
      const version = extractProductVersion(productFull);
      const variant = extractProductVariant(productFull);
      if (version !== activeVersion) return false;
      if (activeVariant === '') return variant === '';
      return variant === activeVariant;
    });
  }

  if (activeVersion && activeVariant !== null && activeGB) {
    filtered = filtered.filter(
      (item) => extractGB(getProductFull(item)) === activeGB
    );
  }

  return filtered;
}

export function findTabStateForGeraet(imeis, geraet) {
  if (!geraet || !imeis.length) return null;

  if (geraet === 'o2-Aktion') {
    const match = imeis.find((item) => hasO2Aktion(item));
    const manufacturer = match ? getManufacturer(match)?.trim() : null;
    return {
      activeManufacturer: manufacturer,
      activeAppleHardwareTab: null,
      activeProduct: geraet,
      activeVersion: null,
      activeVariant: null,
      activeGB: null
    };
  }

  const match = imeis.find((item) => getProduct(item) === geraet);
  if (!match) {
    return { activeProduct: geraet };
  }

  const manufacturer = getManufacturer(match)?.trim();
  const productFull = getProductFull(match);
  const version = extractProductVersion(productFull);
  const variant = extractProductVariant(productFull) || '';
  const gb = extractGB(productFull);

  let appleTab = null;
  if (manufacturer && isAppleManufacturerName(manufacturer)) {
    appleTab = isAppleWatchProductFull(productFull) ? 'watch' : 'iphone';
  }

  if (version) {
    return {
      activeManufacturer: manufacturer,
      activeAppleHardwareTab: appleTab,
      activeVersion: version,
      activeVariant: variant,
      activeGB: gb || null,
      activeProduct: null
    };
  }

  return {
    activeManufacturer: manufacturer,
    activeAppleHardwareTab: appleTab,
    activeProduct: geraet,
    activeVersion: null,
    activeVariant: null,
    activeGB: null
  };
}

function resolveGeraetFromTabs(imeis, tabState) {
  const {
    activeManufacturer,
    activeAppleHardwareTab,
    activeProduct,
    activeVersion,
    activeVariant,
    activeGB
  } = tabState;

  if (activeProduct) return activeProduct;

  if (
    activeManufacturer &&
    activeVersion &&
    activeVariant !== null &&
    activeGB
  ) {
    const filtered = filterImeisByTabs(imeis, tabState);
    const products = new Set();
    filtered.forEach((item) => {
      const product = getProduct(item);
      if (product) products.add(product);
    });
    const list = Array.from(products);
    if (list.length === 1) return list[0];
  }

  return '';
}

export function useVorvertragGeraetTabs(imeis = [], seedGeraet = '') {
  const [availableManufacturers, setAvailableManufacturers] = useState([]);
  const [activeManufacturer, setActiveManufacturer] = useState(null);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [activeProduct, setActiveProduct] = useState(null);
  const [availableVersions, setAvailableVersions] = useState([]);
  const [activeVersion, setActiveVersion] = useState(null);
  const [availableVariants, setAvailableVariants] = useState([]);
  const [activeVariant, setActiveVariant] = useState(null);
  const [availableGBs, setAvailableGBs] = useState([]);
  const [activeGB, setActiveGB] = useState(null);
  const [availableColors, setAvailableColors] = useState([]);
  const [activeAppleHardwareTab, setActiveAppleHardwareTab] = useState(null);
  const initKeyRef = useRef('');

  const appleHardwareTabBar = useMemo(() => {
    if (!activeManufacturer || !isAppleManufacturerName(activeManufacturer)) {
      return { visible: false, showIphoneTab: false };
    }
    let hasWatch = false;
    let hasNonWatch = false;
    for (const item of imeis) {
      if (getManufacturer(item)?.trim() !== activeManufacturer) continue;
      const pf = getProductFull(item);
      if (isAppleWatchProductFull(pf)) hasWatch = true;
      else hasNonWatch = true;
      if (hasWatch && hasNonWatch) break;
    }
    if (!hasWatch) return { visible: false, showIphoneTab: false };
    return { visible: true, showIphoneTab: hasNonWatch };
  }, [activeManufacturer, imeis]);

  const effectiveAppleHardwareTab = appleHardwareTabBar.visible ? activeAppleHardwareTab : null;

  useEffect(() => {
    if (!appleHardwareTabBar.visible && activeAppleHardwareTab !== null) {
      setActiveAppleHardwareTab(null);
    }
  }, [appleHardwareTabBar.visible, activeAppleHardwareTab]);

  useEffect(() => {
    if (
      appleHardwareTabBar.visible &&
      activeAppleHardwareTab === 'iphone' &&
      !appleHardwareTabBar.showIphoneTab
    ) {
      setActiveAppleHardwareTab(null);
    }
  }, [appleHardwareTabBar.visible, appleHardwareTabBar.showIphoneTab, activeAppleHardwareTab]);

  useEffect(() => {
    if (!imeis.length) {
      setAvailableManufacturers([]);
      return;
    }
    const manufacturers = new Set();
    imeis.forEach((item) => {
      const manufacturer = getManufacturer(item);
      if (manufacturer?.trim()) manufacturers.add(manufacturer.trim());
    });
    const manufacturersArray = Array.from(manufacturers).sort();
    setAvailableManufacturers(manufacturersArray);
    if (activeManufacturer && !manufacturersArray.includes(activeManufacturer)) {
      setActiveManufacturer(null);
    }
  }, [imeis, activeManufacturer]);

  useImeisVersionFilters({
    activeManufacturer,
    activeAppleHardwareTab: effectiveAppleHardwareTab,
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
    setActiveColor: () => {}
  });

  useEffect(() => {
    const initKey = `${seedGeraet}|${imeis.length}`;
    if (!seedGeraet || !imeis.length || initKeyRef.current === initKey) return;

    const state = findTabStateForGeraet(imeis, seedGeraet);
    if (!state) return;

    if (state.activeManufacturer !== undefined) setActiveManufacturer(state.activeManufacturer ?? null);
    if (state.activeAppleHardwareTab !== undefined) setActiveAppleHardwareTab(state.activeAppleHardwareTab);
    if (state.activeProduct !== undefined) setActiveProduct(state.activeProduct ?? null);
    if (state.activeVersion !== undefined) setActiveVersion(state.activeVersion ?? null);
    if (state.activeVariant !== undefined) setActiveVariant(state.activeVariant ?? null);
    if (state.activeGB !== undefined) setActiveGB(state.activeGB ?? null);
    initKeyRef.current = initKey;
  }, [seedGeraet, imeis]);

  useEffect(() => {
    if (!seedGeraet) {
      initKeyRef.current = '';
      setActiveManufacturer(null);
      setActiveAppleHardwareTab(null);
      setActiveProduct(null);
      setActiveVersion(null);
      setActiveVariant(null);
      setActiveGB(null);
    }
  }, [seedGeraet]);

  const matchingProducts = useMemo(() => {
    if (!activeManufacturer || !activeVersion || activeVariant === null || !activeGB) {
      return [];
    }
    const filtered = filterImeisByTabs(imeis, {
      activeManufacturer,
      activeAppleHardwareTab: effectiveAppleHardwareTab,
      activeVersion,
      activeVariant,
      activeGB
    });
    const products = new Set();
    filtered.forEach((item) => {
      const product = getProduct(item);
      if (product) products.add(product);
    });
    return Array.from(products).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [
    imeis,
    activeManufacturer,
    effectiveAppleHardwareTab,
    activeVersion,
    activeVariant,
    activeGB
  ]);

  const resolvedGeraet = useMemo(() => {
    if (activeProduct) return activeProduct;
    if (matchingProducts.length === 1) return matchingProducts[0];
    return resolveGeraetFromTabs(imeis, {
      activeManufacturer,
      activeAppleHardwareTab: effectiveAppleHardwareTab,
      activeProduct,
      activeVersion,
      activeVariant,
      activeGB
    });
  }, [
    imeis,
    activeManufacturer,
    effectiveAppleHardwareTab,
    activeProduct,
    activeVersion,
    activeVariant,
    activeGB,
    matchingProducts
  ]);

  const onManufacturerChange = useCallback((manufacturer) => {
    setActiveManufacturer(manufacturer);
    setActiveAppleHardwareTab(null);
    setActiveProduct(null);
    setActiveVersion(null);
    setActiveVariant(null);
    setActiveGB(null);
  }, []);

  const onAppleHardwareTabChange = useCallback((tab) => {
    setActiveAppleHardwareTab(tab);
    setActiveProduct(null);
    setActiveVersion(null);
    setActiveVariant(null);
    setActiveGB(null);
  }, []);

  const onVersionChange = useCallback((version) => {
    setActiveVersion(version);
    setActiveVariant(null);
    setActiveGB(null);
    setActiveProduct(null);
  }, []);

  const onVariantChange = useCallback((variant) => {
    setActiveVariant(variant);
    setActiveGB(null);
    setActiveProduct(null);
  }, []);

  const onGBChange = useCallback((gb) => {
    setActiveGB(gb);
    setActiveProduct(null);
  }, []);

  const onProductChange = useCallback((product) => {
    setActiveProduct(product);
  }, []);

  const onMatchingProductChange = useCallback((product) => {
    setActiveProduct(product);
  }, []);

  return {
    availableManufacturers,
    activeManufacturer,
    onManufacturerChange,
    appleHardwareTabsVisible: appleHardwareTabBar.visible,
    appleHardwareShowIphoneTab: appleHardwareTabBar.showIphoneTab,
    activeAppleHardwareTab,
    onAppleHardwareTabChange,
    availableVersions,
    activeVersion,
    onVersionChange,
    availableVariants,
    activeVariant,
    onVariantChange,
    availableGBs,
    activeGB,
    onGBChange,
    availableProducts,
    activeProduct,
    onProductChange,
    matchingProducts,
    onMatchingProductChange,
    availableColors,
    resolvedGeraet
  };
}
