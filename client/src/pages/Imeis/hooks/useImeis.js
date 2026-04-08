import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { loadImeis, deleteAllImeis } from '../../../utils/storage';
import { persistImeisState, updateHistoryActionApi, getImeisDataFromApi } from '../../../services/imeis.service';
import { isBüroMitarbeiter, isTeamleiterShop } from '../../../utils/roles';
import { useImeisVersionFilters } from './useImeisVersionFilters';
import { useImeisCopyHandlers } from './useImeisCopyHandlers';
import { useImeisData, applyImeisServerPayload } from './useImeisData';
import { useImeisMainFilter } from './useImeisMainFilter';
import { useImeisCellHandlers } from './useImeisCellHandlers';
import {
  maskImei as maskImeiUtil,
  getProductFull as getProductFullUtil,
  extractGB as extractGBUtil,
  extractProductVersion as extractProductVersionUtil,
  extractProductVariant as extractProductVariantUtil,
  extractColor as extractColorUtil,
  removeColorAndManufacturerFromProduct as removeColorAndManufacturerFromProductUtil,
  hasO2Aktion as hasO2AktionUtil,
  getProduct as getProductUtil,
  getManufacturer as getManufacturerUtil,
  expandSelection as expandSelectionUtil
} from '../utils/ImeisUtils';
import { getZustandData as getZustandDataUtil } from '../utils/imeisZustandUtils';

