import ExcelJS from 'exceljs';
import { saveImeisDataToStorage } from './imeis.controller.js';
import User from '../models/User.js';
import { saveJson, loadJson } from '../utils/filePersistence.js';

const VOUCHERS_FILE = 'vouchers.json';
const VOUCHER_USER_STATE_FILE = 'voucher-user-state.json';

function loadVoucherUserStateMap() {
  const map = loadJson(VOUCHER_USER_STATE_FILE);
  return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
}

function getVoucherUserStateForUser(userId) {
  if (!userId) {
    return { copyHistory: [], copyTimestamps: [], rowActions: {} };
  }
  const map = loadVoucherUserStateMap();
  const raw = map[String(userId)];
  if (!raw || typeof raw !== 'object') {
    return { copyHistory: [], copyTimestamps: [], rowActions: {} };
  }
  return {
    copyHistory: Array.isArray(raw.copyHistory) ? raw.copyHistory : [],
    copyTimestamps: Array.isArray(raw.copyTimestamps) ? raw.copyTimestamps : [],
    rowActions: raw.rowActions && typeof raw.rowActions === 'object' && !Array.isArray(raw.rowActions)
      ? raw.rowActions
      : {}
  };
}

async function userCanViewVouchers(userId) {
  if (!userId) return false;
  try {
    const u = await User.findByPk(userId);
    if (!u) return false;
    const role = String(u.role ?? u.get?.('role') ?? u.dataValues?.role ?? '').trim();
    if (role === 'Büro Mitarbeiter') return true;
    const roleLower = role.toLowerCase();
    if (roleLower.includes('admin') || role === 'Administrator') return true;
    const ort = String(u.einsatz_ort ?? u.get?.('einsatz_ort') ?? u.dataValues?.einsatz_ort ?? '').trim();
    return ort !== 'Zentrale';
  } catch {
    return false;
  }
}

