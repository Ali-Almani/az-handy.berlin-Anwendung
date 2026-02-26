import ExcelJS from 'exceljs';

const exceljsColorToHex = (color) => {
  if (!color) return null;
  
  if (color.argb) {
    const argb = color.argb.toString().toUpperCase();
    if (argb.length === 8 && argb.startsWith('FF')) {
      return '#' + argb.substring(2);
    } else if (argb.length === 6) {
      return '#' + argb;
    }
  }
  
  if (color.rgb) {
    const rgb = color.rgb.toString().toUpperCase();
    if (rgb.length === 6) {
      return '#' + rgb;
    }
  }
  
  if (color.r !== undefined && color.g !== undefined && color.b !== undefined) {
    const r = Math.round(color.r).toString(16).padStart(2, '0');
    const g = Math.round(color.g).toString(16).padStart(2, '0');
    const b = Math.round(color.b).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`.toUpperCase();
  }
  
  return null;
};

export const processExcelFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Keine Datei hochgeladen' 
      });
    }

    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
    const buffer = req.file.buffer;

    if (fileExtension === 'csv') {
      const csvText = buffer.toString('utf-8');
      const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
      
      if (lines.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'CSV-Datei ist leer'
        });
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const imeis = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const rowData = {};
        const rowArray = [];

        headers.forEach((header, index) => {
          const headerName = header || `Spalte${index + 1}`;
          const cellValue = values[index] || '';
          rowData[headerName] = cellValue;
          rowArray.push(cellValue);
        });

        const imeiValue = rowArray[0] ? rowArray[0].toString().trim() : '';
        if (imeiValue) {
          imeis.push({
            imei: imeiValue,
            row: i + 1,
            sheet: 'Sheet1',
            sheetIndex: 0,
            data: rowArray,
            rowData: rowData,
            rowDataFormats: {},
            columnOrder: headers
          });
        }
      }

      return res.json({
        success: true,
        message: `${imeis.length} IMEI(s) wurden erfolgreich gelesen`,
        data: imeis
      });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const imeis = [];

    workbook.eachSheet((worksheet, sheetId) => {
      const sheetName = worksheet.name;
      const headers = [];
      
      const headerRow = worksheet.getRow(1);
      if (headerRow) {
        headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const headerValue = cell.value ? cell.value.toString() : '';
          const headerName = headerValue.trim() || `Spalte${colNumber}`;
          headers.push(headerName);
        });
      }

      const imeiColumnIndex = headers.findIndex(
        header => header && header.toString().toLowerCase().includes('imei')
      );

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const rowData = {};
        const rowDataFormats = {};
        const rowArray = [];

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          let cellValue = '';
          if (cell.value !== null && cell.value !== undefined) {
            if (cell.value instanceof Date) {
              const d = cell.value.getDate();
              const m = cell.value.getMonth() + 1;
              const y = cell.value.getFullYear();
              cellValue = `${d}.${m}.${y}`;
            } else {
              cellValue = cell.value.toString();
            }
          }

          const headerName = headers[colNumber - 1] || `Spalte${colNumber}`;
          rowData[headerName] = cellValue;
          rowArray.push(cellValue);

          if (cell.font && cell.font.color) {
            const textColor = exceljsColorToHex(cell.font.color);
            if (textColor && textColor !== '#000000') {
              rowDataFormats[headerName] = { textColor: textColor };
            }
          }
        });

        const isEmptyRow = rowArray.every(val => !val || val.toString().trim() === '');
        if (isEmptyRow) {
          return;
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
            row: rowNumber,
            sheet: sheetName,
            sheetIndex: sheetId - 1,
            data: rowArray,
            rowData: rowData,
            rowDataFormats: rowDataFormats,
            columnOrder: headers
          });
        }
      });
    });

    res.json({
      success: true,
      message: `${imeis.length} IMEI(s) wurden erfolgreich gelesen`,
      data: imeis
    });

  } catch (error) {
    console.error('Error processing Excel file:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Verarbeiten der Excel-Datei',
      error: error.message
    });
  }
};