export function useImeis() {
  const { user } = useAuth();
  const [imeis, setImeis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredImeis, setFilteredImeis] = useState([]);
  const [allColumns, setAllColumns] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [availableSheets, setAvailableSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(null);
  const [availableManufacturers, setAvailableManufacturers] = useState([]);
  const [activeManufacturer, setActiveManufacturer] = useState(null);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [activeProduct, setActiveProduct] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [cellTextColors, setCellTextColors] = useState({});
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [selectionStart, setSelectionStart] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [history, setHistory] = useState([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showRowDropdown, setShowRowDropdown] = useState(false);
  const [selectedRowForDropdown, setSelectedRowForDropdown] = useState(null);
  const [rowActions, setRowActions] = useState({});
  const [copyHistory, setCopyHistory] = useState([]);
  const [copyTimestamps, setCopyTimestamps] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyUndoStack, setHistoryUndoStack] = useState([]);
  const [showZustandModal, setShowZustandModal] = useState(false);
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState('');
  const [zustandDataCache, setZustandDataCache] = useState(null);
  const [zustandLoading, setZustandLoading] = useState(false);
  const [activeVersion, setActiveVersion] = useState(null);
  const [activeVariant, setActiveVariant] = useState(null);
  const [activeGB, setActiveGB] = useState(null);
  const [activeColor, setActiveColor] = useState(null);
  const [availableVersions, setAvailableVersions] = useState([]);
  const [availableVariants, setAvailableVariants] = useState([]);
  const [availableGBs, setAvailableGBs] = useState([]);
  const [availableColors, setAvailableColors] = useState([]);

  const maskImei = maskImeiUtil;
  const getProductFull = getProductFullUtil;
  const extractGB = extractGBUtil;
  const extractProductVersion = extractProductVersionUtil;
  const extractProductVariant = extractProductVariantUtil;
  const extractColor = extractColorUtil;
  const hasO2Aktion = hasO2AktionUtil;
  const removeColorAndManufacturerFromProduct = useCallback((productName) =>
    removeColorAndManufacturerFromProductUtil(productName, extractGBUtil), []);
  const getProduct = useCallback((item) =>
    getProductUtil(item, (pn) => removeColorAndManufacturerFromProductUtil(pn, extractGBUtil)), []);
  const getManufacturer = getManufacturerUtil;

  useImeisData(getManufacturer, setImeis, setCellTextColors, setRowActions, setCopyHistory, setCopyTimestamps, setAvailableSheets, setActiveSheet, setAvailableManufacturers, setActiveManufacturer, setHistory, setLoading, user, showHistoryModal);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showColorPicker && !event.target.closest('.imeis-color-picker')) {
        setShowColorPicker(false);
        setSelectedCell(null);
      }
    };
    if (showColorPicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPicker]);

  useImeisMainFilter({
    imeis, activeSheet, activeManufacturer, activeProduct, activeVersion, activeVariant, activeGB,
    searchTerm, rowActions, getManufacturer, getProduct, getProductFull, hasO2Aktion,
    extractProductVersion, extractProductVariant, extractGB,
    setFilteredImeis, setAllColumns, setCurrentPage, setSelectedCells
  });

  const refreshImeisFromApi = useCallback(async () => {
    try {
      const data = await getImeisDataFromApi();
      if (data) {
        applyImeisServerPayload(
          data,
          {
            setImeis,
            setCellTextColors,
            setRowActions,
            setCopyHistory,
            setCopyTimestamps,
            setAvailableSheets,
            setActiveSheet,
            setAvailableManufacturers,
            setActiveManufacturer,
            setHistory
          },
          getManufacturer,
          false
        );
      }
    } catch (_) {}
  }, [getManufacturer]);

  useEffect(() => {
    if (imeis.length === 0) return;
    const manufacturers = new Set();
    imeis.forEach(item => {
      const manufacturer = getManufacturer(item);
      if (manufacturer?.trim()) manufacturers.add(manufacturer.trim());
    });
    const manufacturersArray = Array.from(manufacturers).sort();
    setAvailableManufacturers(manufacturersArray);
    if (activeManufacturer && !manufacturersArray.includes(activeManufacturer)) setActiveManufacturer(null);
  }, [imeis, getManufacturer, activeManufacturer]);

  useImeisVersionFilters({
    activeManufacturer, activeProduct, activeVersion, activeVariant, activeGB, imeis, getManufacturer, getProductFull, getProduct, hasO2Aktion,
    extractProductVersion, extractProductVariant, extractGB, extractColor,
    setAvailableProducts, setActiveProduct, setAvailableVersions, setAvailableVariants, setAvailableGBs, setAvailableColors,
    setActiveVersion, setActiveVariant, setActiveGB, setActiveColor
  });

  const totalPages = Math.ceil(filteredImeis.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentImeis = filteredImeis.slice(startIndex, endIndex);

  useEffect(() => {
    if (filteredImeis.length === 0) {
      if (currentPage !== 1) setCurrentPage(1);
      return;
    }
    const tp = Math.ceil(filteredImeis.length / itemsPerPage);
    if (tp > 0 && currentPage > tp) setCurrentPage(tp);
  }, [filteredImeis.length, itemsPerPage, currentPage, setCurrentPage]);

  useEffect(() => {
    let hasSelectedRow = false;
    currentImeis.forEach(item => {
      const rowId = `${item.sheet || 'default'}-${item.imei}-${item.row}`;
      if (selectedCells.has(`${rowId}-imei`)) hasSelectedRow = true;
    });
    if (!hasSelectedRow && showRowDropdown) {
      setShowRowDropdown(false);
      setSelectedRowForDropdown(null);
    }
  }, [selectedCells, currentImeis, showRowDropdown]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedCells.size === 0) return;
    try {
      setHistory(prev => [...prev, { imeis: JSON.parse(JSON.stringify(imeis)), cellTextColors: { ...cellTextColors }, timestamp: Date.now() }].slice(-10));
      const updatedImeis = imeis.map(item => {
        const rowId = `${item.sheet || 'default'}-${item.imei}-${item.row}`;
        let updatedItem = { ...item };
        if (selectedCells.has(`${rowId}-imei`)) updatedItem.imei = '';
        if (selectedCells.has(`${rowId}-row`)) updatedItem.row = '';
        if (updatedItem.rowData) {
          const updatedRowData = { ...updatedItem.rowData };
          Object.keys(updatedRowData).forEach(col => {
            if (selectedCells.has(`${rowId}-${col}`)) updatedRowData[col] = '';
          });
          updatedItem.rowData = updatedRowData;
        }
        if (updatedItem.data?.length) {
          updatedItem.data = updatedItem.data.map((val, idx) => {
            const colName = allColumns[idx] || `Spalte${idx + 1}`;
            return selectedCells.has(`${rowId}-${colName}`) ? '' : val;
          });
        }
        return updatedItem;
      });
      setImeis(updatedImeis);
      const updatedColors = { ...cellTextColors };
      selectedCells.forEach(cellId => delete updatedColors[cellId]);
      setCellTextColors(updatedColors);
      await persistImeisState(user, { imeis: updatedImeis, cellColors: updatedColors });
      setSelectedCells(new Set());
    } catch (error) {
      console.error('Error deleting selected cells:', error);
      alert('Fehler beim Löschen der markierten Zellen');
    }
  }, [selectedCells, imeis, cellTextColors, allColumns, user]);

  const expandSelection = useCallback((startCellId, endCellId) =>
    expandSelectionUtil(currentImeis, startCellId, endCellId), [currentImeis]);

  const persistImeis = useCallback(async (partial) => {
    await persistImeisState(user, partial);
  }, [user]);

  const { handleCopyRow, handleDropdownSelect, handleUpdateHistoryAction, handleHistoryModalUndo, handleCopySelected } = useImeisCopyHandlers({
    user, copyHistory, setCopyHistory, copyTimestamps, setCopyTimestamps, rowActions, setRowActions, historyUndoStack, setHistoryUndoStack,
    selectedCells, currentImeis, getManufacturer, getProductFull, setShowRateLimitModal, setRateLimitMessage,
    setSelectedRowForDropdown, setCopySuccess, expandSelection, persistImeis,
    updateHistoryActionApi,
    canUpdateOthersHistory: isBüroMitarbeiter(user) || isTeamleiterShop(user),
    setImeis,
    refreshImeisFromApi
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedCells.size > 0 && !['INPUT', 'TEXTAREA'].includes(event.target.tagName)) {
        event.preventDefault();
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCells, handleDeleteSelected, handleCopySelected]);

  const handleUndo = async () => {
    if (history.length === 0) { alert('Keine Aktion zum Rückgängigmachen verfügbar.'); return; }
    try {
      const lastState = history[history.length - 1];
      setImeis(lastState.imeis);
      let filtered = lastState.imeis;
      if (activeSheet) filtered = filtered.filter(item => item.sheet === activeSheet);
      if (searchTerm.trim()) filtered = filtered.filter(item => item.imei.toLowerCase().includes(searchTerm.toLowerCase()));
      setFilteredImeis(filtered);
      setCellTextColors(lastState.cellTextColors);
      await persistImeisState(user, { imeis: lastState.imeis, cellColors: lastState.cellTextColors });
      setHistory(prev => prev.slice(0, -1));
      setSelectedCells(new Set());
      setCurrentPage(1);
    } catch (error) {
      console.error('Error undoing action:', error);
      alert('Fehler beim Rückgängigmachen');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Möchten Sie wirklich alle IMEIs löschen?')) return;
    try {
      setHistory(prev => [...prev, { imeis: JSON.parse(JSON.stringify(imeis)), cellTextColors: { ...cellTextColors }, timestamp: Date.now() }].slice(-10));
      await deleteAllImeis();
      setImeis([]);
      setFilteredImeis([]);
      setCellTextColors({});
      setRowActions({});
      setCopyHistory([]);
      setCopyTimestamps([]);
      await persistImeisState(user, { imeis: [], cellColors: {}, rowActions: {}, copyHistory: [], copyTimestamps: [] });
    } catch (error) {
      console.error('Error deleting all IMEIs:', error);
      alert('Fehler beim Löschen aller IMEIs');
    }
  };

  const getZustandData = useCallback(() => getZustandDataUtil(imeis, rowActions, { getManufacturer, getProductFull, extractProductVariant, extractGB }), [imeis, rowActions, getManufacturer, getProductFull, extractProductVariant, extractGB]);

  const { handleCellClick, handleCellContextMenu, handleCellMouseDown, handleCellMouseEnter, handleCellMouseUp, handleColorSelect, getCellTextColor } = useImeisCellHandlers({
    selectedCell, setSelectedCell, selectedCells, setSelectedCells, selectionStart, setSelectionStart,
    isSelecting, setIsSelecting, showColorPicker, setShowColorPicker, cellTextColors, setCellTextColors, expandSelection, persistImeis
  });

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsSelecting(false);
    if (isSelecting) window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelecting]);

  const onManufacturerChange = useCallback((m) => { setActiveManufacturer(m); setActiveProduct(null); setActiveVersion(null); setActiveVariant(null); setActiveGB(null); setActiveColor(null); }, []);
  const onVersionChange = useCallback((v) => { setActiveVersion(v); setActiveVariant(null); setActiveGB(null); setActiveColor(null); }, []);
  const onVariantChange = useCallback((v) => { setActiveVariant(v); setActiveGB(null); setActiveColor(null); }, []);
  const onGBChange = useCallback((g) => { setActiveGB(g); setActiveColor(null); }, []);
  const onShowZustand = useCallback(async () => {
    setShowZustandModal(true);
    setZustandLoading(true);
    setZustandDataCache(null);
    const data = await new Promise(resolve => {
      const calc = () => { try { resolve(getZustandData()); } catch { resolve({ manufacturers: [], total: 0 }); } };
      window.requestIdleCallback ? requestIdleCallback(calc, { timeout: 100 }) : setTimeout(calc, 0);
    });
    setZustandDataCache(data);
    setZustandLoading(false);
  }, [getZustandData]);
  const onCloseZustandModal = useCallback(() => { setShowZustandModal(false); setZustandDataCache(null); setZustandLoading(false); }, []);
  const onRowActionRemove = useCallback((rowId) => {
    const updated = { ...rowActions };
    delete updated[rowId];
    setRowActions(updated);
    persistImeisState(user, { rowActions: updated });
  }, [rowActions, user]);

  const handleExport = () => {
    const headers = ['IMEI', 'Hersteller'];
    const rows = filteredImeis.map(item => [item.imei, getManufacturer(item) || '']);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })));
    link.setAttribute('download', `imeis_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    user, loading, searchTerm, setSearchTerm, filteredImeis, currentImeis, startIndex, endIndex, totalPages, itemsPerPage, setItemsPerPage,
    currentPage, setCurrentPage, availableManufacturers, activeManufacturer, setActiveManufacturer, availableVersions, activeVersion, setActiveVersion,
    availableVariants, activeVariant, setActiveVariant, availableGBs, activeGB, setActiveGB, availableProducts, activeProduct, setActiveProduct,
    history, handleUndo, handleExport, handleDeleteAll, handleUpdateHistoryAction, handleHistoryModalUndo, copyHistory, showHistoryModal, setShowHistoryModal,
    historyUndoStack, showZustandModal, setShowZustandModal, zustandDataCache, setZustandDataCache, zustandLoading, setZustandLoading, getZustandData,
    showRateLimitModal, setShowRateLimitModal, rateLimitMessage, imeis, allColumns, selectedCells, selectedCell, showColorPicker, rowActions, setRowActions,
    cellTextColors, maskImei, getManufacturer, getProductFull, getCellTextColor, handleCellClick, handleCellContextMenu, handleCellMouseDown, handleCellMouseEnter,
    handleCellMouseUp, handleColorSelect, handleDropdownSelect, availableSheets, activeSheet, setActiveSheet, onManufacturerChange, onVersionChange, onVariantChange,
    onGBChange, onShowZustand, onCloseZustandModal, onRowActionRemove
  };
}