async function userCanUploadVouchers(userId) {
  if (!userId) return false;
  try {
    const u = await User.findByPk(userId);
    if (!u) return false;
    const role = String(u.role ?? u.get?.('role') ?? u.dataValues?.role ?? '').trim();
    if (role === 'Büro Mitarbeiter') return true;
    const roleLower = role.toLowerCase();
    return roleLower.includes('admin') || role === 'Administrator';
  } catch {
    return false;
  }
}

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

    const saveDirectlyCsv = req.body?.saveDirectly === 'true' || req.body?.saveDirectly === true;
    if (saveDirectlyCsv && req.user?.userId && imeis.length > 0) {
      await saveImeisDataToStorage(req.user.userId, { imeis }, req.app);
      return res.json({
        success: true,
        message: `${imeis.length} IMEI(s) wurden erfolgreich gelesen und gespeichert`,
        data: imeis,
        saved: true
      });
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

    // saveDirectly: Server speichert direkt – vermeidet 413 bei großem JSON-Payload
    const saveDirectly = req.body?.saveDirectly === 'true' || req.body?.saveDirectly === true;
    if (saveDirectly && req.user?.userId && imeis.length > 0) {
      await saveImeisDataToStorage(req.user.userId, { imeis }, req.app);
      return res.json({
        success: true,
        message: `${imeis.length} IMEI(s) wurden erfolgreich gelesen und gespeichert`,
        data: imeis,
        saved: true
      });
    }

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

/** Voucher-Daten lesen: hochgeladene Zeilen + eigener Verlauf (Rechte wie IMEI-Liste) */
export const getVouchers = async (req, res, next) => {
  try {
    if (!(await userCanViewVouchers(req.user?.userId))) {
      return res.status(403).json({ success: false, message: 'Kein Zugriff auf die Voucher-Übersicht' });
    }
    const data = loadJson(VOUCHERS_FILE) || {};
    const uploaded = Array.isArray(data.rows) ? data.rows : [];
    const userState = getVoucherUserStateForUser(req.user?.userId);
    return res.json({
      success: true,
      uploaded,
      updatedAt: data.updatedAt ?? null,
      userState
    });
  } catch (error) {
    next(error);
  }
};

/** Verlauf / Reservierungen / Rate-Limit-Zeitstempel pro Benutzer persistieren */
export const putVoucherUserState = async (req, res, next) => {
  try {
    if (!(await userCanViewVouchers(req.user?.userId))) {
      return res.status(403).json({ success: false, message: 'Kein Zugriff auf die Voucher-Übersicht' });
    }
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Nicht angemeldet' });
    }
    const body = req.body || {};
    const prev = getVoucherUserStateForUser(userId);
    const nextState = {
      copyHistory: body.copyHistory !== undefined ? body.copyHistory : prev.copyHistory,
      copyTimestamps: body.copyTimestamps !== undefined ? body.copyTimestamps : prev.copyTimestamps,
      rowActions: body.rowActions !== undefined ? body.rowActions : prev.rowActions
    };
    if (!Array.isArray(nextState.copyHistory)) {
      return res.status(400).json({ success: false, message: 'copyHistory muss ein Array sein' });
    }
    if (!Array.isArray(nextState.copyTimestamps)) {
      return res.status(400).json({ success: false, message: 'copyTimestamps muss ein Array sein' });
    }
    if (nextState.rowActions === null || typeof nextState.rowActions !== 'object' || Array.isArray(nextState.rowActions)) {
      return res.status(400).json({ success: false, message: 'rowActions muss ein Objekt sein' });
    }
    const map = loadVoucherUserStateMap();
    map[String(userId)] = nextState;
    saveJson(VOUCHER_USER_STATE_FILE, map);
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

/** Voucher-Listen: alle Tabellenzeilen (ohne IMEI-Pflicht), nur Administrator / Büro Mitarbeiter */
export const processVoucherExcelFile = async (req, res) => {
  try {
    const ok = await userCanUploadVouchers(req.user?.userId);
    if (!ok) {
      return res.status(403).json({
        success: false,
        message: 'Nur Administrator oder Büro Mitarbeiter können Voucher-Dateien hochladen'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Keine Datei hochgeladen'
      });
    }

    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
    const buffer = req.file.buffer;
    let rows = [];

    if (fileExtension === 'csv') {
      const csvText = buffer.toString('utf-8');
      const lines = csvText.split(/\r?\n/).filter((line) => line.trim() !== '');
      if (lines.length === 0) {
        return res.status(400).json({ success: false, message: 'CSV-Datei ist leer' });
      }
      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        const rowData = {};
        headers.forEach((header, index) => {
          const headerName = header || `Spalte${index + 1}`;
          rowData[headerName] = values[index] || '';
        });
        const rowArray = headers.map((_, index) => values[index] || '');
        const isEmpty = rowArray.every((val) => !val || val.toString().trim() === '');
        if (!isEmpty) {
          rows.push({
            row: i + 1,
            sheet: 'Sheet1',
            sheetIndex: 0,
            data: rowArray,
            rowData,
            rowDataFormats: {},
            columnOrder: headers
          });
        }
      }
    } else {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      workbook.eachSheet((worksheet, sheetId) => {
        const sheetName = worksheet.name;
        const headers = [];
        const headerRow = worksheet.getRow(1);
        if (headerRow) {
          headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const headerValue = cell.value ? cell.value.toString() : '';
            headers.push(headerValue.trim() || `Spalte${colNumber}`);
          });
        }

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
                rowDataFormats[headerName] = { textColor };
              }
            }
          });
          const isEmptyRow = rowArray.every((val) => !val || val.toString().trim() === '');
          if (!isEmptyRow) {
            rows.push({
              row: rowNumber,
              sheet: sheetName,
              sheetIndex: sheetId - 1,
              data: rowArray,
              rowData,
              rowDataFormats,
              columnOrder: headers
            });
          }
        });
      });
    }

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Keine Voucher-/Datenzeilen in der Datei gefunden'
      });
    }

    const now = new Date().toISOString();
    saveJson(VOUCHERS_FILE, {
      rows,
      updatedAt: now,
      updatedByUserId: req.user.userId
    });

    return res.json({
      success: true,
      message: `${rows.length} Zeile(n) als Voucher-Liste gespeichert`,
      data: rows,
      count: rows.length,
      saved: true
    });
  } catch (error) {
    console.error('Error processing voucher Excel file:', error);
    return res.status(500).json({
      success: false,
      message: 'Fehler beim Verarbeiten der Voucher-Datei',
      error: error.message
    });
  }
};
