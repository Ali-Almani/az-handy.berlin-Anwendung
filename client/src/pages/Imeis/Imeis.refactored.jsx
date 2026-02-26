import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { isAdmin } from '../../utils/roles';
import { loadImeis, deleteAllImeis } from '../../utils/storage';
import {
  maskImei,
  getProductFull,
  extractGB,
  extractProductVersion,
  extractProductVariant,
  extractColor,
  removeColorAndManufacturerFromProduct,
  hasO2Aktion,
  getProduct,
  getManufacturer
} from './utils/ImeisUtils';
import ImeisFilters from './components/ImeisFilters';
import ImeisControls from './components/ImeisControls';
import ImeisHistoryModal from './components/ImeisHistoryModal';
import ImeisZustandModal from './components/ImeisZustandModal';
import ImeisRateLimitModal from './components/ImeisRateLimitModal';
import './Imeis.scss';

const Imeis = () => {
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

  const removeColorAndManufacturer = useCallback((productName) => {
    return removeColorAndManufacturerFromProduct(productName, extractGB);
  }, []);

  const getProductForItem = useCallback((item) => {
    return getProduct(item, removeColorAndManufacturer);
  }, [removeColorAndManufacturer]);

  useEffect(() => {
    const loadImeisData = async () => {
      try {
        const storedImeis = await loadImeis();
        setImeis(storedImeis);
        
        const savedColors = JSON.parse(localStorage.getItem('imeis-cell-text-colors') || '{}');
        setCellTextColors(savedColors);
        
        const savedActions = JSON.parse(localStorage.getItem('imeis-row-actions') || '{}');
        setRowActions(savedActions);
        
        const savedCopyHistory = JSON.parse(localStorage.getItem('imeis-copy-history') || '[]');
        const uniqueHistoryMap = new Map();
        savedCopyHistory.forEach(entry => {
          const imei = entry.imei;
          const existingEntry = uniqueHistoryMap.get(imei);
          if (!existingEntry || new Date(entry.timestamp) > new Date(existingEntry.timestamp)) {
            uniqueHistoryMap.set(imei, entry);
          }
        });
        
        const updatedHistory = Array.from(uniqueHistoryMap.values())
          .map(entry => ({
            ...entry,
            action: entry.action === 'abgelehnt' ? 'abgelehnt' : 'checkout'
          }))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        setCopyHistory(updatedHistory);
        localStorage.setItem('imeis-copy-history', JSON.stringify(updatedHistory));
        
        const sheets = new Set();
        storedImeis.forEach(item => {
          if (item.sheet) {
            sheets.add(item.sheet);
          }
        });
        const sheetsArray = Array.from(sheets);
        setAvailableSheets(sheetsArray);
        
        if (sheetsArray.length > 0) {
          setActiveSheet(sheetsArray[0]);
        } else {
          setActiveSheet(null);
        }
        
        const manufacturers = new Set();
        storedImeis.forEach(item => {
          const manufacturer = getManufacturer(item);
          if (manufacturer && manufacturer.trim() !== '') {
            manufacturers.add(manufacturer.trim());
          }
        });
        const manufacturersArray = Array.from(manufacturers).sort();
        setAvailableManufacturers(manufacturersArray);
        setActiveManufacturer(null);
        setHistory([]);
      } catch (error) {
        console.error('Error loading IMEIs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadImeisData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showColorPicker && !event.target.closest('.imeis-color-picker')) {
        if (event.target.closest('.imeis-cell')) {
          setShowColorPicker(false);
          setSelectedCell(null);
        } else {
          setShowColorPicker(false);
          setSelectedCell(null);
        }
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker]);

  useEffect(() => {
    let filtered = imeis;
    
    if (activeSheet) {
      filtered = filtered.filter(item => item.sheet === activeSheet);
    }
    
    if (activeManufacturer) {
      filtered = filtered.filter(item => {
        const manufacturer = getManufacturer(item);
        return manufacturer && manufacturer.trim() === activeManufacturer;
      });
    }
    
    if (activeManufacturer) {
      if (activeVersion) {
        filtered = filtered.filter(item => {
          const productFull = getProductFull(item);
          const version = extractProductVersion(productFull);
          return version === activeVersion;
        });
      }
      
      if (activeVersion && activeVariant !== null) {
        filtered = filtered.filter(item => {
          const productFull = getProductFull(item);
          const version = extractProductVersion(productFull);
          if (version !== activeVersion) return false;
          
          const variant = extractProductVariant(productFull);
          if (activeVariant === '') {
            return variant === '';
          }
          return variant === activeVariant;
        });
      }
      
      if (activeVersion && activeVariant !== null && activeGB) {
        filtered = filtered.filter(item => {
          const productFull = getProductFull(item);
          const gb = extractGB(productFull);
          return gb === activeGB;
        });
      }
    }
    
    if (!activeVersion && activeProduct) {
      if (activeProduct === 'o2-Aktion') {
        filtered = filtered.filter(item => hasO2Aktion(item));
      } else {
        filtered = filtered.filter(item => {
          const product = getProductForItem(item);
          return product && product.trim() === activeProduct;
        });
      }
    }
    
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(item =>
        item.imei.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    filtered = filtered.filter(item => {
      const rowId = `${item.sheet || 'default'}-${item.imei}-${item.row}`;
      const action = rowActions[rowId]?.action;
      return action !== 'reservieren';
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
          if (item.rowData) {
            Object.keys(item.rowData).forEach(key => allColumnNames.add(key));
          }
        });
        
        const firstRowKeys = Object.keys(firstItem.rowData);
        firstRowKeys.forEach(key => {
          if (!columns.includes(key)) {
            columns.push(key);
          }
        });
        
        allColumnNames.forEach(key => {
          if (!columns.includes(key)) {
            columns.push(key);
          }
        });
      } else if (firstItem.data && Array.isArray(firstItem.data)) {
        let maxCols = 0;
        filtered.forEach(item => {
          if (item.data && Array.isArray(item.data)) {
            maxCols = Math.max(maxCols, item.data.length);
          }
        });
        
        for (let i = 0; i < maxCols; i++) {
          columns.push(`Spalte${i + 1}`);
        }
      }
      
      setAllColumns(columns);
    } else {
      setAllColumns([]);
    }
    
    setCurrentPage(1);
    setSelectedCells(new Set());
  }, [activeSheet, activeManufacturer, activeProduct, activeVersion, activeVariant, activeGB, searchTerm, imeis, rowActions, getProductForItem]);

  useEffect(() => {
    const manufacturers = new Set();
    imeis.forEach(item => {
      const manufacturer = getManufacturer(item);
      if (manufacturer && manufacturer.trim() !== '') {
        manufacturers.add(manufacturer.trim());
      }
    });
    const manufacturersArray = Array.from(manufacturers).sort();
    setAvailableManufacturers(manufacturersArray);
    
    if (activeManufacturer && !manufacturersArray.includes(activeManufacturer)) {
      setActiveManufacturer(null);
    }
  }, [imeis, activeManufacturer]);

  useEffect(() => {
    if (!activeManufacturer) {
      setAvailableProducts([]);
      setActiveProduct(null);
      return;
    }

    const products = new Set();
    let hasO2AktionProducts = false;
    
    imeis.forEach(item => {
      const manufacturer = getManufacturer(item);
      if (manufacturer && manufacturer.trim() === activeManufacturer) {
        if (hasO2Aktion(item)) {
          hasO2AktionProducts = true;
        }
        
        const product = getProductForItem(item);
        if (product && product.trim() !== '') {
          products.add(product.trim());
        }
      }
    });
    
    const productsArray = Array.from(products).sort((a, b) => {
      const gbA = extractGB(a);
      const gbB = extractGB(b);
      const nameA = a.replace(/\s*\d+\s*(GB|TB|gb|tb)\s*/gi, '').trim();
      const nameB = b.replace(/\s*\d+\s*(GB|TB|gb|tb)\s*/gi, '').trim();
      
      const getBaseName = (name) => {
        return name
          .replace(/\s+(pro|plus|mini|max|ultra|titan|titanium|standard|regular)\s*/gi, ' ')
          .replace(/\s+(pro|plus|mini|max|ultra|titan|titanium|standard|regular)$/gi, '')
          .trim();
      };
      
      const baseNameA = getBaseName(nameA);
      const baseNameB = getBaseName(nameB);
      
      const extractVersion = (name) => {
        const versionMatch = name.match(/(\d+)/);
        return versionMatch ? parseInt(versionMatch[1]) : 0;
      };
      
      const versionA = extractVersion(nameA);
      const versionB = extractVersion(nameB);
      
      const getVariant = (name) => {
        const variantMatch = name.match(/\s+(pro|plus|mini|max|ultra|titan|titanium|standard|regular)\s*/i);
        return variantMatch ? variantMatch[1].toLowerCase() : '';
      };
      
      const variantA = getVariant(nameA);
      const variantB = getVariant(nameB);
      
      const baseCompare = baseNameA.localeCompare(baseNameB, undefined, { numeric: true, sensitivity: 'base' });
      if (baseCompare !== 0) {
        return baseCompare;
      }
      
      if (versionA !== versionB) {
        return versionA - versionB;
      }
      
      if (variantA !== variantB) {
        return variantA.localeCompare(variantB);
      }
      
      if (gbA && gbB) {
        const convertToGB = (gbStr) => {
          const value = parseInt(gbStr.replace(/[^\d]/g, '')) || 0;
          const unit = gbStr.toUpperCase();
          if (unit.includes('TB')) {
            return value * 1024;
          }
          return value;
        };
        
        const gbValueA = convertToGB(gbA);
        const gbValueB = convertToGB(gbB);
        return gbValueA - gbValueB;
      }
      
      if (gbA && !gbB) return 1;
      if (!gbA && gbB) return -1;
      
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
    
    if (hasO2AktionProducts) {
      productsArray.unshift('o2-Aktion');
    }
    
    setAvailableProducts(productsArray);
    
    if (activeProduct && !productsArray.includes(activeProduct)) {
      setActiveProduct(null);
    }
  }, [activeManufacturer, imeis, activeProduct, getProductForItem]);

  useEffect(() => {
    if (!activeManufacturer) {
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

    let allManufacturerItems = imeis.filter(item => {
      const manufacturer = getManufacturer(item);
      return manufacturer && manufacturer.trim() === activeManufacturer;
    });

    const versions = new Set();
    allManufacturerItems.forEach(item => {
      const productFull = getProductFull(item);
      const version = extractProductVersion(productFull);
      if (version) {
        versions.add(version);
      }
    });
    const versionsArray = Array.from(versions).sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
    setAvailableVersions(versionsArray);

    if (activeVersion) {
      let versionFiltered = allManufacturerItems.filter(item => {
        const productFull = getProductFull(item);
        const version = extractProductVersion(productFull);
        return version === activeVersion;
      });

      const variants = new Set();
      versionFiltered.forEach(item => {
        const productFull = getProductFull(item);
        const variant = extractProductVariant(productFull);
        variants.add(variant || '');
      });
      const variantsArray = Array.from(variants).sort((a, b) => {
        if (a === '') return -1;
        if (b === '') return 1;
        return a.localeCompare(b);
      });
      setAvailableVariants(variantsArray);
    } else {
      setAvailableVariants([]);
    }

    if (activeVersion && activeVariant !== null) {
      let versionVariantFiltered = allManufacturerItems.filter(item => {
        const productFull = getProductFull(item);
        const version = extractProductVersion(productFull);
        const variant = extractProductVariant(productFull);
        if (version !== activeVersion) return false;
        if (activeVariant === '') {
          return variant === '';
        }
        return variant === activeVariant;
      });

      const gbs = new Set();
      versionVariantFiltered.forEach(item => {
        const productFull = getProductFull(item);
        const gb = extractGB(productFull);
        if (gb) {
          gbs.add(gb);
        }
      });
      const gbsArray = Array.from(gbs).sort((a, b) => {
        const convertToGB = (gbStr) => {
          const value = parseInt(gbStr.replace(/[^\d]/g, '')) || 0;
          const unit = gbStr.toUpperCase();
          if (unit.includes('TB')) {
            return value * 1024;
          }
          return value;
        };
        return convertToGB(a) - convertToGB(b);
      });
      setAvailableGBs(gbsArray);
    } else {
      setAvailableGBs([]);
    }

    if (activeVersion && activeVariant !== null && activeGB) {
      let versionVariantGBFiltered = allManufacturerItems.filter(item => {
        const productFull = getProductFull(item);
        const version = extractProductVersion(productFull);
        const variant = extractProductVariant(productFull);
        const gb = extractGB(productFull);
        if (version !== activeVersion) return false;
        if (activeVariant === '') {
          if (variant !== '') return false;
        } else {
          if (variant !== activeVariant) return false;
        }
        return gb === activeGB;
      });

      const colors = new Set();
      versionVariantGBFiltered.forEach(item => {
        const productFull = getProductFull(item);
        const color = extractColor(productFull);
        if (color) {
          colors.add(color);
        }
      });
      const colorsArray = Array.from(colors).sort();
      setAvailableColors(colorsArray);
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
        const version = extractProductVersion(productFull);
        if (version === activeVersion) {
          const variant = extractProductVariant(productFull);
          currentVariants.add(variant || '');
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
        if (version === activeVersion) {
          if (activeVariant === '') {
            if (variant === '') {
              const gb = extractGB(productFull);
              if (gb) {
                currentGBs.add(gb);
              }
            }
          } else {
            if (variant === activeVariant) {
              const gb = extractGB(productFull);
              if (gb) {
                currentGBs.add(gb);
              }
            }
          }
        }
      });
      if (!Array.from(currentGBs).includes(activeGB)) {
        setActiveGB(null);
        setActiveColor(null);
      }
    }
  }, [activeManufacturer, activeVersion, activeVariant, activeGB, imeis]);

  const totalPages = Math.ceil(filteredImeis.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentImeis = filteredImeis.slice(startIndex, endIndex);

  const handleUndo = async () => {
    if (history.length === 0) {
      alert('Keine Aktion zum Rückgängigmachen verfügbar.');
      return;
    }

    try {
      const lastState = history[history.length - 1];
      setImeis(lastState.imeis);
      
      let filtered = lastState.imeis;
      if (activeSheet) {
        filtered = filtered.filter(item => item.sheet === activeSheet);
      }
      if (searchTerm.trim() !== '') {
        filtered = filtered.filter(item =>
          item.imei.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      setFilteredImeis(filtered);
      
      setCellTextColors(lastState.cellTextColors);
      
      const { saveImeis } = await import('../../utils/storage');
      await saveImeis(lastState.imeis);
      localStorage.setItem('imeis-cell-text-colors', JSON.stringify(lastState.cellTextColors));
      
      setHistory(prev => prev.slice(0, -1));
      setSelectedCells(new Set());
      setCurrentPage(1);
    } catch (error) {
      console.error('Error undoing action:', error);
      alert('Fehler beim Rückgängigmachen');
    }
  };

  const handleDeleteAll = async () => {
    if (window.confirm('Möchten Sie wirklich alle IMEIs löschen?')) {
      try {
        const currentState = {
          imeis: JSON.parse(JSON.stringify(imeis)),
          cellTextColors: { ...cellTextColors },
          timestamp: Date.now()
        };
        setHistory(prev => [...prev, currentState].slice(-10));

        await deleteAllImeis();
        setImeis([]);
        setFilteredImeis([]);
        setCellTextColors({});
        localStorage.setItem('imeis-cell-text-colors', JSON.stringify({}));
      } catch (error) {
        console.error('Error deleting all IMEIs:', error);
        alert('Fehler beim Löschen aller IMEIs');
      }
    }
  };

  const handleExport = () => {
    const headers = ['IMEI', 'Hersteller'];
    const rows = filteredImeis.map(item => {
      const manufacturer = getManufacturer(item);
      return [item.imei, manufacturer || ''];
    });
    
    const csvContent = [
      headers,
      ...rows
    ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `imeis_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdateHistoryAction = useCallback((index, newAction) => {
    if (index < 0 || index >= copyHistory.length) return;
    
    const entry = copyHistory[index];
    const oldAction = entry.action || null;
    
    const undoState = {
      index,
      entry: { ...entry },
      oldAction,
      newAction,
      rowActionsSnapshot: { ...rowActions }
    };
    
    if (newAction === 'angenommen') {
      setHistoryUndoStack(prev => [...prev, undoState]);
      const updatedHistory = copyHistory.filter((_, i) => i !== index);
      setCopyHistory(updatedHistory);
      localStorage.setItem('imeis-copy-history', JSON.stringify(updatedHistory));
      return;
    }
    
    if (newAction === 'abgelehnt') {
      setHistoryUndoStack(prev => [...prev, undoState]);
      const imeiToReject = entry.imei;
      const updatedRowActions = { ...rowActions };
      
      Object.keys(updatedRowActions).forEach(rowId => {
        if (rowId.includes(`-${imeiToReject}-`)) {
          delete updatedRowActions[rowId];
        }
      });
      
      setRowActions(updatedRowActions);
      localStorage.setItem('imeis-row-actions', JSON.stringify(updatedRowActions));
      
      const updatedHistory = copyHistory.filter((_, i) => i !== index);
      setCopyHistory(updatedHistory);
      localStorage.setItem('imeis-copy-history', JSON.stringify(updatedHistory));
      return;
    }
    
    setHistoryUndoStack(prev => [...prev, undoState]);
    const updatedHistory = [...copyHistory];
    updatedHistory[index] = {
      ...updatedHistory[index],
      action: newAction || null,
      userName: user?.name || updatedHistory[index].userName || 'Unbekannt',
      timestamp: new Date().toISOString()
    };
    
    setCopyHistory(updatedHistory);
    localStorage.setItem('imeis-copy-history', JSON.stringify(updatedHistory));
  }, [copyHistory, user, rowActions]);

  const handleHistoryUndo = () => {
    if (historyUndoStack.length === 0) return;
    
    const undoState = historyUndoStack[historyUndoStack.length - 1];
    
    if (undoState.newAction === 'angenommen' || undoState.newAction === 'abgelehnt') {
      const updatedHistory = [...copyHistory];
      updatedHistory.splice(undoState.index, 0, undoState.entry);
      setCopyHistory(updatedHistory);
      localStorage.setItem('imeis-copy-history', JSON.stringify(updatedHistory));
      
      if (undoState.newAction === 'abgelehnt') {
        setRowActions(undoState.rowActionsSnapshot);
        localStorage.setItem('imeis-row-actions', JSON.stringify(undoState.rowActionsSnapshot));
      }
    } else {
      const updatedHistory = [...copyHistory];
      updatedHistory[undoState.index] = {
        ...undoState.entry,
        action: undoState.oldAction
      };
      setCopyHistory(updatedHistory);
      localStorage.setItem('imeis-copy-history', JSON.stringify(updatedHistory));
    }
    
    setHistoryUndoStack(prev => prev.slice(0, -1));
  };

  const handleShowZustand = async () => {
    setShowZustandModal(true);
    setZustandLoading(true);
    setZustandDataCache(null);
    
    const calculateData = () => {
      return new Promise((resolve) => {
        if (window.requestIdleCallback) {
          requestIdleCallback(() => {
            try {
              const data = getZustandData();
              resolve(data);
            } catch (error) {
              console.error('Fehler beim Berechnen der Zustandsdaten:', error);
              resolve({ manufacturers: [], total: 0 });
            }
          }, { timeout: 100 });
        } else {
          setTimeout(() => {
            try {
              const data = getZustandData();
              resolve(data);
            } catch (error) {
              console.error('Fehler beim Berechnen der Zustandsdaten:', error);
              resolve({ manufacturers: [], total: 0 });
            }
          }, 0);
        }
      });
    };
    
    const data = await calculateData();
    setZustandDataCache(data);
    setZustandLoading(false);
  };

  const getZustandData = useCallback(() => {
    const manufacturerData = {};
    let totalCount = 0;
    
    imeis.forEach(item => {
      const rowId = `${item.sheet || 'default'}-${item.imei}-${item.row}`;
      const action = rowActions[rowId]?.action;
      if (action === 'reservieren') {
        return;
      }
      
      totalCount++;
      
      const manufacturer = getManufacturer(item);
      const productFull = getProductFull(item);
      const version = extractProductVersion(productFull) || 'Unbekannt';
      const variant = extractProductVariant(productFull) || 'Standard';
      const gb = extractGB(productFull) || 'Unbekannt';
      
      const manufacturerKey = manufacturer && manufacturer.trim() !== '' 
        ? manufacturer.trim() 
        : 'Unbekannt';
      
      if (!manufacturerData[manufacturerKey]) {
        manufacturerData[manufacturerKey] = {};
      }
      if (!manufacturerData[manufacturerKey][version]) {
        manufacturerData[manufacturerKey][version] = {};
      }
      if (!manufacturerData[manufacturerKey][version][variant]) {
        manufacturerData[manufacturerKey][version][variant] = {};
      }
      
      if (manufacturerData[manufacturerKey][version][variant][gb]) {
        manufacturerData[manufacturerKey][version][variant][gb]++;
      } else {
        manufacturerData[manufacturerKey][version][variant][gb] = 1;
      }
    });

    const sortedData = Object.entries(manufacturerData)
      .map(([manufacturer, versions]) => {
        const sortedVersions = Object.entries(versions)
          .map(([version, variants]) => {
            const variantEntries = Object.entries(variants).map(([variant, gbs]) => {
              const gbEntries = Object.entries(gbs).map(([gb, count]) => ({
                gb,
                count
              }));
              gbEntries.sort((a, b) => {
                const numA = parseInt(a.gb.match(/\d+/)?.[0] || '0', 10);
                const numB = parseInt(b.gb.match(/\d+/)?.[0] || '0', 10);
                return numB - numA;
              });
              return {
                variant,
                gbs: gbEntries
              };
            });
            variantEntries.sort((a, b) => {
              if (a.variant === 'Standard') return -1;
              if (b.variant === 'Standard') return 1;
              return a.variant.localeCompare(b.variant);
            });
            return {
              version,
              variants: variantEntries
            };
          })
          .sort((a, b) => {
            const numA = parseInt(a.version) || 0;
            const numB = parseInt(b.version) || 0;
            return numB - numA;
          });
        
        let manufacturerTotal = 0;
        sortedVersions.forEach(versionData => {
          versionData.variants.forEach(variantData => {
            variantData.gbs.forEach(gbData => {
              manufacturerTotal += gbData.count;
            });
          });
        });
        
        return {
          manufacturer,
          versions: sortedVersions,
          total: manufacturerTotal
        };
      })
      .sort((a, b) => {
        if (b.total !== a.total) {
          return b.total - a.total;
        }
        return a.manufacturer.localeCompare(b.manufacturer);
      });

    return {
      manufacturers: sortedData,
      total: totalCount
    };
  }, [imeis, rowActions]);

  const handleManufacturerChange = (manufacturer) => {
    setActiveManufacturer(manufacturer);
    setActiveProduct(null);
    setActiveVersion(null);
    setActiveVariant(null);
    setActiveGB(null);
    setActiveColor(null);
  };

  const handleVersionChange = (version) => {
    setActiveVersion(version);
    setActiveVariant(null);
    setActiveGB(null);
    setActiveColor(null);
  };

  const handleVariantChange = (variant) => {
    setActiveVariant(variant);
    setActiveGB(null);
    setActiveColor(null);
  };

  const handleGBChange = (gb) => {
    setActiveGB(gb);
    setActiveColor(null);
  };

  if (!isAdmin(user)) {
    return (
      <div className="imeis">
        <div className="card">
          <div className="card-body">
            <p>Sie haben keine Berechtigung, diese Seite zu sehen.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="imeis">
        <div className="card">
          <div className="card-body">
            <p>Lädt...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="imeis">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">IMEI-Verwaltung</h2>
        </div>
        <div className="card-body">
          <ImeisControls
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            history={history}
            onUndo={handleUndo}
            onExport={handleExport}
            filteredImeisLength={filteredImeis.length}
            copyHistoryLength={copyHistory.length}
            onShowHistory={() => setShowHistoryModal(true)}
            imeisLength={imeis.length}
            onDeleteAll={handleDeleteAll}
            onShowZustand={handleShowZustand}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={(value) => {
              setItemsPerPage(value);
              setCurrentPage(1);
            }}
            currentPage={currentPage}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={endIndex}
          />

          <ImeisFilters
            availableManufacturers={availableManufacturers}
            activeManufacturer={activeManufacturer}
            onManufacturerChange={handleManufacturerChange}
            availableVersions={availableVersions}
            activeVersion={activeVersion}
            onVersionChange={handleVersionChange}
            availableVariants={availableVariants}
            activeVariant={activeVariant}
            onVariantChange={handleVariantChange}
            availableGBs={availableGBs}
            activeGB={activeGB}
            onGBChange={handleGBChange}
            availableProducts={availableProducts}
            activeProduct={activeProduct}
            onProductChange={setActiveProduct}
          />

          <div className="imeis-stats">
            <p>
              {activeManufacturer ? (
                <>
                  Hersteller: <strong>{activeManufacturer}</strong>
                  {activeVersion && (
                    <> | Version: <strong>{(() => {
                      const manufacturerLower = activeManufacturer.toLowerCase();
                      let versionName = '';
                      if (manufacturerLower.includes('apple')) {
                        if (activeVersion.startsWith('SE')) {
                          versionName = `iPhone ${activeVersion}`;
                        } else {
                          versionName = `iPhone ${activeVersion}`;
                        }
                      } else if (manufacturerLower.includes('google')) {
                        versionName = `Pixel ${activeVersion}`;
                      } else if (manufacturerLower.includes('samsung')) {
                        versionName = activeVersion.startsWith('S') ? `Galaxy ${activeVersion}` : `Galaxy S${activeVersion}`;
                      } else {
                        versionName = `${activeManufacturer} ${activeVersion}`;
                      }
                      
                      if (activeVariant !== null && activeVariant !== '') {
                        versionName += ` ${activeVariant}`;
                      }
                      
                      return versionName;
                    })()}</strong></>
                  )}
                  {activeGB && (
                    <> | GB: <strong>{activeGB}</strong></>
                  )}
                  {!activeVersion && activeProduct && (
                    <> | Produkt: <strong>{activeProduct}</strong></>
                  )}
                  <> | IMEIs: <strong>{filteredImeis.length}</strong></>
                </>
              ) : (
                <>IMEIs: <strong>{filteredImeis.length}</strong></>
              )}
              {searchTerm && (
                <> | Gefunden: <strong>{filteredImeis.length}</strong></>
              )}
              {filteredImeis.length > 0 && (
                <> | Zeige <strong>{startIndex + 1}</strong> - <strong>{Math.min(endIndex, filteredImeis.length)}</strong> von <strong>{filteredImeis.length}</strong></>
              )}
            </p>
            <div className="imeis-pagination-controls">
              <label>
                Zeilen pro Seite:
                <select 
                  value={itemsPerPage} 
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="form-select"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </label>
            </div>
          </div>

          {filteredImeis.length === 0 ? (
            <div className="imeis-empty">
              <p>
                {searchTerm
                  ? 'Keine IMEIs gefunden, die dem Suchbegriff entsprechen.'
                  : 'Keine IMEIs vorhanden.'}
              </p>
            </div>
          ) : (
            <div className="imeis-table-wrapper">
              <table className="imeis-table">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>IMEI</th>
                    <th style={{ width: '20%' }}>Aktion</th>
                    <th style={{ width: '20%' }}>Hersteller</th>
                    <th style={{ width: '35%' }}>Produkt</th>
                  </tr>
                </thead>
                <tbody>
                  {currentImeis.map((item, index) => {
                    const globalIndex = startIndex + index;
                    const rowId = `${item.sheet || 'default'}-${item.imei}-${item.row}`;
                    const manufacturer = getManufacturer(item);
                    
                    const keysToCheck = item.columnOrder && Array.isArray(item.columnOrder) && item.columnOrder.length > 0
                      ? item.columnOrder
                      : Object.keys(item.rowData || {});
                    
                    let manufacturerKey = keysToCheck.find(key => {
                      if (!key) return false;
                      const lowerKey = String(key).toLowerCase().trim();
                      return (lowerKey.includes('hersteller') || 
                             lowerKey.includes('manufacturer') || 
                             lowerKey.includes('make') ||
                             (lowerKey.includes('brand') && !lowerKey.includes('marke'))) &&
                             !lowerKey.includes('marke');
                    });
                    
                    if (!manufacturerKey && keysToCheck.length >= 2) {
                      const imeiKey = keysToCheck.find(key => 
                        key && String(key).toLowerCase().includes('imei')
                      );
                      if (imeiKey) {
                        const imeiIndex = keysToCheck.indexOf(imeiKey);
                        if (imeiIndex + 1 < keysToCheck.length) {
                          manufacturerKey = keysToCheck[imeiIndex + 1];
                        }
                      } else if (keysToCheck[1]) {
                        manufacturerKey = keysToCheck[1];
                      }
                    }
                    
                    const productFull = getProductFull(item);
                    
                    return (
                      <tr 
                        key={`${item.sheet || 'sheet'}-${item.imei}-${item.row}-${globalIndex}`}
                      >
                        <td style={{ padding: '0.5rem', width: '25%' }}>
                          {maskImei(item.imei)}
                        </td>
                        <td style={{ padding: '0.5rem', width: '20%' }}>
                          {rowActions[rowId] ? (
                            <div style={{ fontSize: '0.85rem', color: '#666' }}>
                              <strong>{rowActions[rowId].action === 'reservieren' ? 'Reservieren' : 
                                       rowActions[rowId].action === 'checkout' ? 'Check out' : 
                                       rowActions[rowId].action === 'dereserviert' ? 'Dereserviert' : 
                                       rowActions[rowId].action}</strong> - {rowActions[rowId].userName}
                            </div>
                          ) : (
                            <span style={{ color: '#999' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '0.5rem', width: '20%' }}>
                          {manufacturer || '-'}
                        </td>
                        <td style={{ padding: '0.5rem', width: '35%', fontSize: '0.85rem', wordBreak: 'break-word' }}>
                          {productFull ? (
                            <span>{productFull}</span>
                          ) : (
                            <span style={{ color: '#999' }}>-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredImeis.length > 0 && totalPages > 1 && (
            <div className="imeis-pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="btn btn--secondary btn--small"
              >
                Zurück
              </button>
              <span className="imeis-pagination-info">
                Seite <strong>{currentPage}</strong> von <strong>{totalPages}</strong>
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="btn btn--secondary btn--small"
              >
                Weiter
              </button>
            </div>
          )}
        </div>
      </div>

      <ImeisHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        copyHistory={copyHistory}
        onUpdateHistoryAction={handleUpdateHistoryAction}
        historyUndoStack={historyUndoStack}
        onUndo={handleHistoryUndo}
      />

      <ImeisZustandModal
        isOpen={showZustandModal}
        onClose={() => {
          setShowZustandModal(false);
          setZustandDataCache(null);
          setZustandLoading(false);
        }}
        zustandData={zustandDataCache}
        loading={zustandLoading}
      />

      <ImeisRateLimitModal
        isOpen={showRateLimitModal}
        onClose={() => setShowRateLimitModal(false)}
        message={rateLimitMessage}
      />
    </div>
  );
};

export default Imeis;
