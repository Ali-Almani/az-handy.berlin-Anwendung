import { useEffect, useRef } from 'react';
import { normalizeImeiSortKey } from '../utils/imeisSortUtils';
import { isAppleManufacturerName, isAppleWatchProductFull } from '../utils/imeisProductUtils';

export function useImeisMainFilter({
  imeis,
  activeSheet,
  activeManufacturer,
  activeAppleHardwareTab,
  activeProduct,
  activeVersion,
  activeVariant,
  activeGB,
  searchTerm,
  rowActions,
  sonderOnly,
  sonderImeiKeySet,
  getManufacturer,
  getProduct,
  getProductFull,
  hasO2Aktion,
  extractProductVersion,
  extractProductVariant,
  extractGB,
  setFilteredImeis,
  setAllColumns,
  setCurrentPage,
  setSelectedCells
}) {
  const prevFilterRef = useRef(null);

  useEffect(() => {
    let filtered = imeis;
    if (sonderOnly) {
      if (!sonderImeiKeySet || sonderImeiKeySet.size === 0) {
        filtered = [];
      } else {
        filtered = filtered.filter((item) => {
          const k = normalizeImeiSortKey(item?.imei);
          return k && sonderImeiKeySet.has(k);
        });
      }
    }
    if (activeSheet) filtered = filtered.filter(item => item.sheet === activeSheet);
    if (activeManufacturer) {
      filtered = filtered.filter(item => {
        const manufacturer = getManufacturer(item);
        return manufacturer && manufacturer.trim() === activeManufacturer;
      });
    }
    if (activeManufacturer && isAppleManufacturerName(activeManufacturer) && activeAppleHardwareTab) {
      filtered = filtered.filter((item) => {
        const pf = getProductFull(item);
        const isWatch = isAppleWatchProductFull(pf);
        if (activeAppleHardwareTab === 'watch') return isWatch;
        if (activeAppleHardwareTab === 'iphone') return !isWatch;
        return true;
      });
    }
    if (activeManufacturer) {
      if (activeVersion) {
        filtered = filtered.filter(item => extractProductVersion(getProductFull(item)) === activeVersion);
      }
      if (activeVersion && activeVariant !== null) {
        filtered = filtered.filter(item => {
          const productFull = getProductFull(item);
          const version = extractProductVersion(productFull);
          const variant = extractProductVariant(productFull);
          if (version !== activeVersion) return false;
          if (activeVariant === '') return variant === '';
          return variant === activeVariant;
        });
      }
      if (activeVersion && activeVariant !== null && activeGB) {
        filtered = filtered.filter(item => extractGB(getProductFull(item)) === activeGB);
      }
    }
    if (!activeVersion && activeProduct) {
      if (activeProduct === 'o2-Aktion') {
        filtered = filtered.filter(item => hasO2Aktion(item));
      } else {
        filtered = filtered.filter(item => {
          const product = getProduct(item);
          return product && product.trim() === activeProduct;
        });
      }
    }
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(item => {
        const imei = String(item?.imei || '').toLowerCase();
        if (imei.includes(q)) return true;
        const manufacturer = String(getManufacturer?.(item) || '').toLowerCase();
        if (manufacturer.includes(q)) return true;
        const product = String(getProduct?.(item) || '').toLowerCase();
        if (product.includes(q)) return true;
        const productFull = String(getProductFull?.(item) || '').toLowerCase();
        if (productFull.includes(q)) return true;
        return false;
      });
    }
    // Reservieren: reservierte Zeilen sollen für ALLE Benutzer aus der Liste verschwinden.
    filtered = filtered.filter((item) => {
      const rowId = `${item.sheet || 'default'}-${item.imei}-${item.row}`;
      return rowActions?.[rowId]?.action !== 'reservieren';
    });
    setFilteredImeis(filtered);

    if (filtered.length > 0) {
      const firstItem = filtered[0];
      let columns = [];
      if (firstItem.columnOrder && Array.isArray(firstItem.columnOrder)) {
        columns = [...firstItem.columnOrder];
      } else if (firstItem.rowData) {
        const allColumnNames = new Set();
        filtered.forEach(item => {
          if (item.rowData) Object.keys(item.rowData).forEach(key => allColumnNames.add(key));
        });
        const firstRowKeys = Object.keys(firstItem.rowData);
        firstRowKeys.forEach(key => { if (!columns.includes(key)) columns.push(key); });
        allColumnNames.forEach(key => { if (!columns.includes(key)) columns.push(key); });
      } else if (firstItem.data && Array.isArray(firstItem.data)) {
        let maxCols = 0;
        filtered.forEach(item => {
          if (item.data?.length) maxCols = Math.max(maxCols, item.data.length);
        });
        for (let i = 0; i < maxCols; i++) columns.push(`Spalte${i + 1}`);
      }
      setAllColumns(columns);
    } else {
      setAllColumns([]);
    }

    const filterKey = `${sonderOnly ? '1' : '0'}|${activeSheet}|${activeManufacturer}|${activeAppleHardwareTab || ''}|${activeProduct}|${activeVersion}|${activeVariant}|${activeGB}|${searchTerm}`;
    // Nur bei geänderter Suche/Filter/Tabs auf Seite 1 – nicht bei jedem imeis-/rowActions-Update
    if (prevFilterRef.current !== null && prevFilterRef.current !== filterKey) {
      setCurrentPage(1);
      setSelectedCells(new Set());
    }
    prevFilterRef.current = filterKey;
  }, [activeSheet, activeManufacturer, activeAppleHardwareTab, activeProduct, activeVersion, activeVariant, activeGB, searchTerm, imeis, getManufacturer, getProduct, hasO2Aktion, rowActions, getProductFull, extractProductVersion, extractProductVariant, extractGB, setFilteredImeis, setAllColumns, setCurrentPage, setSelectedCells, sonderOnly, sonderImeiKeySet]);
}
