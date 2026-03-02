/**
 * CSV-Parser ohne externe Bibliothek
 */
export const parseCSV = (text) => {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
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

const getXlsxModuleName = () => 'xlsx';

const extractImeisFromCSV = (jsonData) => {
  const headers = jsonData[0] || [];
  const imeis = [];
  const imeiColumnIndex = headers.findIndex(
    header => header && header.toString().toLowerCase().includes('imei')
  );

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || row.length === 0 || row.every(cell => !cell || cell.toString().trim() === '')) {
      continue;
    }

    const rowData = {};
    headers.forEach((header, index) => {
      const headerName = header ? header.toString().trim() : `Spalte${index + 1}`;
      const cellValue = row[index] !== undefined && row[index] !== null ? row[index].toString() : '';
      rowData[headerName] = cellValue;
    });

    let imeiValue = '';
    if (imeiColumnIndex !== -1 && row[imeiColumnIndex]) {
      imeiValue = row[imeiColumnIndex].toString().trim();
    } else if (row[0]) {
      imeiValue = row[0].toString().trim();
    }

    if (imeiValue) {
      imeis.push({ imei: imeiValue, row: i + 1, data: row, rowData });
    }
  }

  return imeis;
};

const extractImeisFromExcel = (workbook, XLSX) => {
  const imeis = [];

  workbook.SheetNames.forEach((sheetName, sheetIndex) => {
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const maxCol = range.e.c;
    const headers = [];

    for (let c = 0; c <= maxCol; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c });
      const cell = worksheet[cellAddress];
      let headerValue = '';
      if (cell) {
        headerValue = (cell.w ?? cell.v ?? '').toString();
      }
      headers.push(headerValue.trim() || `Spalte${c + 1}`);
    }

    const imeiColumnIndex = headers.findIndex(
      header => header && header.toString().toLowerCase().includes('imei')
    );

    for (let r = 1; r <= range.e.r; r++) {
      const rowData = {};
      const rowArray = [];

      for (let c = 0; c <= maxCol; c++) {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        const cell = worksheet[cellAddress];
        let cellValue = '';
        if (cell) {
          cellValue = (cell.w ?? cell.v ?? '').toString();
        }
        rowData[headers[c]] = cellValue;
        rowArray.push(cellValue);
      }

      if (rowArray.every(val => !val || val.toString().trim() === '')) continue;

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
          sheetIndex,
          data: rowArray,
          rowData,
          rowDataFormats: {},
          columnOrder: headers
        });
      }
    }
  });

  return imeis;
};

export const readExcelFile = async (file) => {
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.onerror = () => reject(reader.error);

    if (fileExtension === '.csv') {
      reader.onload = (e) => {
        try {
          const jsonData = parseCSV(e.target.result);
          resolve(extractImeisFromCSV(jsonData));
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file, 'UTF-8');
    } else {
      reader.onload = async (e) => {
        try {
          let XLSX;
          if (typeof window !== 'undefined' && window.XLSX) {
            XLSX = window.XLSX;
          } else {
            try {
              const moduleName = getXlsxModuleName();
              const xlsxModule = await import(/* @vite-ignore */ moduleName);
              XLSX = xlsxModule.default || xlsxModule;
            } catch (importError) {
              reject(new Error('Excel-Unterstützung nicht verfügbar. Bitte laden Sie die Seite neu oder exportieren Sie als CSV.'));
              return;
            }
          }

          if (!XLSX?.read || !XLSX.utils) {
            reject(new Error('xlsx-Modul fehlerhaft. Bitte laden Sie die Seite neu.'));
            return;
          }

          const workbook = XLSX.read(new Uint8Array(e.target.result), {
            type: 'array',
            cellStyles: true,
            cellNF: false,
            cellHTML: false,
            raw: false,
            dense: false
          });

          resolve(extractImeisFromExcel(workbook, XLSX));
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  });
};
