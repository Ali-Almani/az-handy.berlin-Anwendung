import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { isAdmin } from '../../utils/roles';
import { loadImeis, deleteAllImeis } from '../../utils/storage';
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
  getManufacturer as getManufacturerUtil
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

  useEffect(() => {
    // Lade IMEIs aus IndexedDB
    const loadImeisData = async () => {
      try {
        const storedImeis = await loadImeis();
        setImeis(storedImeis);
        
        // Lade gespeicherte Textfarben
        const savedColors = JSON.parse(localStorage.getItem('imeis-cell-text-colors') || '{}');
        setCellTextColors(savedColors);
        
        // Lade gespeicherte Aktionen
        const savedActions = JSON.parse(localStorage.getItem('imeis-row-actions') || '{}');
        setRowActions(savedActions);
        
        // Lade Kopier-Verlauf
        const savedCopyHistory = JSON.parse(localStorage.getItem('imeis-copy-history') || '[]');
        
        // Entferne Duplikate basierend auf IMEI-Nummer (behalte den neuesten Eintrag)
        const uniqueHistoryMap = new Map();
        savedCopyHistory.forEach(entry => {
          const imei = entry.imei;
          const existingEntry = uniqueHistoryMap.get(imei);
          if (!existingEntry || new Date(entry.timestamp) > new Date(existingEntry.timestamp)) {
            uniqueHistoryMap.set(imei, entry);
          }
        });
        
        // Konvertiere Map zurück zu Array und setze alle auf "checkout" (Standard)
        // Behalte nur "abgelehnt" wenn bereits gesetzt, sonst setze auf "checkout"
        const updatedHistory = Array.from(uniqueHistoryMap.values())
          .map(entry => ({
            ...entry,
            action: entry.action === 'abgelehnt' ? 'abgelehnt' : 'checkout' // Setze alle auf "checkout", außer "abgelehnt"
          }))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sortiere nach neuestem zuerst
        
        setCopyHistory(updatedHistory);
        // Speichere aktualisierten Verlauf
        localStorage.setItem('imeis-copy-history', JSON.stringify(updatedHistory));
        
        // Extrahiere alle verfügbaren Sheets
        const sheets = new Set();
        storedImeis.forEach(item => {
          if (item.sheet) {
            sheets.add(item.sheet);
          }
        });
        const sheetsArray = Array.from(sheets);
        setAvailableSheets(sheetsArray);
        
        // Setze aktives Sheet (erstes Sheet oder null)
        if (sheetsArray.length > 0) {
          setActiveSheet(sheetsArray[0]);
        } else {
          setActiveSheet(null);
        }
        
        // Extrahiere alle verfügbaren Hersteller
        const manufacturers = new Set();
        storedImeis.forEach(item => {
          const manufacturer = getManufacturer(item);
          if (manufacturer && manufacturer.trim() !== '') {
            manufacturers.add(manufacturer.trim());
          }
        });
        const manufacturersArray = Array.from(manufacturers).sort();
        console.log('Gefundene Hersteller:', manufacturersArray); // Debug-Ausgabe
        setAvailableManufacturers(manufacturersArray);
        
        // Setze aktiven Hersteller auf null (zeigt "Alle" standardmäßig)
        setActiveManufacturer(null);
        
        // Setze History zurück beim Laden neuer Daten
        setHistory([]);
      } catch (error) {
        console.error('Error loading IMEIs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadImeisData();
  }, []);

  // Schließe Farbauswahl beim Klick außerhalb
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showColorPicker && !event.target.closest('.imeis-color-picker')) {
        // Wenn auf eine andere Zelle geklickt wird, schließe Farbauswahl
        if (event.target.closest('.imeis-cell')) {
          setShowColorPicker(false);
          setSelectedCell(null);
        } else {
          // Wenn außerhalb geklickt wird, schließe nur Farbauswahl, behalte Markierung
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

  // Filtere IMEIs basierend auf aktivem Sheet, Hersteller und Produkt
  useEffect(() => {
    let filtered = imeis;
    
    // Filtere nach aktivem Sheet
    if (activeSheet) {
      filtered = filtered.filter(item => item.sheet === activeSheet);
    }
    
    // Filtere nach aktivem Hersteller
    if (activeManufacturer) {
      filtered = filtered.filter(item => {
        const manufacturer = getManufacturer(item);
        return manufacturer && manufacturer.trim() === activeManufacturer;
      });
    }
    
    // Verschachtelte Struktur für alle Hersteller (Version → Variante → GB → Farbe)
    if (activeManufacturer) {
      // Filtere nach Version
      if (activeVersion) {
        filtered = filtered.filter(item => {
          const productFull = getProductFull(item);
          const version = extractProductVersion(productFull);
          return version === activeVersion;
        });
      }
      
      // Filtere nach Variante (nur wenn Version aktiv ist)
      if (activeVersion && activeVariant !== null) {
        filtered = filtered.filter(item => {
          const productFull = getProductFull(item);
          const version = extractProductVersion(productFull);
          if (version !== activeVersion) return false;
          
          const variant = extractProductVariant(productFull);
          // Wenn activeVariant leer ist (''), zeige nur Standard-Versionen (ohne Variante)
          if (activeVariant === '') {
            return variant === '';
          }
          // Sonst filtere nach der spezifischen Variante
          return variant === activeVariant;
        });
      }
      
      // Filtere nach GB (nur wenn Version und Variante aktiv sind)
      if (activeVersion && activeVariant !== null && activeGB) {
        filtered = filtered.filter(item => {
          const productFull = getProductFull(item);
          const gb = extractGB(productFull);
          return gb === activeGB;
        });
      }
      
      // Farb-Filterung deaktiviert
    }
    
    // Normale Produktfilterung (nur wenn keine Version aktiv ist)
    if (!activeVersion && activeProduct) {
      // Normale Produktfilterung (für andere Hersteller)
      // Spezieller Fall: "o2-Aktion" Tab
      if (activeProduct === 'o2-Aktion') {
        filtered = filtered.filter(item => hasO2Aktion(item));
      } else {
        // Normale Produktfilterung
        filtered = filtered.filter(item => {
          const product = getProduct(item);
          return product && product.trim() === activeProduct;
        });
      }
    }
    
    // Filtere nach Suchbegriff
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(item =>
        item.imei.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtere reservierte IMEIs aus (nicht sichtbar machen)
    filtered = filtered.filter(item => {
      const rowId = `${item.sheet || 'default'}-${item.imei}-${item.row}`;
      const action = rowActions[rowId]?.action;
      return action !== 'reservieren';
    });
    
    setFilteredImeis(filtered);
    
    // Extrahiere Spalten für das aktive Sheet
    // WICHTIG: Verwende die gespeicherte Spaltenreihenfolge (columnOrder) aus der Excel-Datei
    // um die exakte Reihenfolge zu behalten, auch wenn Spalten leer sind
    if (filtered.length > 0) {
      const firstItem = filtered[0];
      let columns = [];
      
      // Verwende columnOrder falls vorhanden (aus Excel-Datei)
      if (firstItem.columnOrder && Array.isArray(firstItem.columnOrder)) {
        columns = [...firstItem.columnOrder];
      } else if (firstItem.rowData) {
        // Fallback: Verwende die erste Zeile als Referenz
        // Sammle alle Spaltennamen aus allen Zeilen
        const allColumnNames = new Set();
        filtered.forEach(item => {
          if (item.rowData) {
            Object.keys(item.rowData).forEach(key => allColumnNames.add(key));
          }
        });
        
        // Verwende die Reihenfolge aus der ersten Zeile
        const firstRowKeys = Object.keys(firstItem.rowData);
        
        // Füge zuerst alle Spalten aus der ersten Zeile hinzu (in Reihenfolge)
        firstRowKeys.forEach(key => {
          if (!columns.includes(key)) {
            columns.push(key);
          }
        });
        
        // Dann füge alle anderen Spalten hinzu, die in anderen Zeilen vorkommen
        allColumnNames.forEach(key => {
          if (!columns.includes(key)) {
            columns.push(key);
          }
        });
      } else if (firstItem.data && Array.isArray(firstItem.data)) {
        // Finde die maximale Anzahl von Spalten über alle Zeilen
        let maxCols = 0;
        filtered.forEach(item => {
          if (item.data && Array.isArray(item.data)) {
            maxCols = Math.max(maxCols, item.data.length);
          }
        });
        
        // Erstelle Spaltennamen basierend auf der maximalen Anzahl
        for (let i = 0; i < maxCols; i++) {
          columns.push(`Spalte${i + 1}`);
        }
      }
      
      setAllColumns(columns);
    } else {
      setAllColumns([]);
    }
    
    // Setze zurück zur ersten Seite und lösche Auswahl
    setCurrentPage(1);
    setSelectedCells(new Set());
  }, [activeSheet, activeManufacturer, activeProduct, activeVersion, activeVariant, activeGB, searchTerm, imeis, getManufacturer, getProduct, hasO2Aktion, rowActions, getProductFull, extractProductVersion, extractProductVariant, extractGB, extractColor]);

  // Aktualisiere verfügbare Hersteller wenn sich IMEIs ändern
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
    
    // Wenn der aktive Hersteller nicht mehr existiert, setze auf null oder ersten verfügbaren
    // Wenn der aktive Hersteller nicht mehr existiert, setze auf null (zeigt "Alle")
    if (activeManufacturer && !manufacturersArray.includes(activeManufacturer)) {
      setActiveManufacturer(null);
    }
    // Entfernt: Automatisches Setzen des ersten Herstellers
    // Der Benutzer soll selbst wählen können, ob "Alle" oder ein spezifischer Hersteller
  }, [imeis, getManufacturer, activeManufacturer]);

  // Aktualisiere verfügbare Produkte wenn sich der aktive Hersteller ändert
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
        // Prüfe ob es o2-Aktion Produkte gibt
        if (hasO2Aktion(item)) {
          hasO2AktionProducts = true;
        }
        
        const product = getProduct(item);
        if (product && product.trim() !== '') {
          products.add(product.trim());
        }
      }
    });
    
    // Sortiere Produkte nach Version und GB
    const productsArray = Array.from(products).sort((a, b) => {
      // Extrahiere GB-Werte
      const gbA = extractGB(a);
      const gbB = extractGB(b);
      
      // Entferne GB für Vergleich
      const nameA = a.replace(/\s*\d+\s*(GB|TB|gb|tb)\s*/gi, '').trim();
      const nameB = b.replace(/\s*\d+\s*(GB|TB|gb|tb)\s*/gi, '').trim();
      
      // Extrahiere Basis-Produktname (ohne Varianten wie Pro, Plus, Mini, Titan)
      const getBaseName = (name) => {
        // Entferne Varianten-Wörter
        return name
          .replace(/\s+(pro|plus|mini|max|ultra|titan|titanium|standard|regular)\s*/gi, ' ')
          .replace(/\s+(pro|plus|mini|max|ultra|titan|titanium|standard|regular)$/gi, '')
          .trim();
      };
      
      const baseNameA = getBaseName(nameA);
      const baseNameB = getBaseName(nameB);
      
      // Extrahiere Versionsnummern (z.B. "15" aus "iPhone 15 Pro Titan")
      const extractVersion = (name) => {
        // Suche nach Zahlen im Namen (z.B. "iPhone 15" -> 15, "Pixel 8" -> 8, "Galaxy S23" -> 23)
        const versionMatch = name.match(/(\d+)/);
        return versionMatch ? parseInt(versionMatch[1]) : 0;
      };
      
      const versionA = extractVersion(nameA);
      const versionB = extractVersion(nameB);
      
      // Extrahiere Variante (Pro, Plus, Mini, etc.)
      const getVariant = (name) => {
        const variantMatch = name.match(/\s+(pro|plus|mini|max|ultra|titan|titanium|standard|regular)\s*/i);
        return variantMatch ? variantMatch[1].toLowerCase() : '';
      };
      
      const variantA = getVariant(nameA);
      const variantB = getVariant(nameB);
      
      // Sortiere zuerst nach Basis-Produktname (iPhone, Pixel, Galaxy, etc.)
      const baseCompare = baseNameA.localeCompare(baseNameB, undefined, { numeric: true, sensitivity: 'base' });
      if (baseCompare !== 0) {
        return baseCompare;
      }
      
      // Wenn Basis-Name gleich ist, sortiere nach Versionsnummer (niedrigere zuerst)
      if (versionA !== versionB) {
        return versionA - versionB;
      }
      
      // Wenn Versionsnummern gleich sind, sortiere nach Variante (alphabetisch)
      if (variantA !== variantB) {
        return variantA.localeCompare(variantB);
      }
      
      // Wenn alles gleich ist, sortiere nach GB (128GB vor 256GB vor 512GB vor 1TB)
      if (gbA && gbB) {
        // Konvertiere TB zu GB für Vergleich (1TB = 1024GB)
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
      
      // Wenn ein Produkt GB hat und das andere nicht, sortiere das mit GB nach hinten
      if (gbA && !gbB) return 1;
      if (!gbA && gbB) return -1;
      
      // Fallback: normale Sortierung
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
    
    // Füge "o2-Aktion" am Anfang hinzu, wenn es solche Produkte gibt
    if (hasO2AktionProducts) {
      productsArray.unshift('o2-Aktion');
    }
    
    setAvailableProducts(productsArray);
    
    // Wenn das aktive Produkt nicht mehr existiert, setze auf null
    if (activeProduct && !productsArray.includes(activeProduct)) {
      setActiveProduct(null);
    }
  }, [activeManufacturer, imeis, getManufacturer, getProduct, activeProduct, hasO2Aktion, extractGB]);

  // Berechne verfügbare Versionen, Varianten, GB und Farben für alle Hersteller
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

    // Filtere IMEIs nach aktivem Hersteller
    let allManufacturerItems = imeis.filter(item => {
      const manufacturer = getManufacturer(item);
      return manufacturer && manufacturer.trim() === activeManufacturer;
    });

    // Sammle alle verfügbaren Versionen aus ALLEN Produkten des Herstellers
    const versions = new Set();
    allManufacturerItems.forEach(item => {
      const productFull = getProductFull(item);
      const version = extractProductVersion(productFull);
      if (version) {
        versions.add(version);
      }
    });
    // Sortiere Versionen intelligent (z.B. "12" < "13", "S23" < "S24")
    const versionsArray = Array.from(versions).sort((a, b) => {
      // Wenn beide Zahlen sind, sortiere numerisch
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      // Sonst alphabetisch
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
    setAvailableVersions(versionsArray);

    // Sammle alle verfügbaren Varianten (nur wenn Version aktiv ist)
    if (activeVersion) {
      // Filtere nach Version für Varianten-Berechnung
      let versionFiltered = allManufacturerItems.filter(item => {
        const productFull = getProductFull(item);
        const version = extractProductVersion(productFull);
        return version === activeVersion;
      });

      const variants = new Set();
      versionFiltered.forEach(item => {
        const productFull = getProductFull(item);
        const variant = extractProductVariant(productFull);
        // Füge auch leere Variante hinzu (Standard-Version)
        variants.add(variant || '');
      });
      const variantsArray = Array.from(variants).sort((a, b) => {
        // Leere Variante (Standard) zuerst, dann alphabetisch
        if (a === '') return -1;
        if (b === '') return 1;
        return a.localeCompare(b);
      });
      setAvailableVariants(variantsArray);
    } else {
      setAvailableVariants([]);
    }

    // Sammle alle verfügbaren GB-Optionen (nur wenn Version und Variante aktiv sind)
    if (activeVersion && activeVariant !== null) {
      // Filtere nach Version und Variante für GB-Berechnung
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
        // Sortiere nach GB-Wert (128GB < 256GB < 512GB < 1TB)
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

    // Sammle alle verfügbaren Farben (nur wenn Version, Variante und GB aktiv sind)
    if (activeVersion && activeVariant !== null && activeGB) {
      // Filtere nach Version, Variante und GB für Farb-Berechnung
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

    // Setze aktive Werte zurück, wenn sie nicht mehr verfügbar sind
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
    // Farb-Validierung deaktiviert
  }, [activeManufacturer, activeVersion, activeVariant, activeGB, imeis, getManufacturer, getProductFull, extractProductVersion, extractProductVariant, extractGB, extractColor]);

  // Berechne Pagination
  const totalPages = Math.ceil(filteredImeis.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentImeis = filteredImeis.slice(startIndex, endIndex);

  // Schließe Dropdown wenn sich die Auswahl ändert
  useEffect(() => {
    // Prüfe ob noch eine IMEI-Zelle markiert ist
    let hasSelectedRow = false;
    currentImeis.forEach(item => {
      const rowId = `${item.sheet || 'default'}-${item.imei}-${item.row}`;
      const imeiCellId = `${rowId}-imei`;
      const isImeiSelected = selectedCells.has(imeiCellId);
      
      if (isImeiSelected) {
        hasSelectedRow = true;
      }
    });
    
    if (!hasSelectedRow && showRowDropdown) {
      setShowRowDropdown(false);
      setSelectedRowForDropdown(null);
    }
  }, [selectedCells, currentImeis, showRowDropdown]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedCells.size === 0) {
      return; // Keine Zellen markiert, nichts zu tun
    }

    // Automatisches Löschen ohne Bestätigung (wie Excel)
    try {
      // Speichere aktuellen Zustand für Undo
      const currentState = {
        imeis: JSON.parse(JSON.stringify(imeis)),
        cellTextColors: { ...cellTextColors },
        timestamp: Date.now()
      };
      setHistory(prev => [...prev, currentState].slice(-10)); // Maximal 10 Einträge im History

      const updatedImeis = imeis.map(item => {
        const rowId = `${item.sheet || 'default'}-${item.imei}-${item.row}`;
        let updatedItem = { ...item };
        
        // Prüfe jede Spalte
        if (selectedCells.has(`${rowId}-imei`)) {
          updatedItem.imei = '';
        }
        if (selectedCells.has(`${rowId}-row`)) {
          updatedItem.row = '';
        }
        
        // Prüfe alle Daten-Spalten
        if (updatedItem.rowData) {
          const updatedRowData = { ...updatedItem.rowData };
          Object.keys(updatedRowData).forEach(col => {
            if (selectedCells.has(`${rowId}-${col}`)) {
              updatedRowData[col] = '';
            }
          });
          updatedItem.rowData = updatedRowData;
        }
        
        if (updatedItem.data && Array.isArray(updatedItem.data)) {
          updatedItem.data = updatedItem.data.map((val, idx) => {
            const colName = allColumns[idx] || `Spalte${idx + 1}`;
            if (selectedCells.has(`${rowId}-${colName}`)) {
              return '';
            }
            return val;
          });
        }
        
        return updatedItem;
      });
      
      setImeis(updatedImeis);
      
      // Speichere aktualisierte Daten
      const { saveImeis } = await import('../../utils/storage');
      await saveImeis(updatedImeis);
      
      // Lösche auch Textfarben der gelöschten Zellen
      const updatedColors = { ...cellTextColors };
      selectedCells.forEach(cellId => {
        delete updatedColors[cellId];
      });
      setCellTextColors(updatedColors);
      localStorage.setItem('imeis-cell-text-colors', JSON.stringify(updatedColors));
      
      setSelectedCells(new Set());
    } catch (error) {
      console.error('Error deleting selected cells:', error);
      alert('Fehler beim Löschen der markierten Zellen');
    }
  }, [selectedCells, imeis, cellTextColors, allColumns]);

  // Rate-Limiting Funktion: Prüft ob innerhalb von 30 Minuten maximal 5 IMEIs kopiert wurden
  const checkCopyRateLimit = useCallback(() => {
    if (!user?.name) {
      return { allowed: true, remaining: 5 };
    }

    const storageKey = `imeis-copy-rate-limit-${user.name}`;
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000; // 30 Minuten in Millisekunden
    const maxCopies = 5;

    // Lade gespeicherte Kopiervorgänge
    const savedCopies = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    // Filtere Kopiervorgänge innerhalb der letzten 30 Minuten
    const recentCopies = savedCopies.filter(timestamp => {
      return (now - timestamp) < thirtyMinutes;
    });

    // Entferne alte Kopiervorgänge aus localStorage
    if (recentCopies.length !== savedCopies.length) {
      localStorage.setItem(storageKey, JSON.stringify(recentCopies));
    }

    const remaining = maxCopies - recentCopies.length;
    const allowed = recentCopies.length < maxCopies;

    return { allowed, remaining: Math.max(0, remaining), count: recentCopies.length };
  }, [user]);

  // Funktion zum Registrieren eines Kopiervorgangs
  const registerCopyAction = useCallback(() => {
    if (!user?.name) {
      return;
    }

    const storageKey = `imeis-copy-rate-limit-${user.name}`;
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;

    // Lade gespeicherte Kopiervorgänge
    const savedCopies = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    // Filtere Kopiervorgänge innerhalb der letzten 30 Minuten
    const recentCopies = savedCopies.filter(timestamp => {
      return (now - timestamp) < thirtyMinutes;
    });

    // Füge neuen Kopiervorgang hinzu
    recentCopies.push(now);
    
    // Speichere aktualisierte Liste
    localStorage.setItem(storageKey, JSON.stringify(recentCopies));
  }, [user]);

  // Kopier-Funktion für eine einzelne Zeile - kopiert nur die IMEI-Nummer
  const handleCopyRow = useCallback(async (item, action = null) => {
    try {
      // Prüfe Rate-Limit
      const rateLimit = checkCopyRateLimit();
      if (!rateLimit.allowed) {
        const storageKey = `imeis-copy-rate-limit-${user?.name || 'unknown'}`;
        const savedCopies = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const now = Date.now();
        const thirtyMinutes = 30 * 60 * 1000;
        
        // Finde den ältesten Kopiervorgang innerhalb der letzten 30 Minuten
        const oldestCopy = savedCopies.length > 0 ? Math.min(...savedCopies.filter(t => (now - t) < thirtyMinutes)) : now;
        const minutesRemaining = Math.ceil((thirtyMinutes - (now - oldestCopy)) / (60 * 1000));
        
        setRateLimitMessage(`Rate-Limit erreicht! Sie haben bereits 5 IMEIs innerhalb der letzten 30 Minuten kopiert. Bitte warten Sie noch ${minutesRemaining} Minute(n).`);
        setShowRateLimitModal(true);
        return;
      }

      console.log('Kopiere IMEI:', item.imei, 'mit Aktion:', action);
      // Kopiere nur die IMEI-Nummer
      const imeiToCopy = String(item.imei || '').trim();

      console.log('Zu kopierender IMEI:', imeiToCopy);

      if (imeiToCopy) {
        await navigator.clipboard.writeText(imeiToCopy);
        
        // Registriere Kopiervorgang für Rate-Limiting
        registerCopyAction();
        console.log('Erfolgreich kopiert!');
        
        // Füge zum Verlauf hinzu
        // Standardmäßig "checkout" setzen
        // Produkt mit o2-Aktion, aber ohne Herstellernamen
        const productFull = getProductFull(item);
        let productForHistory = productFull || '';
        
        // Entferne Herstellernamen (z.B. "Apple", "Google", etc.)
        const manufacturer = getManufacturer(item);
        if (manufacturer && productForHistory) {
          // Entferne Herstellernamen am Anfang oder im Text
          const manufacturerLower = manufacturer.toLowerCase();
          const productLower = productForHistory.toLowerCase();
          
          // Entferne am Anfang (z.B. "Apple iPhone" -> "iPhone")
          if (productLower.startsWith(manufacturerLower)) {
            productForHistory = productForHistory.substring(manufacturer.length).trim();
          }
          
          // Entferne im Text (z.B. "o2-Aktion Apple iPhone" -> "o2-Aktion iPhone")
          const regex = new RegExp(`\\b${manufacturer}\\b`, 'gi');
          productForHistory = productForHistory.replace(regex, '').trim();
          
          // Entferne doppelte Leerzeichen
          productForHistory = productForHistory.replace(/\s+/g, ' ').trim();
        }
        
        const historyEntry = {
          imei: imeiToCopy,
          product: productForHistory || '-', // Produkt mit o2-Aktion, aber ohne Herstellernamen
          action: 'checkout', // Standard: "checkout"
          timestamp: new Date().toISOString(),
          userName: user?.name || 'Unbekannt'
        };
        
        // Entferne Duplikate basierend auf IMEI-Nummer (behalte den neuesten)
        const filteredHistory = copyHistory.filter(entry => entry.imei !== imeiToCopy);
        const updatedHistory = [historyEntry, ...filteredHistory].slice(0, 100); // Maximal 100 Einträge
        setCopyHistory(updatedHistory);
        localStorage.setItem('imeis-copy-history', JSON.stringify(updatedHistory));
        
        setCopySuccess(true);
        setTimeout(() => {
          setCopySuccess(false);
        }, 2000);
        // Markierung nicht löschen, nur Dropdown zurücksetzen
        setSelectedRowForDropdown(null);
      } else {
        console.warn('Keine IMEI zum Kopieren gefunden');
      }
    } catch (error) {
      console.error('Error copying IMEI to clipboard:', error);
      alert('Fehler beim Kopieren in die Zwischenablage: ' + error.message);
    }
  }, [getProductFull, getManufacturer, user, copyHistory, checkCopyRateLimit, registerCopyAction]);

  // Handler für Dropdown-Auswahl
  const handleDropdownSelect = useCallback(async (item, action) => {
    const rowId = `${item.sheet || 'default'}-${item.imei}-${item.row}`;
    
    // Speichere die Aktion mit Benutzername
    const actionData = {
      action: action,
      userName: user?.name || 'Unbekannt',
      timestamp: new Date().toISOString()
    };
    
    const updatedActions = {
      ...rowActions,
      [rowId]: actionData
    };
    
    setRowActions(updatedActions);
    localStorage.setItem('imeis-row-actions', JSON.stringify(updatedActions));
    
    console.log('Dropdown-Auswahl:', action, 'für IMEI:', item.imei, 'von Benutzer:', user?.name);
    
    // Kopiere die Zeile automatisch mit Aktion
    await handleCopyRow(item, action);
    
    // Setze die Dropdown-Auswahl nicht zurück, damit die gewählte Aktion sichtbar bleibt
  }, [handleCopyRow, user, rowActions]);

  // Handler zum Aktualisieren der Aktion im Verlauf
  const handleUpdateHistoryAction = useCallback((index, newAction) => {
    if (index < 0 || index >= copyHistory.length) return;
    
    const entry = copyHistory[index];
    const oldAction = entry.action || null;
    
    // Speichere den vorherigen Zustand für Rückgängig
    const undoState = {
      index,
      entry: { ...entry },
      oldAction,
      newAction,
      rowActionsSnapshot: { ...rowActions }
    };
    
    // Wenn "angenommen" gewählt wird, entferne die IMEI aus dem Verlauf
    if (newAction === 'angenommen') {
      setHistoryUndoStack(prev => [...prev, undoState]);
      const updatedHistory = copyHistory.filter((_, i) => i !== index);
      setCopyHistory(updatedHistory);
      localStorage.setItem('imeis-copy-history', JSON.stringify(updatedHistory));
      console.log('IMEI aus Verlauf gelöscht (angenommen):', entry.imei);
      return;
    }
    
    // Wenn "abgelehnt" gewählt wird, entferne die IMEI aus dem Verlauf und entferne aus rowActions
    if (newAction === 'abgelehnt') {
      setHistoryUndoStack(prev => [...prev, undoState]);
      // Entferne die Reservierung aus rowActions, damit die IMEI wieder in der Liste erscheint
      const imeiToReject = entry.imei;
      const updatedRowActions = { ...rowActions };
      
      // Entferne alle Einträge aus rowActions für diese IMEI
      Object.keys(updatedRowActions).forEach(rowId => {
        if (rowId.includes(`-${imeiToReject}-`)) {
          delete updatedRowActions[rowId];
        }
      });
      
      setRowActions(updatedRowActions);
      localStorage.setItem('imeis-row-actions', JSON.stringify(updatedRowActions));
      
      // Entferne die IMEI aus dem Verlauf
      const updatedHistory = copyHistory.filter((_, i) => i !== index);
      setCopyHistory(updatedHistory);
      localStorage.setItem('imeis-copy-history', JSON.stringify(updatedHistory));
      
      console.log('IMEI abgelehnt und aus Verlauf gelöscht, wieder in Liste verfügbar:', entry.imei);
      return;
    }
    
    // Fallback für andere Aktionen (sollte nicht vorkommen, aber für Sicherheit)
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
    
    console.log('Aktion im Verlauf aktualisiert:', newAction, 'für IMEI:', entry.imei);
  }, [copyHistory, user, rowActions]);

  const handleHistoryModalUndo = useCallback(() => {
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
      updatedHistory[undoState.index] = { ...undoState.entry, action: undoState.oldAction };
      setCopyHistory(updatedHistory);
      localStorage.setItem('imeis-copy-history', JSON.stringify(updatedHistory));
    }
    setHistoryUndoStack(prev => prev.slice(0, -1));
  }, [historyUndoStack, copyHistory]);

  // Kopier-Funktion für ausgewählte Zellen/Zeilen
  const handleCopySelected = useCallback(async () => {
    if (selectedCells.size === 0) {
      return;
    }

    try {
      // Sammle alle ausgewählten Zeilen
      const selectedRows = new Map();
      
      // Zähle eindeutige IMEIs die kopiert werden sollen
      const uniqueImeis = new Set();
      
      selectedCells.forEach(cellId => {
        // Parse cellId: "sheet-imei-row-column" oder "sheet-imei-row-row"
        const parts = cellId.split('-');
        if (parts.length >= 3) {
          const sheet = parts[0];
          const imei = parts[1];
          const row = parts[2];
          const column = parts.slice(3).join('-') || 'row';
          
          const rowKey = `${sheet}-${imei}-${row}`;
          if (!selectedRows.has(rowKey)) {
            selectedRows.set(rowKey, {
              sheet,
              imei,
              row,
              columns: new Set()
            });
            // Zähle eindeutige IMEIs
            if (imei) {
              uniqueImeis.add(imei);
            }
          }
          selectedRows.get(rowKey).columns.add(column);
        }
      });

      // Prüfe Rate-Limit basierend auf Anzahl der eindeutigen IMEIs
      const rateLimit = checkCopyRateLimit();
      const imeisToCopy = uniqueImeis.size;
      const totalAfterCopy = rateLimit.count + imeisToCopy;
      
      if (totalAfterCopy > 5) {
        const remaining = Math.max(0, 5 - rateLimit.count);
        if (remaining === 0) {
          const storageKey = `imeis-copy-rate-limit-${user?.name || 'unknown'}`;
          const savedCopies = JSON.parse(localStorage.getItem(storageKey) || '[]');
          const now = Date.now();
          const thirtyMinutes = 30 * 60 * 1000;
          
          // Finde den ältesten Kopiervorgang innerhalb der letzten 30 Minuten
          const recentCopies = savedCopies.filter(timestamp => (now - timestamp) < thirtyMinutes);
          if (recentCopies.length > 0) {
            const oldestCopy = Math.min(...recentCopies);
            const minutesRemaining = Math.ceil((thirtyMinutes - (now - oldestCopy)) / (60 * 1000));
            setRateLimitMessage(`Rate-Limit erreicht! Sie haben bereits 5 IMEIs innerhalb der letzten 30 Minuten kopiert. Bitte warten Sie noch ${minutesRemaining} Minute(n).`);
          } else {
            setRateLimitMessage('Rate-Limit erreicht! Sie haben bereits 5 IMEIs innerhalb der letzten 30 Minuten kopiert. Bitte warten Sie 30 Minuten.');
          }
        } else {
          setRateLimitMessage(`Sie können nur noch ${remaining} IMEI(s) innerhalb der nächsten 30 Minuten kopieren. Sie haben ${imeisToCopy} IMEI(s) ausgewählt. Bitte reduzieren Sie die Auswahl auf ${remaining} IMEI(s).`);
        }
        setShowRateLimitModal(true);
        return;
      }

      // Erstelle Daten-Array für Kopieren (tab-separated, wie Excel)
      const rowsToCopy = [];
      
      selectedRows.forEach((rowInfo, rowKey) => {
        const item = currentImeis.find(i => 
          `${i.sheet || 'default'}-${i.imei}-${i.row}` === rowKey
        );
        
        if (item) {
          const rowData = [];
          
          // Prüfe ob IMEI oder Hersteller ausgewählt sind
          const isImeiSelected = rowInfo.columns.has('imei');
          const manufacturerKey = Object.keys(item.rowData || {}).find(key => {
            const lowerKey = key.toLowerCase();
            return lowerKey.includes('hersteller') || 
                   lowerKey.includes('manufacturer') || 
                   lowerKey.includes('marke') ||
                   lowerKey.includes('brand');
          });
          const isManufacturerSelected = manufacturerKey && rowInfo.columns.has(manufacturerKey);
          
          // Wenn beide ausgewählt sind oder eine Zeile komplett ausgewählt ist, kopiere beide
          if ((isImeiSelected && isManufacturerSelected) || 
              (isImeiSelected && !manufacturerKey) ||
              (!isImeiSelected && !isManufacturerSelected)) {
            // Kopiere IMEI und Hersteller
            rowData.push(item.imei || '');
            rowData.push(getManufacturer(item) || '');
          } else {
            // Kopiere nur ausgewählte Spalten
            if (isImeiSelected) {
              rowData.push(item.imei || '');
            }
            if (isManufacturerSelected && manufacturerKey) {
              rowData.push(getManufacturer(item) || '');
            }
          }
          
          // Entferne leere Zellen am Ende der Zeile
          while (rowData.length > 0 && (rowData[rowData.length - 1] === '' || rowData[rowData.length - 1] === null || rowData[rowData.length - 1] === undefined)) {
            rowData.pop();
          }
          
          if (rowData.length > 0) {
            rowsToCopy.push(rowData);
          }
        }
      });

      // Formatiere als tab-separated values (wie Excel)
      // Entferne leere Zellen und trimme Werte
      const textToCopy = rowsToCopy
        .map(row => {
          // Entferne leere Zellen am Ende (sollte bereits gemacht sein, aber zur Sicherheit)
          const cleanedRow = [...row];
          while (cleanedRow.length > 0 && (!cleanedRow[cleanedRow.length - 1] || String(cleanedRow[cleanedRow.length - 1]).trim() === '')) {
            cleanedRow.pop();
          }
          return cleanedRow.map(cell => {
            const cellValue = String(cell || '').trim();
            return cellValue.replace(/\t/g, ' '); // Ersetze Tabs innerhalb des Werts
          }).join('\t');
        })
        .filter(row => row.trim() !== '') // Entferne komplett leere Zeilen
        .join('\n');

      if (textToCopy) {
        await navigator.clipboard.writeText(textToCopy);
        
        // Registriere Kopiervorgänge für Rate-Limiting (einmal pro eindeutigem IMEI)
        uniqueImeis.forEach(() => {
          registerCopyAction();
        });
        
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('Fehler beim Kopieren in die Zwischenablage');
    }
  }, [selectedCells, currentImeis, allColumns, checkCopyRateLimit, registerCopyAction, user]);

  // Delete-Taste und Copy-Taste Handler
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Prüfe ob Delete oder Backspace gedrückt wurde
      // Nur wenn keine Eingabefelder fokussiert sind
      if ((event.key === 'Delete' || event.key === 'Backspace') && 
          selectedCells.size > 0 &&
          event.target.tagName !== 'INPUT' && 
          event.target.tagName !== 'TEXTAREA') {
        // Verhindere Standard-Verhalten (z.B. Browser-Navigation)
        event.preventDefault();
        handleDeleteSelected();
      }
      
      // Prüfe ob Ctrl+C oder Cmd+C gedrückt wurde - DEAKTIVIERT: Kopieren nur über Dropdown-Aktion möglich
      // if ((event.ctrlKey || event.metaKey) && event.key === 'c' &&
      //     selectedCells.size > 0 &&
      //     event.target.tagName !== 'INPUT' && 
      //     event.target.tagName !== 'TEXTAREA') {
      //   event.preventDefault();
      //   handleCopySelected();
      // }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedCells, handleDeleteSelected, handleCopySelected]);

  const handleUndo = async () => {
    if (history.length === 0) {
      alert('Keine Aktion zum Rückgängigmachen verfügbar.');
      return;
    }

    try {
      const lastState = history[history.length - 1];
      
      // Stelle vorherigen Zustand wieder her
      setImeis(lastState.imeis);
      
      // Aktualisiere gefilterte IMEIs basierend auf aktuellem Filter
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
      
      // Speichere wiederhergestellte Daten
      const { saveImeis } = await import('../../utils/storage');
      await saveImeis(lastState.imeis);
      localStorage.setItem('imeis-cell-text-colors', JSON.stringify(lastState.cellTextColors));
      
      // Entferne letzten Eintrag aus History
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
        // Speichere aktuellen Zustand für Undo
        const currentState = {
          imeis: JSON.parse(JSON.stringify(imeis)),
          cellTextColors: { ...cellTextColors },
          timestamp: Date.now()
        };
        setHistory(prev => [...prev, currentState].slice(-10)); // Maximal 10 Einträge im History

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

  // Funktion zum Extrahieren des Produktnamens bis zur Version (nur Produktname + Version, ohne Varianten)
  const getProductToVersion = useCallback((item) => {
    const productFull = getProductFull(item);
    if (!productFull || productFull.trim() === '') {
      return null;
    }

    let productStr = String(productFull).trim();
    
    // SOFORTIGE Entfernung von "ultramarin" und "marin" - bevor alle anderen Transformationen
    // Entferne "ultramarin" zuerst (zusammengesetztes Wort)
    productStr = productStr.replace(/\s*ultramarin\s*/gi, ' ');
    productStr = productStr.replace(/ultramarin\s*/gi, '');
    productStr = productStr.replace(/\s*ultramarin/gi, '');
    productStr = productStr.replace(/ultramarin/gi, '');
    // Entferne "marin" in allen Varianten und Positionen
    productStr = productStr.replace(/\s*marin\s*/gi, ' ');
    productStr = productStr.replace(/marin\s*/gi, '');
    productStr = productStr.replace(/\s*marin/gi, '');
    productStr = productStr.replace(/marin/gi, '');
    productStr = productStr.replace(/\s+/g, ' ').trim();
    
    // Entferne GB-Angaben zuerst
    productStr = productStr.replace(/\s*\d+\s*(GB|TB|gb|tb)\s*/gi, ' ');
    productStr = productStr.trim();
    
    // Entferne "o2-Aktion" zuerst
    productStr = productStr.replace(/^o2[- ]?aktion\s+/i, '');
    productStr = productStr.replace(/\s+o2[- ]?aktion\s+/i, ' ');
    productStr = productStr.replace(/\s+o2[- ]?aktion$/i, '');
    productStr = productStr.trim();
    
    // Entferne Herstellernamen am Anfang
    const manufacturers = [
      'apple', 'google', 'samsung', 'huawei', 'xiaomi', 'oneplus', 'oppo', 
      'vivo', 'realme', 'motorola', 'nokia', 'sony', 'lg', 'honor'
    ];
    
    for (const manufacturer of manufacturers) {
      const regexStart = new RegExp(`^${manufacturer}\\s+`, 'i');
      productStr = productStr.replace(regexStart, '');
      const regexMiddle = new RegExp(`\\s+${manufacturer}\\s+`, 'i');
      productStr = productStr.replace(regexMiddle, ' ');
    }
    productStr = productStr.trim();
    
    // Entferne Farben - erweiterte Liste mit deutschen und englischen Farben
    const colors = [
      'natural titanium', 'blue titanium', 'white titanium', 'space gray', 'space grey',
      'spacegray', 'spacegrey', 'sierra blue', 'alpine green', 'pacific blue',
      'product red', 'jet black', 'matte black', 'deep purple', 'light blue',
      'forest green', 'ocean blue', 'arctic white', 'phantom black', 'phantom white',
      'aurora green', 'aurora blue', 'prism white', 'prism black', 'prism blue',
      'prism green', 'ceramic white', 'ceramic black', 'pearl white', 'pearl black',
      'cosmic black', 'cosmic grey', 'cosmic gray', 'aurora silver', 'aurora gray',
      'aurora grey', 'aurora black', 'phantom silver', 'phantom gray', 'phantom grey',
      'schwarz', 'black', 'weiß', 'weiss', 'white', 'rot', 'red', 'blau', 'blue',
      'grün', 'green', 'gelb', 'yellow', 'grau', 'grey', 'gray', 'silber',
      'silver', 'gold', 'golden', 'pink', 'rosa', 'lila', 'purple', 'violett',
      'violet', 'orange', 'türkis', 'turquoise', 'beige', 'braun', 'brown',
      'mint', 'coral', 'midnight', 'mitternacht', 'mittern', 'starlight', 'graphite', 'graphit', 'lavender', 'sunset',
      'onyx black', 'onyx', 'titanium', 'tiefblau', 'salbei', 'cosmic', 'titan',
      'lavendel', 'nebelblau', 'blaugrün', 'blaugruen', 'ultramarin', 'marin', 'wüstensand', 'wuestensand',
      'natur', 'natural', 'titanium blue', 'titanium white', 'titanium natural',
      'polarstern', 'lightgray', 'light gray', 'olive', 'dunkelblau', 'iris', 'obsidian',
      'porcelain', 'arcanine', 'ocean', 'trail', 'alpine', 'awesome'
    ];
    
    // Mehrfaches Durchlaufen, um sicherzustellen, dass alle Farben entfernt werden
    const sortedColors = [...colors].sort((a, b) => b.length - a.length);
    let previousLength = productStr.length;
    let iterations = 0;
    const maxIterations = 15; // Mehr Durchläufe für bessere Erkennung
    
    while (iterations < maxIterations) {
      for (const color of sortedColors) {
        
        // Escape spezielle Regex-Zeichen in der Farbe
        const escapedColor = color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Entferne Farbe am Anfang (mit oder ohne Leerzeichen)
        const regexStart = new RegExp(`^${escapedColor}\\s+`, 'i');
        productStr = productStr.replace(regexStart, '');
        
        // Entferne Farbe am Ende (mit oder ohne Leerzeichen) - wichtig für alle Versionen
        const regexEnd = new RegExp(`\\s+${escapedColor}\\s*$`, 'i');
        productStr = productStr.replace(regexEnd, '');
        
        // Entferne Farbe im Text (mit Leerzeichen davor und danach)
        const regexMiddle = new RegExp(`\\s+${escapedColor}\\s+`, 'i');
        productStr = productStr.replace(regexMiddle, ' ');
        
        // Entferne Farbe mit Bindestrich oder Unterstrichen
        const regexHyphen = new RegExp(`[-_]${escapedColor}[-_]?`, 'i');
        productStr = productStr.replace(regexHyphen, '');
        
        // Entferne Farbe nach jeder Zahl (z.B. "iPhone 16 blaugrün" -> "iPhone 16")
        // Wichtig: Verwende Word Boundary für bessere Erkennung
        const regexAfterNumber = new RegExp(`(\\d+)\\s+${escapedColor}\\b`, 'gi');
        productStr = productStr.replace(regexAfterNumber, '$1');
        
        // Entferne Farbe nach jedem Wort (z.B. "iPhone blaugrün" -> "iPhone")
        const regexAfterWord = new RegExp(`(\\w+)\\s+${escapedColor}\\b`, 'gi');
        productStr = productStr.replace(regexAfterWord, '$1');
        
        // Entferne Farbe am Ende nach Leerzeichen (allgemeiner Fall) - ohne Word Boundary für bessere Erkennung
        const regexEndWithBoundary = new RegExp(`\\s+${escapedColor}\\s*$`, 'gi');
        productStr = productStr.replace(regexEndWithBoundary, '');
        
        // Entferne Farbe nach jeder Zahl ohne Word Boundary (für Fälle wie "16 marin")
        const regexAfterNumberNoBoundary = new RegExp(`(\\d+)\\s+${escapedColor}(?=\\s|$)`, 'gi');
        productStr = productStr.replace(regexAfterNumberNoBoundary, '$1');
        
        // Entferne Farbe nach jedem Wort ohne Word Boundary
        const regexAfterWordNoBoundary = new RegExp(`(\\w+)\\s+${escapedColor}(?=\\s|$)`, 'gi');
        productStr = productStr.replace(regexAfterWordNoBoundary, '$1');
      }
      
      // Entferne doppelte Leerzeichen und trimme
      productStr = productStr.replace(/\s+/g, ' ').trim();
      
      // Wenn sich nichts mehr geändert hat, sind alle Farben entfernt
      if (productStr.length === previousLength) {
        break;
      }
      previousLength = productStr.length;
      iterations++;
    }
    
    // Zusätzliche Entfernung: Entferne alle bekannten Farben am Ende (falls noch vorhanden)
    // Mehrfaches Durchlaufen für bessere Erkennung
    for (let i = 0; i < 5; i++) {
      for (const color of sortedColors) {
        const escapedColor = color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Entferne Farbe am Ende
        const regexEndFinal = new RegExp(`\\s+${escapedColor}\\s*$`, 'i');
        productStr = productStr.replace(regexEndFinal, '');
        // Entferne Farbe nach Zahlen (z.B. "16 marin")
        const regexAfterNum = new RegExp(`(\\d+)\\s+${escapedColor}(?=\\s|$)`, 'gi');
        productStr = productStr.replace(regexAfterNum, '$1');
        // Entferne Farbe nach Wörtern
        const regexAfterWord = new RegExp(`(\\w+)\\s+${escapedColor}(?=\\s|$)`, 'gi');
        productStr = productStr.replace(regexAfterWord, '$1');
      }
      productStr = productStr.replace(/\s+/g, ' ').trim();
    }
    
    // Zusätzliche spezifische Entfernung für "marin" - mehrfach und aggressiv
    // Entferne "marin" nach "iPhone" und Zahlen (z.B. "iPhone 16 marin" -> "iPhone 16")
    productStr = productStr.replace(/iphone\s+(\d+)\s+marin/gi, 'iPhone $1');
    productStr = productStr.replace(/iphone\s+(\d+)\s+marin\b/gi, 'iPhone $1');
    // Entferne "marin" nach Zahlen (z.B. "16 marin" -> "16")
    productStr = productStr.replace(/(\d+)\s+marin\b/gi, '$1');
    productStr = productStr.replace(/(\d+)\s+marin(?=\s|$)/gi, '$1');
    // Entferne "marin" nach Wörtern (z.B. "iPhone marin" -> "iPhone")
    productStr = productStr.replace(/(\w+)\s+marin\b/gi, '$1');
    productStr = productStr.replace(/(\w+)\s+marin(?=\s|$)/gi, '$1');
    // Entferne "marin" am Ende
    productStr = productStr.replace(/\s+marin\s*$/gi, '');
    productStr = productStr.replace(/\s+marin\b/gi, '');
    // Entferne "marin" im Text
    productStr = productStr.replace(/\s+marin\s+/gi, ' ');
    // Mehrfaches Durchlaufen für "marin"
    for (let i = 0; i < 5; i++) {
      productStr = productStr.replace(/(\d+)\s+marin/gi, '$1');
      productStr = productStr.replace(/\s+marin\s*$/gi, '');
      productStr = productStr.replace(/\s+marin\b/gi, '');
      productStr = productStr.replace(/\s+marin\s+/gi, ' ');
    }
    
    // Zusätzliche spezifische Entfernung für "mittern" bei Watch-Produkten
    productStr = productStr.replace(/(watch\s+se\s+\d+)\s+mittern\b/gi, '$1');
    productStr = productStr.replace(/(watch\s+\d+)\s+mittern\b/gi, '$1');
    productStr = productStr.replace(/\s+mittern\s*$/gi, '');
    
    // Entferne "e" am Ende von Zahlen (z.B. "iPhone 16e" -> "iPhone 16")
    // Dies kann passieren, wenn "marin" teilweise entfernt wird
    productStr = productStr.replace(/(\d+)e\b/gi, '$1');
    productStr = productStr.replace(/(\d+)\s+e\b/gi, '$1');
    productStr = productStr.replace(/iphone\s+(\d+)e/gi, 'iPhone $1');
    
    // Finale Bereinigung
    productStr = productStr.replace(/\s+/g, ' ').trim();
    
    // Finale Entfernung aller Farben (noch einmal durchgehen) - verwende die Farbenliste direkt
    const colorsForFinalCleanup = [
      'ultramarin', 'marin', 'mitternacht', 'mittern', 'lavendel', 'nebelblau', 'blaugrün', 'blaugruen',
      'wüstensand', 'wuestensand', 'natur', 'natural', 'polarstern', 'lightgray', 'light gray',
      'olive', 'dunkelblau', 'iris', 'obsidian', 'porcelain', 'arcanine', 'ocean', 'trail',
      'alpine', 'awesome', 'graphite', 'graphit', 'titanium', 'titan', 'cosmic', 'tiefblau',
      'salbei', 'schwarz', 'black', 'weiß', 'weiss', 'white', 'rot', 'red', 'blau', 'blue',
      'grün', 'green', 'gelb', 'yellow', 'grau', 'grey', 'gray', 'silber', 'silver', 'gold',
      'golden', 'pink', 'rosa', 'lila', 'purple', 'violett', 'violet', 'orange', 'türkis',
      'turquoise', 'beige', 'braun', 'brown', 'mint', 'coral', 'midnight', 'starlight',
      'lavender', 'sunset', 'onyx black', 'onyx'
    ];
    
    for (let i = 0; i < 3; i++) {
      for (const color of colorsForFinalCleanup) {
        const escapedColor = color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Entferne Farbe nach Zahlen (z.B. "16 marin")
        productStr = productStr.replace(new RegExp(`(\\d+)\\s+${escapedColor}(?=\\s|$)`, 'gi'), '$1');
        // Entferne Farbe nach Wörtern (z.B. "iPhone marin")
        productStr = productStr.replace(new RegExp(`(\\w+)\\s+${escapedColor}(?=\\s|$)`, 'gi'), '$1');
        // Entferne Farbe am Ende
        productStr = productStr.replace(new RegExp(`\\s+${escapedColor}\\s*$`, 'gi'), '');
        // Entferne Farbe im Text
        productStr = productStr.replace(new RegExp(`\\s+${escapedColor}\\s+`, 'gi'), ' ');
      }
      productStr = productStr.replace(/\s+/g, ' ').trim();
    }
    
    // Entferne Varianten (Pro, Pro Max, Plus, Mini, etc.)
    const variants = [
      'pro max', 'pro plus', 'ultra max', 'note ultra',
      'pro', 'plus', 'mini', 'ultra', 'max', 'standard', 'regular',
      'lite', 'titan', 'titanium', 'fold', 'flip'
    ];
    
    const sortedVariants = [...variants].sort((a, b) => b.length - a.length);
    for (const variant of sortedVariants) {
      const regex = new RegExp(`\\s+${variant}\\s*`, 'i');
      productStr = productStr.replace(regex, ' ');
    }
    
    // Entferne zusätzliche Informationen wie "(NEU)", "5G", "Dual SIM", etc.
    productStr = productStr.replace(/\s*\([^)]*\)\s*/gi, ' '); // Entferne alles in Klammern
    productStr = productStr.replace(/\s*5G\s*/gi, ' '); // Entferne "5G"
    productStr = productStr.replace(/\s*Dual SIM\s*/gi, ' '); // Entferne "Dual SIM"
    productStr = productStr.replace(/\s*LTE\s*/gi, ' '); // Entferne "LTE"
    productStr = productStr.replace(/\s*\d+mm\s*/gi, ' '); // Entferne Größenangaben wie "44mm"
    productStr = productStr.replace(/\s*Alu\s*/gi, ' '); // Entferne "Alu"
    productStr = productStr.replace(/\s*Sport\s*/gi, ' '); // Entferne "Sport"
    productStr = productStr.replace(/\s*S\/M\s*/gi, ' '); // Entferne "S/M"
    productStr = productStr.replace(/\s*M4\s*/gi, ' '); // Entferne "M4"
    productStr = productStr.replace(/\s*CPE\s*/gi, ' '); // Entferne "CPE"
    productStr = productStr.replace(/\s*\d+S\s*/gi, ' '); // Entferne "5S"
    productStr = productStr.replace(/\s*Router\s*/gi, ' '); // Entferne "Router"
    productStr = productStr.replace(/\s*Smartwatch\s*/gi, ' '); // Entferne "Smartwatch"
    productStr = productStr.replace(/\s*Nano SIM\s*/gi, ' '); // Entferne "Nano SIM"
    productStr = productStr.replace(/\s*Nano Sim\s*/gi, ' '); // Entferne "Nano Sim"
    productStr = productStr.replace(/\s*Gen\s*/gi, ' '); // Entferne "Gen"
    productStr = productStr.replace(/\s*\.\s*/g, ' '); // Entferne Punkte
    productStr = productStr.replace(/\s*-\s*/g, ' '); // Entferne Bindestriche
    productStr = productStr.replace(/\s*\d{4}\s*/g, ' '); // Entferne 4-stellige Zahlen (wie "0050", "336", "381")
    productStr = productStr.replace(/\s*BL\s*/gi, ' '); // Entferne "BL"
    productStr = productStr.replace(/\s*ASUS\s*/gi, ' '); // Entferne "ASUS"
    productStr = productStr.replace(/\s*CM\d+\s*/gi, ' '); // Entferne "CM1402" etc.
    productStr = productStr.replace(/\s*\+.*$/gi, ' '); // Entferne alles nach "+" (wie "+ Redmi 13 C")
    productStr = productStr.replace(/\s*Edge\s*/gi, ' '); // Entferne "Edge"
    productStr = productStr.replace(/\s*FE\s*/gi, ' '); // Entferne "FE"
    productStr = productStr.replace(/\s*Brovi\s*/gi, ' '); // Entferne "Brovi"
    productStr = productStr.replace(/\s*H\d+-\d+\s*/gi, ' '); // Entferne "H153-381" etc.
    productStr = productStr.replace(/\s*B\d+-\d+\s*/gi, ' '); // Entferne "B636-336" etc.
    productStr = productStr.replace(/\s*X\d+\s*/gi, ' '); // Entferne "X6" etc.
    productStr = productStr.replace(/\s*Play\s*/gi, ' '); // Entferne "Play"
    productStr = productStr.replace(/\s*\d+\.\s*/gi, ' '); // Entferne "2." etc.
    
    // Entferne doppelte Leerzeichen und trimme
    productStr = productStr.replace(/\s+/g, ' ').trim();
    
    // Finale Entfernung von "e" am Ende von Zahlen (z.B. "iPhone 16e" -> "iPhone 16")
    // Dies kann passieren, wenn "marin" teilweise entfernt wird und "e" übrig bleibt
    productStr = productStr.replace(/(\d+)e\b/gi, '$1');
    productStr = productStr.replace(/(\d+)\s+e\b/gi, '$1');
    productStr = productStr.replace(/iphone\s+(\d+)e/gi, 'iPhone $1');
    productStr = productStr.replace(/\s+/g, ' ').trim();
    
    return productStr || null;
  }, [getProductFull]);

  // Funktion zum Extrahieren der Versionsnummer für Sortierung (neueste zuerst)
  const getVersionNumber = useCallback((versionName) => {
    if (!versionName) return -1;
    
    const versionStr = String(versionName).trim().toLowerCase();
    
    // iPhone SE sollte am Ende kommen (niedrigste Priorität)
    if (versionStr.includes('iphone se')) {
      return 0;
    }
    
    // iPhone: "iPhone 17" -> 17, "iPhone 11" -> 11
    const iPhoneMatch = versionStr.match(/iphone[\s\-_]?(\d+)/);
    if (iPhoneMatch) {
      return parseInt(iPhoneMatch[1], 10);
    }
    
    // Pixel: "Pixel 9" -> 9, "Pixel 8" -> 8
    const pixelMatch = versionStr.match(/pixel[\s\-_]?(\d+)/);
    if (pixelMatch) {
      return parseInt(pixelMatch[1], 10);
    }
    
    // Galaxy S: "Galaxy S24" -> 24, "Galaxy S23" -> 23
    const galaxySMatch = versionStr.match(/galaxy[\s\-_]?s[\s\-_]?(\d+)/);
    if (galaxySMatch) {
      return parseInt(galaxySMatch[1], 10);
    }
    
    // Galaxy Note: "Galaxy Note 20" -> 20
    const galaxyNoteMatch = versionStr.match(/galaxy[\s\-_]?note[\s\-_]?(\d+)/);
    if (galaxyNoteMatch) {
      return parseInt(galaxyNoteMatch[1], 10);
    }
    
    // Allgemeine Suche nach Zahl nach Produktnamen
    const generalMatch = versionStr.match(/(?:iphone|pixel|galaxy|xiaomi|oneplus|oppo|vivo|realme|huawei|honor|motorola|nokia)[\s\-_]?(\d+)/);
    if (generalMatch) {
      return parseInt(generalMatch[1], 10);
    }
    
    // Fallback: Suche nach erster Zahl im String
    const numberMatch = versionStr.match(/(\d+)/);
    if (numberMatch) {
      return parseInt(numberMatch[1], 10);
    }
    
    // Wenn keine Zahl gefunden, sortiere alphabetisch am Ende
    return -1;
  }, []);

  // Funktion zum Zählen der IMEIs pro Hersteller, Version, Variante und GB
  const getZustandData = useCallback(() => {
    // Struktur: { manufacturer: { version: { variant: { gb: count } } } }
    const manufacturerData = {};
    let totalCount = 0;
    
    // Zähle nur nicht-reservierte IMEIs (wie in der Tabelle)
    imeis.forEach(item => {
      // Filtere reservierte IMEIs aus (wie in der Tabelle)
      const rowId = `${item.sheet || 'default'}-${item.imei}-${item.row}`;
      const action = rowActions[rowId]?.action;
      if (action === 'reservieren') {
        return; // Überspringe reservierte IMEIs
      }
      
      totalCount++;
      
      const manufacturer = getManufacturer(item);
      const productFull = getProductFull(item);
      let productName = getProductToVersion(item);
      
      // Finale Normalisierung: Entferne "e" am Ende von Zahlen (z.B. "iPhone 16e" -> "iPhone 16")
      // Dies stellt sicher, dass "iPhone 16e" und "iPhone 16" zusammengefasst werden
      if (productName) {
        // Entferne "ultramarin" falls noch vorhanden
        productName = productName.replace(/\s*ultramarin\s*/gi, ' ');
        productName = productName.replace(/ultramarin/gi, '');
        // Entferne "e" am Ende von Zahlen
        productName = productName.replace(/(\d+)e\b/gi, '$1');
        productName = productName.replace(/(\d+)\s+e\b/gi, '$1');
        productName = productName.replace(/iphone\s+(\d+)e/gi, 'iPhone $1');
        // Normalisiere Leerzeichen und trimme
        productName = productName.replace(/\s+/g, ' ').trim();
        // Normalisiere Groß-/Kleinschreibung für iPhone (iPhone statt iphone)
        productName = productName.replace(/^iphone\s+/i, 'iPhone ');
      }
      
      // Extrahiere Variante und GB aus dem vollständigen Produktnamen
      const variant = extractProductVariant(productFull) || '';
      const gb = extractGB(productFull) || '';
      
      const manufacturerKey = manufacturer && manufacturer.trim() !== '' 
        ? manufacturer.trim() 
        : 'Unbekannt';
      
      const versionKey = (productName || 'Unbekannt').trim();
      const variantKey = variant || 'Standard';
      const gbKey = gb || 'Unbekannt';
      
      // Initialisiere verschachtelte Struktur
      if (!manufacturerData[manufacturerKey]) {
        manufacturerData[manufacturerKey] = {};
      }
      if (!manufacturerData[manufacturerKey][versionKey]) {
        manufacturerData[manufacturerKey][versionKey] = {};
      }
      if (!manufacturerData[manufacturerKey][versionKey][variantKey]) {
        manufacturerData[manufacturerKey][versionKey][variantKey] = {};
      }
      
      // Zähle nach GB
      if (manufacturerData[manufacturerKey][versionKey][variantKey][gbKey]) {
        manufacturerData[manufacturerKey][versionKey][variantKey][gbKey]++;
      } else {
        manufacturerData[manufacturerKey][versionKey][variantKey][gbKey] = 1;
      }
    });

    // Konvertiere zu Array-Struktur und sortiere
    const sortedData = Object.entries(manufacturerData)
      .map(([manufacturer, versions]) => {
        // Sortiere Versionen mit speziellen Prioritäten je nach Hersteller
        const sortedVersions = Object.entries(versions)
          .map(([version, variants]) => {
            // Verarbeite Varianten und GBs für jede Version
            const variantEntries = Object.entries(variants).map(([variant, gbs]) => {
              const gbEntries = Object.entries(gbs).map(([gb, count]) => ({
                gb,
                count
              }));
              // Sortiere GBs nach Größe (numerisch)
              gbEntries.sort((a, b) => {
                const numA = parseInt(a.gb.match(/\d+/)?.[0] || '0', 10);
                const numB = parseInt(b.gb.match(/\d+/)?.[0] || '0', 10);
                return numB - numA; // Größte zuerst
              });
              return {
                variant,
                gbs: gbEntries
              };
            });
            // Sortiere Varianten: Standard zuerst, dann alphabetisch
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
            const versionA = a.version.toLowerCase();
            const versionB = b.version.toLowerCase();
            
            // Apple: iPhone vor iPad
            if (manufacturer.toLowerCase() === 'apple') {
              const aIsIPhone = versionA.includes('iphone');
              const bIsIPhone = versionB.includes('iphone');
              const aIsIPad = versionA.includes('ipad');
              const bIsIPad = versionB.includes('ipad');
              
              if (aIsIPhone && !bIsIPhone) return -1;
              if (!aIsIPhone && bIsIPhone) return 1;
              if (aIsIPad && !bIsIPad) return 1;
              if (!aIsIPad && bIsIPad) return -1;
              
              // Wenn beide iPhone oder beide iPad, sortiere nach Versionsnummer
              if (aIsIPhone && bIsIPhone) {
                const numA = getVersionNumber(a.version);
                const numB = getVersionNumber(b.version);
                if (numA >= 0 && numB >= 0) {
                  return numB - numA; // Neueste zuerst
                }
              }
              if (aIsIPad && bIsIPad) {
                const numA = getVersionNumber(a.version);
                const numB = getVersionNumber(b.version);
                if (numA >= 0 && numB >= 0) {
                  return numB - numA; // Neueste zuerst
                }
              }
            }
            
            // Samsung: Galaxy S vor Galaxy A
            if (manufacturer.toLowerCase() === 'samsung') {
              const aIsGalaxyS = versionA.includes('galaxy s') || versionA.match(/galaxy\s+s\d+/i);
              const bIsGalaxyS = versionB.includes('galaxy s') || versionB.match(/galaxy\s+s\d+/i);
              const aIsGalaxyA = versionA.includes('galaxy a') || versionA.match(/galaxy\s+a\d+/i);
              const bIsGalaxyA = versionB.includes('galaxy a') || versionB.match(/galaxy\s+a\d+/i);
              
              if (aIsGalaxyS && !bIsGalaxyS) return -1;
              if (!aIsGalaxyS && bIsGalaxyS) return 1;
              if (aIsGalaxyA && !bIsGalaxyA) return 1;
              if (!aIsGalaxyA && bIsGalaxyA) return -1;
              
              // Wenn beide Galaxy S oder beide Galaxy A, sortiere nach Versionsnummer
              if (aIsGalaxyS && bIsGalaxyS) {
                const numA = getVersionNumber(a.version);
                const numB = getVersionNumber(b.version);
                if (numA >= 0 && numB >= 0) {
                  return numB - numA; // Neueste zuerst
                }
              }
              if (aIsGalaxyA && bIsGalaxyA) {
                const numA = getVersionNumber(a.version);
                const numB = getVersionNumber(b.version);
                if (numA >= 0 && numB >= 0) {
                  return numB - numA; // Neueste zuerst
                }
              }
            }
            
            // Standard-Sortierung für andere Hersteller
            const numA = getVersionNumber(a.version);
            const numB = getVersionNumber(b.version);
            
            // Wenn beide Versionen haben, sortiere numerisch absteigend
            if (numA >= 0 && numB >= 0) {
              return numB - numA; // Neueste zuerst
            }
            
            // Wenn nur eine Version hat, kommt die mit Version zuerst
            if (numA >= 0) return -1;
            if (numB >= 0) return 1;
            
            // Wenn keine Version gefunden, sortiere alphabetisch
            return a.version.localeCompare(b.version);
          });
        
        // Berechne Gesamtzahl für diesen Hersteller
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
        // Sortiere Hersteller nach Gesamtzahl (absteigend) und dann alphabetisch
        if (b.total !== a.total) {
          return b.total - a.total;
        }
        return a.manufacturer.localeCompare(b.manufacturer);
      });

    return { manufacturers: sortedData, total: totalCount };
  }, [imeis, getManufacturer, getProductToVersion, getVersionNumber, rowActions]);

  // Hilfsfunktion: Erweitere Auswahl um Bereich zwischen zwei Zellen
  const expandSelection = (startCellId, endCellId) => {
    const selected = new Set();
    
    // Finde Start- und End-Positionen in currentImeis
    let startRow = -1, startCol = -1, endRow = -1, endCol = -1;
    
    currentImeis.forEach((item, rowIdx) => {
      const rowId = `${item.sheet || 'default'}-${item.imei}-${item.row}`;
      
      // Prüfe IMEI-Spalte
      const imeiCellId = `${rowId}-imei`;
      if (imeiCellId === startCellId) {
        startRow = rowIdx;
        startCol = 0; // 0 für IMEI-Spalte
      }
      if (imeiCellId === endCellId) {
        endRow = rowIdx;
        endCol = 0;
      }
      
      // Prüfe Hersteller-Spalte
      const manufacturerKey = Object.keys(item.rowData || {}).find(key => {
        const lowerKey = key.toLowerCase();
        return lowerKey.includes('hersteller') || 
               lowerKey.includes('manufacturer') || 
               lowerKey.includes('marke') ||
               lowerKey.includes('brand');
      });
      
      if (manufacturerKey) {
        const manufacturerCellId = `${rowId}-${manufacturerKey}`;
        if (manufacturerCellId === startCellId) {
          startRow = rowIdx;
          startCol = 1; // 1 für Hersteller-Spalte
        }
        if (manufacturerCellId === endCellId) {
          endRow = rowIdx;
          endCol = 1;
        }
      }
    });
    
    if (startRow === -1 || endRow === -1) {
      // Fallback: Wenn nicht gefunden, füge nur die End-Zelle hinzu
      selected.add(endCellId);
      return selected;
    }
    
    // Markiere Bereich
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    
    for (let r = minRow; r <= maxRow; r++) {
      const item = currentImeis[r];
      if (!item) continue;
      
      const rowId = `${item.sheet || 'default'}-${item.imei}-${item.row}`;
      const manufacturerKey = Object.keys(item.rowData || {}).find(key => {
        const lowerKey = key.toLowerCase();
        return lowerKey.includes('hersteller') || 
               lowerKey.includes('manufacturer') || 
               lowerKey.includes('marke') ||
               lowerKey.includes('brand');
      });
      
      // Markiere IMEI (Spalte 0)
      if (minCol <= 0 && maxCol >= 0) {
        selected.add(`${rowId}-imei`);
      }
      
      // Markiere Hersteller (Spalte 1)
      if (minCol <= 1 && maxCol >= 1 && manufacturerKey) {
        selected.add(`${rowId}-${manufacturerKey}`);
      }
    }
    
    return selected;
  };

  const handleCellClick = (item, columnIndex, columnName, event) => {
    const cellId = `${item.sheet || 'default'}-${item.imei}-${item.row}-${columnName || columnIndex}`;
    const rowId = `${item.sheet || 'default'}-${item.imei}-${item.row}`;
    const imeiCellId = `${rowId}-imei`;
    
    // Wenn IMEI oder Aktion geklickt wird, markiere beide zusammen
    if (columnName === 'imei' || columnName === 'aktion') {
      // Shift+Klick für Bereichsauswahl (wie Excel)
      if (event.shiftKey && selectionStart) {
        const newSelected = expandSelection(selectionStart, cellId);
        // Füge auch die andere Zelle hinzu wenn eine der beiden markiert ist
        if (newSelected.has(imeiCellId) || newSelected.has(`${rowId}-aktion`)) {
          newSelected.add(imeiCellId);
          newSelected.add(`${rowId}-aktion`);
        }
        setSelectedCells(newSelected);
        setShowColorPicker(false);
        setSelectedCell(null);
        return;
      }
      
      // Normaler Klick: Markiere IMEI und Aktion zusammen
      if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
        const newSelected = new Set([imeiCellId, `${rowId}-aktion`]);
        setSelectionStart(imeiCellId);
        setSelectedCells(newSelected);
        setShowColorPicker(false);
        setSelectedCell(null);
        return;
      }
    }
    
    // Für andere Zellen: Normales Verhalten
    // Shift+Klick für Bereichsauswahl (wie Excel)
    if (event.shiftKey && selectionStart) {
      const newSelected = expandSelection(selectionStart, cellId);
      setSelectedCells(newSelected);
      setShowColorPicker(false);
      setSelectedCell(null);
      return;
    }
    
    // Normaler Klick: Setze Start-Zelle und markiere einzelne Zelle
    if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
      setSelectionStart(cellId);
      setSelectedCells(new Set([cellId]));
      setShowColorPicker(false);
      setSelectedCell(null);
    }
  };

  const handleCellContextMenu = (item, columnIndex, columnName, event) => {
    // Verhindere Standard-Kontextmenü
    event.preventDefault();
    const cellId = `${item.sheet || 'default'}-${item.imei}-${item.row}-${columnName || columnIndex}`;
    setSelectedCell(cellId);
    setShowColorPicker(true);
  };

  const handleCellMouseDown = (item, columnIndex, columnName, event) => {
    const cellId = `${item.sheet || 'default'}-${item.imei}-${item.row}-${columnName || columnIndex}`;
    
    // Starte Drag-Auswahl
    if (event.button === 0) { // Linke Maustaste
      setIsSelecting(true);
      setSelectionStart(cellId);
      setSelectedCells(new Set([cellId]));
      setShowColorPicker(false);
      setSelectedCell(null);
    }
  };

  const handleCellMouseEnter = (item, columnIndex, columnName, event) => {
    // Während Drag: Erweitere Auswahl
    if (isSelecting && selectionStart) {
      const cellId = `${item.sheet || 'default'}-${item.imei}-${item.row}-${columnName || columnIndex}`;
      const newSelected = expandSelection(selectionStart, cellId);
      setSelectedCells(newSelected);
    }
  };

  const handleCellMouseUp = () => {
    setIsSelecting(false);
  };

  // Globaler Mouse-Up Handler für Drag-Auswahl
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsSelecting(false);
    };

    if (isSelecting) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isSelecting]);

  const handleColorSelect = (color) => {
    if (selectedCell) {
      const newColors = { ...cellTextColors, [selectedCell]: color };
      setCellTextColors(newColors);
      localStorage.setItem('imeis-cell-text-colors', JSON.stringify(newColors));
      setShowColorPicker(false);
      setSelectedCell(null);
    }
  };

  // Setze Farbe für alle markierten Zellen
  const handleSetColorForSelected = (color) => {
    if (selectedCells.size === 0) {
      return;
    }

    const newColors = { ...cellTextColors };
    selectedCells.forEach(cellId => {
      if (color) {
        newColors[cellId] = color;
      } else {
        // Entferne Farbe wenn color leer ist
        delete newColors[cellId];
      }
    });
    
    setCellTextColors(newColors);
    localStorage.setItem('imeis-cell-text-colors', JSON.stringify(newColors));
  };

  const getCellTextColor = (item, columnName) => {
    const cellId = `${item.sheet || 'default'}-${item.imei}-${item.row}-${columnName}`;
    // Prüfe zuerst manuell gesetzte Farben
    if (cellTextColors[cellId]) {
      return cellTextColors[cellId];
    }
    // Dann prüfe Excel-Formatierungen
    if (item.rowDataFormats && item.rowDataFormats[columnName] && item.rowDataFormats[columnName].textColor) {
      return item.rowDataFormats[columnName].textColor;
    }
    return '';
  };


  const predefinedColors = [
    { name: 'Rot', color: '#F44336' },
    { name: 'Blau', color: '#2196F3' },
    { name: 'Grün', color: '#4CAF50' }
  ];

  const handleExport = () => {
    // Erstelle CSV nur mit IMEI und Hersteller
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
            onShowZustand={async () => {
              setShowZustandModal(true);
              setZustandLoading(true);
              setZustandDataCache(null);
              const calculateData = () => {
                return new Promise((resolve) => {
                  if (window.requestIdleCallback) {
                    requestIdleCallback(() => {
                      try {
                        resolve(getZustandData());
                      } catch (error) {
                        console.error('Fehler beim Berechnen der Zustandsdaten:', error);
                        resolve({ manufacturers: [], total: 0 });
                      }
                    }, { timeout: 100 });
                  } else {
                    setTimeout(() => {
                      try {
                        resolve(getZustandData());
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
            }}
          />

          {false && availableSheets.length > 0 && (
            <div className="imeis-sheet-tabs" style={{ display: 'none' }}>
              {availableSheets.map((sheet, index) => (
                <button
                  key={sheet}
                  onClick={() => setActiveSheet(sheet)}
                  className={`imeis-sheet-tab ${activeSheet === sheet ? 'imeis-sheet-tab--active' : ''}`}
                >
                  {sheet}
                </button>
              ))}
            </div>
          )}

          <ImeisFilters
            availableManufacturers={availableManufacturers}
            activeManufacturer={activeManufacturer}
            onManufacturerChange={(m) => {
              setActiveManufacturer(m);
              setActiveProduct(null);
              setActiveVersion(null);
              setActiveVariant(null);
              setActiveGB(null);
              setActiveColor(null);
            }}
            availableVersions={availableVersions}
            activeVersion={activeVersion}
            onVersionChange={(v) => {
              setActiveVersion(v);
              setActiveVariant(null);
              setActiveGB(null);
              setActiveColor(null);
            }}
            availableVariants={availableVariants}
            activeVariant={activeVariant}
            onVariantChange={(v) => {
              setActiveVariant(v);
              setActiveGB(null);
              setActiveColor(null);
            }}
            availableGBs={availableGBs}
            activeGB={activeGB}
            onGBChange={(g) => {
              setActiveGB(g);
              setActiveColor(null);
            }}
            availableProducts={availableProducts}
            activeProduct={activeProduct}
            onProductChange={setActiveProduct}
          />

          <div className="imeis-stats">
            <p>
              {activeManufacturer ? (
                <>
                  Hersteller: <strong>{activeManufacturer}</strong>
                  {activeVersion ? (
                    <>
                      {activeVersion && (
                        <> | Version: <strong>{(() => {
                          const manufacturerLower = activeManufacturer.toLowerCase();
                          let versionName = '';
                          if (manufacturerLower.includes('apple')) {
                            // Spezialfall: iPhone SE
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
                          
                          // Füge Variante hinzu, wenn vorhanden
                          if (activeVariant !== null && activeVariant !== '') {
                            versionName += ` ${activeVariant}`;
                          }
                          
                          return versionName;
                        })()}</strong></>
                      )}
                      {activeGB && (
                        <> | GB: <strong>{activeGB}</strong></>
                      )}
                    </>
                  ) : (
                    <>
                      {activeProduct && (
                        <> | Produkt: <strong>{activeProduct}</strong></>
                      )}
                    </>
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
                    const imeiCellId = `${rowId}-imei`;
                    const manufacturer = getManufacturer(item);
                    
                    // Finde den tatsächlichen Hersteller-Schlüssel
                    const keysToCheck = item.columnOrder && Array.isArray(item.columnOrder) && item.columnOrder.length > 0
                      ? item.columnOrder
                      : Object.keys(item.rowData || {});
                    
                    let manufacturerKey = keysToCheck.find(key => {
                      if (!key) return false;
                      const lowerKey = String(key).toLowerCase().trim();
                      // Suche nach Hersteller-Begriffen, aber NICHT nach "Marke"
                      return (lowerKey.includes('hersteller') || 
                             lowerKey.includes('manufacturer') || 
                             lowerKey.includes('make') ||
                             (lowerKey.includes('brand') && !lowerKey.includes('marke'))) &&
                             !lowerKey.includes('marke'); // Explizit "Marke" ausschließen
                    });
                    
                    // Fallback: Wenn keine passende Spalte gefunden, nimm die zweite Spalte nach IMEI
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
                    
                    const manufacturerCellId = manufacturerKey ? `${rowId}-${manufacturerKey}` : null;
                    const aktionCellId = `${rowId}-aktion`;
                    // Prüfe ob die IMEI-Zelle oder Aktion-Zelle markiert ist
                    const isImeiSelected = selectedCells.has(imeiCellId);
                    const isAktionSelected = selectedCells.has(aktionCellId);
                    // Zeile ist markiert wenn IMEI oder Aktion markiert ist
                    const isRowSelected = isImeiSelected || isAktionSelected;
                    const isThisRowDropdown = selectedRowForDropdown && selectedRowForDropdown.rowId === rowId;
                    
                    return (
                      <tr 
                        key={`${item.sheet || 'sheet'}-${item.imei}-${item.row}-${globalIndex}`}
                        className={isRowSelected ? 'imeis-row-selected' : ''}
                      >
                        <td
                          className={`imeis-cell ${selectedCells.has(imeiCellId) ? 'imeis-cell-selected' : ''}`}
                          onClick={(e) => handleCellClick(item, -1, 'imei', e)}
                          onContextMenu={(e) => handleCellContextMenu(item, -1, 'imei', e)}
                          onMouseDown={(e) => handleCellMouseDown(item, -1, 'imei', e)}
                          onMouseEnter={(e) => handleCellMouseEnter(item, -1, 'imei', e)}
                          onMouseUp={handleCellMouseUp}
                          style={{
                            color: getCellTextColor(item, 'imei') || 'inherit',
                            cursor: 'pointer',
                            position: 'relative',
                            userSelect: 'none',
                            width: '25%'
                          }}
                        >
                          {maskImei(item.imei)}
                          {selectedCell === imeiCellId && showColorPicker && (
                            <div className="imeis-color-picker" onClick={(e) => e.stopPropagation()}>
                              <div className="imeis-color-picker-header">
                                Textfarbe wählen
                              </div>
                              <div className="imeis-color-picker-grid">
                                {predefinedColors.map((colorOption, colorIdx) => (
                                  <div key={colorIdx} className="imeis-color-item">
                                    <button
                                      className="imeis-color-option"
                                      style={{ backgroundColor: colorOption.color }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleColorSelect(colorOption.color);
                                      }}
                                      title={colorOption.name}
                                    />
                                    <span className="imeis-color-label">{colorOption.name}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="imeis-color-picker-actions">
                                <button
                                  className="btn btn--secondary btn--small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleColorSelect('');
                                  }}
                                >
                                  Farbe entfernen
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                        {/* Checkbox nur für markierte IMEI-Zeilen */}
                        {isImeiSelected ? (
                          <td 
                            className={`imeis-row-dropdown-cell imeis-cell ${selectedCells.has(`${rowId}-aktion`) ? 'imeis-cell-selected' : ''}`}
                            style={{ position: 'relative', padding: '0.5rem', width: '20%', cursor: 'pointer' }}
                            onClick={(e) => handleCellClick(item, -1, 'aktion', e)}
                            onMouseDown={(e) => handleCellMouseDown(item, -1, 'aktion', e)}
                            onMouseEnter={(e) => handleCellMouseEnter(item, -1, 'aktion', e)}
                            onMouseUp={handleCellMouseUp}
                          >
                            <div className="imeis-row-dropdown-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <input
                                type="checkbox"
                                id={`reservieren-checkbox-${rowId}`}
                                checked={rowActions[rowId]?.action === 'reservieren' || false}
                                onChange={async (e) => {
                                  e.stopPropagation();
                                  const isChecked = e.target.checked;
                                  console.log('Checkbox onChange:', isChecked, 'für Zeile:', item.imei);
                                  if (isChecked) {
                                    // Setze die Aktion "reservieren"
                                    await handleDropdownSelect(item, 'reservieren');
                                  } else {
                                    // Entferne die Aktion
                                    const rowId = `${item.sheet || 'default'}-${item.imei}-${item.row}`;
                                    const updatedActions = { ...rowActions };
                                    delete updatedActions[rowId];
                                    setRowActions(updatedActions);
                                    localStorage.setItem('imeis-row-actions', JSON.stringify(updatedActions));
                                  }
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                }}
                                style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                              />
                              <label 
                                htmlFor={`reservieren-checkbox-${rowId}`}
                                style={{ cursor: 'pointer', fontSize: '0.9rem', margin: 0, userSelect: 'none' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                Reservieren
                              </label>
                              {rowActions[rowId] && (
                                <div style={{ fontSize: '0.75rem', color: '#666', marginLeft: '0.5rem' }}>
                                  ({rowActions[rowId].userName})
                                </div>
                              )}
                            </div>
                          </td>
                        ) : (
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
                        )}
                        <td
                          className={`imeis-cell ${manufacturerCellId && selectedCells.has(manufacturerCellId) ? 'imeis-cell-selected' : ''}`}
                          onClick={(e) => manufacturerKey && handleCellClick(item, allColumns.indexOf(manufacturerKey), manufacturerKey, e)}
                          onContextMenu={(e) => manufacturerKey && handleCellContextMenu(item, allColumns.indexOf(manufacturerKey), manufacturerKey, e)}
                          onMouseDown={(e) => manufacturerKey && handleCellMouseDown(item, allColumns.indexOf(manufacturerKey), manufacturerKey, e)}
                          onMouseEnter={(e) => manufacturerKey && handleCellMouseEnter(item, allColumns.indexOf(manufacturerKey), manufacturerKey, e)}
                          onMouseUp={handleCellMouseUp}
                          style={{
                            color: manufacturerKey ? (getCellTextColor(item, manufacturerKey) || 'inherit') : 'inherit',
                            cursor: manufacturerKey ? 'pointer' : 'default',
                            position: 'relative',
                            userSelect: 'none',
                            width: '20%'
                          }}
                        >
                          {manufacturer || '-'}
                          {manufacturerKey && selectedCell === manufacturerCellId && showColorPicker && (
                            <div className="imeis-color-picker" onClick={(e) => e.stopPropagation()}>
                              <div className="imeis-color-picker-header">
                                Textfarbe wählen
                              </div>
                              <div className="imeis-color-picker-grid">
                                {predefinedColors.map((colorOption, colorIdx) => (
                                  <div key={colorIdx} className="imeis-color-item">
                                    <button
                                      className="imeis-color-option"
                                      style={{ backgroundColor: colorOption.color }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleColorSelect(colorOption.color);
                                      }}
                                      title={colorOption.name}
                                    />
                                    <span className="imeis-color-label">{colorOption.name}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="imeis-color-picker-actions">
                                <button
                                  className="btn btn--secondary btn--small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleColorSelect('');
                                  }}
                                >
                                  Farbe entfernen
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                        <td
                          style={{
                            padding: '0.5rem',
                            width: '35%',
                            fontSize: '0.85rem',
                            wordBreak: 'break-word'
                          }}
                        >
                          {(() => {
                            const productFull = getProductFull(item);
                            if (productFull) {
                              return <span>{productFull}</span>;
                            }
                            
                            // Fallback: Wenn keine "Produkt"-Spalte gefunden wird, zeige alle anderen Werte
                            if (item.rowData) {
                              const productValues = [];
                              Object.entries(item.rowData).forEach(([key, value]) => {
                                if (!key) return;
                                const lowerKey = String(key).toLowerCase().trim();
                                
                                // Überspringe IMEI, da es bereits in der ersten Spalte angezeigt wird
                                if (lowerKey.includes('imei')) {
                                  return;
                                }
                                // Überspringe Hersteller, da es bereits in der Hersteller-Spalte angezeigt wird
                                if (manufacturerKey && key === manufacturerKey) {
                                  return;
                                }
                                // Überspringe "Produkt"-Spalten
                                if (lowerKey === 'produkt' || lowerKey === 'product' || 
                                    lowerKey.includes('produkt') || lowerKey.includes('product')) {
                                  return;
                                }
                                // Füge nur Werte hinzu, die nicht leer sind
                                if (value !== undefined && value !== null && String(value).trim()) {
                                  productValues.push(String(value).trim());
                                }
                              });
                              return productValues.length > 0 ? (
                                <span>{productValues.join(' ')}</span>
                              ) : (
                                <span style={{ color: '#999' }}>-</span>
                              );
                            }
                            
                            return <span style={{ color: '#999' }}>-</span>;
                          })()}
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
        onUndo={handleHistoryModalUndo}
      />

      <ImeisZustandModal
        isOpen={showZustandModal}
        onClose={() => {
          setShowZustandModal(false);
          setZustandDataCache(null);
          setZustandLoading(false);
        }}
        zustandData={zustandDataCache || { manufacturers: [], total: 0 }}
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

