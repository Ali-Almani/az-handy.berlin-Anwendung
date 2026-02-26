import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getUserProfile } from '../../services/user.service';
import { isAdmin } from '../../utils/roles';
import TextEditor from '../../components/TextEditor/TextEditor';
import { saveImeis } from '../../utils/storage';
import { uploadExcelFile } from '../../services/api.js';
import './Dashboard.scss';

const Dashboard = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadedImeis, setUploadedImeis] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getUserProfile();
        setUser(response.data.user);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [setUser]);

  const handleSave = (content) => {
    // Hier könnte man den Inhalt an den Server senden
    console.log('Content saved:', content);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Prüfe ob es eine Excel-Datei ist
      const validExtensions = ['.xlsx', '.xls', '.csv'];
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      
      if (validExtensions.includes(fileExtension)) {
        setSelectedFile(file);
        setUploadStatus(null);
      } else {
        setUploadStatus({ type: 'error', message: 'Bitte wählen Sie eine Excel-Datei (.xlsx, .xls oder .csv)' });
        setSelectedFile(null);
      }
    }
  };

  // Funktion um xlsx-Modulnamen zur Laufzeit zu erhalten (umgeht Vite-Analyse)
  const getXlsxModuleName = () => {
    return 'xlsx';
  };

  // Einfacher CSV-Parser ohne externe Bibliothek
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    const result = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Einfacher CSV-Parser (behandelt einfache Fälle)
      const values = [];
      let currentValue = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim());
      
      result.push(values);
    }
    
    return result;
  };

  const readExcelFile = async (file) => {
    return new Promise(async (resolve, reject) => {
      try {
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        const reader = new FileReader();
        
        // CSV-Dateien manuell parsen
        if (fileExtension === '.csv') {
          reader.onload = (e) => {
            try {
              const text = e.target.result;
              const jsonData = parseCSV(text);
              
              const headers = jsonData[0] || [];
              const imeis = [];
              
              // Suche nach IMEI-Spalte (case-insensitive)
              const imeiColumnIndex = headers.findIndex(
                header => header && header.toString().toLowerCase().includes('imei')
              );
              
              // Lese alle Zeilen (überspringe Header-Zeile)
              for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                
                // Überspringe komplett leere Zeilen
                if (!row || row.length === 0 || row.every(cell => !cell || cell.toString().trim() === '')) {
                  continue;
                }
                
                // Erstelle ein Objekt mit allen Spalten (OHNE trim, um Abstände zu erhalten)
                const rowData = {};
                headers.forEach((header, index) => {
                  const headerName = header ? header.toString().trim() : `Spalte${index + 1}`;
                  const cellValue = row[index] !== undefined && row[index] !== null ? row[index].toString() : '';
                  rowData[headerName] = cellValue; // Kein trim() - behalte Abstände
                });
                
                // Bestimme IMEI-Wert (mit trim für Vergleich, aber speichere Original)
                let imeiValue = '';
                if (imeiColumnIndex !== -1 && row[imeiColumnIndex]) {
                  imeiValue = row[imeiColumnIndex].toString().trim();
                } else if (row[0]) {
                  // Falls keine IMEI-Spalte gefunden, nehme die erste Spalte
                  imeiValue = row[0].toString().trim();
                }
                
                // Nur hinzufügen wenn IMEI-Wert vorhanden
                if (imeiValue) {
                  imeis.push({
                    imei: imeiValue,
                    row: i + 1,
                    data: row, // Vollständige Zeile als Array (ohne trim)
                    rowData: rowData // Alle Spalten als Objekt mit Header-Namen (ohne trim)
                  });
                }
              }
              
              resolve(imeis);
            } catch (error) {
              reject(error);
            }
          };
          reader.readAsText(file, 'UTF-8');
        } else {
          // Excel-Dateien (.xlsx, .xls) - verwende Standard xlsx als Fallback
          reader.onload = async (e) => {
            try {
              // Verwende xlsx über CDN (geladen über Script-Tag im HTML)
              let XLSX;
              
              // Prüfe ob xlsx über window verfügbar ist (CDN)
              if (typeof window !== 'undefined' && window.XLSX) {
                XLSX = window.XLSX;
              } else {
                try {
                  const moduleName = getXlsxModuleName();
                  const xlsxModule = await import(/* @vite-ignore */ moduleName);
                  XLSX = xlsxModule.default || xlsxModule;
                } catch (importError) {
                  console.error('xlsx import error:', importError);
                  reject(new Error(`Excel-Unterstützung nicht verfügbar. Bitte laden Sie die Seite neu oder stellen Sie sicher, dass xlsx verfügbar ist. Alternativ können Sie die Datei als CSV exportieren.`));
                  return;
                }
              }
              
              // Prüfe ob XLSX die benötigten Funktionen hat
              if (!XLSX || !XLSX.read || !XLSX.utils) {
                reject(new Error('xlsx-Modul wurde geladen, aber die benötigten Funktionen sind nicht verfügbar. Bitte laden Sie die Seite neu.'));
                return;
              }
              
              const data = new Uint8Array(e.target.result);
              const workbook = XLSX.read(data, { 
                type: 'array',
                cellStyles: true,
                cellNF: false,
                cellHTML: false,
                raw: false,
                dense: false
              });
              
              const imeis = [];
              
              // Lese alle Sheets/Tabs aus der Excel-Datei
              workbook.SheetNames.forEach((sheetName, sheetIndex) => {
                const worksheet = workbook.Sheets[sheetName];
                const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
                let maxCol = range.e.c;
                const headers = [];
                
                // Lese alle Header-Spalten
                for (let c = 0; c <= maxCol; c++) {
                  const cellAddress = XLSX.utils.encode_cell({ r: 0, c: c });
                  const cell = worksheet[cellAddress];
                  let headerValue = '';
                  if (cell) {
                    if (cell.w !== undefined) {
                      headerValue = cell.w.toString();
                    } else if (cell.v !== undefined) {
                      headerValue = cell.v.toString();
                    }
                  }
                  const headerName = headerValue.trim() || `Spalte${c + 1}`;
                  headers.push(headerName);
                }
                
                const imeiColumnIndex = headers.findIndex(
                  header => header && header.toString().toLowerCase().includes('imei')
                );
                
                // Lese alle Datenzeilen
                for (let r = 1; r <= range.e.r; r++) {
                  const rowData = {};
                  const rowArray = [];
                  
                  for (let c = 0; c <= maxCol; c++) {
                    const cellAddress = XLSX.utils.encode_cell({ r: r, c: c });
                    const cell = worksheet[cellAddress];
                    let cellValue = '';
                    if (cell) {
                      if (cell.w !== undefined && cell.w !== null) {
                        cellValue = cell.w.toString();
                      } else if (cell.v !== undefined && cell.v !== null) {
                        cellValue = cell.v.toString();
                      }
                    }
                    const headerName = headers[c];
                    rowData[headerName] = cellValue;
                    rowArray.push(cellValue);
                  }
                  
                  const isEmptyRow = rowArray.every(val => !val || val.toString().trim() === '');
                  if (isEmptyRow) {
                    continue;
                  }
                  
                  let imeiValue = '';
                  if (imeiColumnIndex !== -1 && rowArray[imeiColumnIndex]) {
                    imeiValue = rowArray[imeiColumnIndex].toString().trim();
                  } else if (rowArray[0]) {
                    imeiValue = rowArray[0].toString().trim();
                  }
                  
                  if (imeiValue) {
                    imeis.push({
                      imei: imeiValue,
                      row: r + 1,
                      sheet: sheetName,
                      sheetIndex: sheetIndex,
                      data: rowArray,
                      rowData: rowData,
                      rowDataFormats: {},
                      columnOrder: headers
                    });
                  }
                }
              });
              
              resolve(imeis);
            } catch (error) {
              reject(error);
            }
          };
          reader.readAsArrayBuffer(file);
        }
        
        reader.onerror = (error) => reject(error);
      } catch (error) {
        reject(error);
      }
    });
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setUploadStatus({ type: 'error', message: 'Bitte wählen Sie zuerst eine Datei aus' });
      return;
    }

    setIsProcessing(true);
    setUploadedImeis([]);

    try {
      // Prüfe ob Mock-API-Modus aktiviert ist
      const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true' || 
                           import.meta.env.VITE_API_URL === 'mock' ||
                           !import.meta.env.VITE_API_URL;

      let imeis = [];

      if (USE_MOCK_API) {
        // Mock-Modus: Verwende lokale Verarbeitung
        setUploadStatus({ type: 'info', message: 'Datei wird lokal verarbeitet...' });
        imeis = await readExcelFile(selectedFile);
      } else {
        // Echter API-Modus: Sende an Server für Formatierungen
        setUploadStatus({ type: 'info', message: 'Datei wird hochgeladen und verarbeitet...' });
        const response = await uploadExcelFile(selectedFile);
        
        if (!response.success || !response.data || response.data.length === 0) {
          setUploadStatus({ type: 'error', message: response.message || 'Keine IMEI-Daten in der Datei gefunden' });
          setIsProcessing(false);
          return;
        }
        
        imeis = response.data;
      }
      
      if (imeis.length === 0) {
        setUploadStatus({ type: 'error', message: 'Keine IMEI-Daten in der Datei gefunden' });
        setIsProcessing(false);
        return;
      }
      
      // Daten anzeigen
      setUploadedImeis(imeis);
      setUploadStatus({ 
        type: 'success', 
        message: `${imeis.length} IMEI(s) wurden erfolgreich gelesen. Alte Daten wurden ersetzt.` 
      });
      
      // Speichere IMEIs in IndexedDB (unterstützt größere Datenmengen)
      await saveImeis(imeis);
      
      // Reset file input
      setSelectedFile(null);
      const fileInput = document.getElementById('excel-file-input');
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('Error processing file:', error);
      setUploadStatus({ 
        type: 'error', 
        message: 'Fehler beim Verarbeiten der Datei: ' + (error.response?.data?.message || error.message) 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewAllImeis = () => {
    navigate('/imeis');
  };

  // Funktion zum Extrahieren des Herstellers aus den Daten
  const getManufacturer = (item) => {
    if (!item.rowData) return '';
    
    // Bekannte Hersteller-Namen (für Validierung)
    const knownManufacturers = ['apple', 'google', 'huawei', 'samsung', 'xiaomi', 'oneplus', 'oppo', 'vivo', 'realme', 'motorola', 'nokia', 'sony', 'lg', 'honor'];
    // Bekannte Mobilfunkanbieter (zum Ausschließen)
    const knownCarriers = ['o2', 'vodafone', 'telekom', 't-mobile', 'e-plus', 'base', 'otelo', 'blau', 'simyo', 'congstar'];
    
    // Verwende columnOrder falls vorhanden, um die richtige Reihenfolge zu haben
    const keysToCheck = item.columnOrder && Array.isArray(item.columnOrder) && item.columnOrder.length > 0
      ? item.columnOrder
      : Object.keys(item.rowData);
    
    // Suche nach Hersteller-Spalte (verschiedene mögliche Namen)
    // WICHTIG: "Marke" wird ausgeschlossen, da dort oft Mobilfunkanbieter stehen
    const manufacturerKeys = keysToCheck.filter(key => {
      if (!key) return false;
      const lowerKey = String(key).toLowerCase().trim();
      // Suche nach Hersteller-Begriffen, aber NICHT nach "Marke"
      return (lowerKey.includes('hersteller') || 
             lowerKey.includes('manufacturer') || 
             lowerKey.includes('make') ||
             (lowerKey.includes('brand') && !lowerKey.includes('marke'))) &&
             !lowerKey.includes('marke'); // Explizit "Marke" ausschließen
    });
    
    if (manufacturerKeys.length > 0) {
      const manufacturerKey = manufacturerKeys[0];
      const value = item.rowData[manufacturerKey];
      if (value !== undefined && value !== null && value !== '') {
        const valueStr = String(value).trim();
        const lowerValue = valueStr.toLowerCase();
        // Prüfe ob der Wert ein bekannter Mobilfunkanbieter ist
        if (!knownCarriers.some(carrier => lowerValue.includes(carrier))) {
          return valueStr;
        }
      }
    }
    
    // Fallback: Durchsuche alle Spalten und finde die mit Hersteller-Werten
    const skipKeys = ['marke', 'brand', 'provider', 'netzbetreiber', 'carrier', 'imei'];
    skipKeys.push(...knownCarriers);
    
    for (const key of keysToCheck) {
      if (!key) continue;
      const lowerKey = String(key).toLowerCase().trim();
      
      // Überspringe IMEI und Mobilfunkanbieter-Spalten
      if (skipKeys.some(skip => lowerKey.includes(skip))) {
        continue;
      }
      
      const value = item.rowData[key];
      if (value !== undefined && value !== null && value !== '') {
        const valueStr = String(value).trim();
        const lowerValue = valueStr.toLowerCase();
        
        // Prüfe ob der Wert ein bekannter Hersteller ist
        if (knownManufacturers.some(manufacturer => lowerValue.includes(manufacturer))) {
          return valueStr;
        }
        
        // Prüfe ob der Wert NICHT ein Mobilfunkanbieter ist
        if (!knownCarriers.some(carrier => lowerValue.includes(carrier))) {
          // Wenn es nicht IMEI ist und nicht leer, könnte es ein Hersteller sein
          if (!lowerKey.includes('imei')) {
            return valueStr;
          }
        }
      }
    }
    
    return '';
  };

  return (
    <div className="dashboard">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Willkommen, {user?.name}</h2>
        </div>
        <div className="card-body">
          <TextEditor
            initialContent=""
            onSave={handleSave}
            placeholder="Schreiben Sie hier Ihre Notizen oder Gedanken..."
          />
        </div>
      </div>

      {isAdmin(user) && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Excel/CSV-Datei hochladen</h2>
          </div>
          <div className="card-body">
            <div className="excel-upload-section">
              <div className="form-group">
                <label htmlFor="excel-file-input" className="form-label">
                  Excel/CSV-Datei auswählen (.xlsx, .xls, .csv)
                </label>
                <div className="file-input-wrapper">
                  <input
                    id="excel-file-input"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="file-input"
                  />
                  <label htmlFor="excel-file-input" className="file-input-label">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 2L12.5 5H15C15.5523 5 16 5.44772 16 6V15C16 15.5523 15.5523 16 15 16H5C4.44772 16 4 15.5523 4 15V5C4 4.44772 4.44772 4 5 4H7.5L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10 7V13M7 10H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Datei auswählen</span>
                  </label>
                </div>
                {selectedFile && (
                  <div className="file-info">
                    <p>Ausgewählte Datei: <strong>{selectedFile.name}</strong></p>
                    <p>Größe: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                )}
              </div>
              
              {uploadStatus && (
                <div className={`upload-status upload-status--${uploadStatus.type}`}>
                  {uploadStatus.message}
                </div>
              )}
              
              <button
                onClick={handleFileUpload}
                className="btn btn--primary"
                disabled={!selectedFile || isProcessing}
              >
                {isProcessing ? 'Wird verarbeitet...' : 'Datei hochladen'}
              </button>

              {uploadedImeis.length > 0 && (
                <div className="uploaded-imeis-preview">
                  <div className="uploaded-imeis-header">
                    <h3>Gelesene IMEI-Daten ({uploadedImeis.length})</h3>
                    <button
                      onClick={handleViewAllImeis}
                      className="btn btn--secondary btn--small"
                    >
                      Alle IMEIs anzeigen
                    </button>
                  </div>
                  <div className="uploaded-imeis-table-wrapper">
                    <table className="uploaded-imeis-table">
                      <thead>
                        <tr>
                          <th>IMEI</th>
                          <th>Hersteller</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadedImeis.slice(0, 10).map((item, index) => (
                          <tr key={`${item.imei}-${item.row}-${index}`}>
                            <td className="imei-value">{item.imei}</td>
                            <td>{getManufacturer(item) || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {uploadedImeis.length > 10 && (
                      <p className="uploaded-imeis-more">
                        ... und {uploadedImeis.length - 10} weitere. 
                        <button 
                          onClick={handleViewAllImeis}
                          className="link-button"
                        >
                          Alle anzeigen
                        </button>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
