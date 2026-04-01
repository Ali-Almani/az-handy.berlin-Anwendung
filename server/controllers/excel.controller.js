import ExcelJS from 'exceljs';
import { saveImeisDataToStorage, appendImeisFromExcelUpload } from './imeis.controller.js';
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

function roleIsAdmin(role) {
  const r = String(role || '').trim().toLowerCase();
  return r.includes('admin') || String(role || '').trim() === 'Administrator';
}

function emitVouchersUpdated(req) {
  const io = req.app?.get?.('io');
  if (io) io.emit('vouchers:updated');
}

/** Verlauf aller Benutzer (Büro / Admin), gleiche Idee wie IMEI merged copyHistory */
function mergeAllVoucherCopyHistories(map) {
  const merged = [];
  for (const uid of Object.keys(map)) {
    const st = map[uid];
    if (!st || !Array.isArray(st.copyHistory)) continue;
    merged.push(...st.copyHistory);
  }
  return merged
    .filter((e) => e && (e.nummer != null || e.timestamp))
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .slice(0, 200);
}

/** Verlauf nur Benutzer mit gleichem einsatz_ort (Teamleiter shop) */
async function mergeVoucherCopyHistoriesForEinsatzOrt(map, einsatzOrt) {
  const ort = String(einsatzOrt || '').trim();
  if (!ort) return [];
  const usersInCategory = await User.findAll({
    where: { einsatz_ort: ort },
    attributes: ['id']
  });
  const allowed = new Set(usersInCategory.map((u) => String(u.id)));
  const merged = [];
  for (const uid of Object.keys(map)) {
    if (!allowed.has(String(uid))) continue;
    const st = map[uid];
    if (!st || !Array.isArray(st.copyHistory)) continue;
    merged.push(...st.copyHistory);
  }
  return merged
    .filter((e) => e && (e.nummer != null || e.timestamp))
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .slice(0, 200);
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

async function userCanAppendImeiExcel(userId) {
  if (!userId) return false;
  try {
    const u = await User.findByPk(userId);
    if (!u) return false;
    const role = String(u.role ?? u.get?.('role') ?? u.dataValues?.role ?? '').trim();
    if (role === 'Büro Mitarbeiter') return true;
    const rl = role.toLowerCase();
    return rl.includes('admin') || role === 'Administrator';
  } catch {
    return false;
  }
}

/** Büro/Admin: an bestehende Liste anhängen; sonst bisheriges Verhalten (ersetzen). */
async function saveImeisAfterExcelParse(req, imeis) {
  const uploaderId = req.user?.userId;
  if (!uploaderId || imeis.length === 0) return null;
  const append = await userCanAppendImeiExcel(uploaderId);
  if (append) {
    const { merged, added, skippedDuplicate, previousCount, addedRows, total } = await appendImeisFromExcelUpload(
      uploaderId,
      imeis,
      req.app
    );
    let message;
    if (added === 0 && skippedDuplicate > 0) {
      message = `Keine neuen IMEIs: alle ${skippedDuplicate} aus der Datei waren bereits in der Liste (${total} IMEIs gesamt).`;
    } else if (skippedDuplicate > 0) {
      message = `${added} IMEI(s) hinzugefügt, ${skippedDuplicate} Duplikat(e) übersprungen (${total} gesamt, vorher ${previousCount}).`;
    } else {
      message = `${added} IMEI(s) zur IMEI-Liste hinzugefügt (${total} gesamt, vorher ${previousCount}).`;
    }
    return {
      success: true,
      message,
      data: addedRows,
      mergedCount: total,
      added,
      skippedDuplicate,
      previousCount,
      saved: true
    };
  }
  await saveImeisDataToStorage(uploaderId, { imeis }, req.app);
  return {
    success: true,
    message: `${imeis.length} IMEI(s) wurden erfolgreich gelesen und gespeichert`,
    data: imeis,
    saved: true
  };
}

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
      const payload = await saveImeisAfterExcelParse(req, imeis);
      return res.json(payload);
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
      const payload = await saveImeisAfterExcelParse(req, imeis);
      return res.json(payload);
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

/** Voucher-Daten lesen: hochgeladene Zeilen + Verlauf (eigener oder gemerged für Büro/Admin bzw. Teamleiter nach Einsatzort) */
export const getVouchers = async (req, res, next) => {
  try {
    if (!(await userCanViewVouchers(req.user?.userId))) {
      return res.status(403).json({ success: false, message: 'Kein Zugriff auf die Voucher-Übersicht' });
    }
    const data = loadJson(VOUCHERS_FILE) || {};
    const uploaded = Array.isArray(data.rows) ? data.rows : [];
    const map = loadVoucherUserStateMap();
    let userState = getVoucherUserStateForUser(req.user?.userId);
    const currentUser = await User.findByPk(req.user.userId);
    const role = String(currentUser?.role ?? currentUser?.get?.('role') ?? '').trim();
    const isBuero = role === 'Büro Mitarbeiter';
    const isTL = role === 'Teamleiter shop';
    const isAdm = roleIsAdmin(role);
    if (isBuero || isAdm) {
      userState = { ...userState, copyHistory: mergeAllVoucherCopyHistories(map) };
    } else if (isTL && currentUser?.einsatz_ort) {
      userState = {
        ...userState,
        copyHistory: await mergeVoucherCopyHistoriesForEinsatzOrt(map, currentUser.einsatz_ort)
      };
    }
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

function normalizeClientVoucherRow(input) {
  if (!input || typeof input !== 'object') return null;
  const sheet = input.sheet != null ? String(input.sheet) : 'Sheet1';
  const rowNum = Number(input.row);
  if (!Number.isFinite(rowNum)) return null;
  const rowData = input.rowData;
  if (!rowData || typeof rowData !== 'object' || Array.isArray(rowData)) return null;
  const out = {
    sheet,
    row: rowNum,
    rowData: { ...rowData },
    columnOrder: Array.isArray(input.columnOrder) ? [...input.columnOrder] : Object.keys(rowData),
    rowDataFormats:
      input.rowDataFormats && typeof input.rowDataFormats === 'object' && !Array.isArray(input.rowDataFormats)
        ? { ...input.rowDataFormats }
        : {},
    sheetIndex: input.sheetIndex != null ? Number(input.sheetIndex) : 0
  };
  if (Array.isArray(input.data)) out.data = [...input.data];
  return out;
}

function voucherRowsMatch(a, b) {
  if (String(a.sheet || 'default') !== String(b.sheet || 'default')) return false;
  if (Number(a.row) !== Number(b.row)) return false;
  try {
    return JSON.stringify(a.rowData || {}) === JSON.stringify(b.rowData || {});
  } catch {
    return false;
  }
}

function normalizeVoucherNummerValue(v) {
  return String(v ?? '')
    .trim()
    .replace(/^:+\s*/, '');
}

/** Spalte mit Voucher-/PIN-Nummer erkennen (analog zu client voucherColumns.findNummerKey). */
function findVoucherNummerKey(columnOrder, rowData) {
  const order =
    Array.isArray(columnOrder) && columnOrder.length > 0
      ? columnOrder
      : Object.keys(rowData || {});
  const tests = [
    /nummer/i,
    /voucher[\s\-_]?nummer/i,
    /^code$/i,
    /voucher[\s\-_]?code/i,
    /^nr\.?$/i,
    /\bnr\b/i,
    /^pin$/i,
    /serien(nummer)?/i,
    /kartennummer/i,
    /gutschein[\s\-_]?nummer/i,
    /^:\s*nummer$/i
  ];
  for (const h of order) {
    const s = String(h ?? '').trim();
    if (!s) continue;
    if (tests.some((re) => re.test(s))) return h;
  }
  return null;
}

/** Ein Schlüssel pro Zeile: bevorzugt normalisierte Voucher-Nummer, sonst Inhalts-Fingerprint (ohne Excel-Zeilennummer). */
function voucherRowDedupKey(row) {
  if (!row?.rowData || typeof row.rowData !== 'object' || Array.isArray(row.rowData)) return null;
  const numKey = findVoucherNummerKey(row.columnOrder, row.rowData);
  if (numKey != null && row.rowData[numKey] != null && String(row.rowData[numKey]).trim() !== '') {
    const n = normalizeVoucherNummerValue(row.rowData[numKey]);
    if (n) return `n:${n}`;
  }
  try {
    const keys = Object.keys(row.rowData).sort();
    const blob = keys.map((k) => `${k}=${normalizeVoucherNummerValue(row.rowData[k])}`).join('|');
    return `r:${blob}`;
  } catch {
    return null;
  }
}

/**
 * Neuen Upload an bestehende Liste anhängen (nicht ersetzen).
 * Doppelte Voucher-Nummern bzw. identische Zeilen werden übersprungen.
 */
export function mergeVoucherRowsAppend(existingRows, incomingRows) {
  const existing = Array.isArray(existingRows) ? [...existingRows] : [];
  const seen = new Set();
  for (const r of existing) {
    const k = voucherRowDedupKey(r);
    if (k) seen.add(k);
  }
  const merged = [...existing];
  const addedRows = [];
  let added = 0;
  let skippedDuplicate = 0;
  for (const r of incomingRows) {
    const k = voucherRowDedupKey(r);
    if (k && seen.has(k)) {
      skippedDuplicate += 1;
      continue;
    }
    if (k) seen.add(k);
    merged.push(r);
    addedRows.push(r);
    added += 1;
  }
  return {
    merged,
    addedRows,
    added,
    skippedDuplicate,
    previousCount: existing.length
  };
}

/** Reservieren: Zeile aus der gemeinsamen Voucher-Liste entfernen (persistiert in vouchers.json) */
export const removeVoucherListRow = async (req, res, next) => {
  try {
    if (!(await userCanViewVouchers(req.user?.userId))) {
      return res.status(403).json({ success: false, message: 'Kein Zugriff auf die Voucher-Übersicht' });
    }
    const payload = normalizeClientVoucherRow(req.body?.row ?? req.body);
    if (!payload) {
      return res.status(400).json({ success: false, message: 'Ungültige Zeilendaten' });
    }
    const data = loadJson(VOUCHERS_FILE) || {};
    const rows = Array.isArray(data.rows) ? [...data.rows] : [];
    const idx = rows.findIndex((r) => voucherRowsMatch(r, payload));
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Zeile nicht gefunden oder bereits entfernt' });
    }
    rows.splice(idx, 1);
    saveJson(VOUCHERS_FILE, {
      ...data,
      rows,
      updatedAt: new Date().toISOString(),
      updatedByUserId: req.user.userId
    });
    emitVouchersUpdated(req);
    return res.json({ success: true, count: rows.length });
  } catch (e) {
    next(e);
  }
};

/** Abgelehnt im Verlauf: Zeile wieder in die Liste einfügen */
export const restoreVoucherListRow = async (req, res, next) => {
  try {
    if (!(await userCanViewVouchers(req.user?.userId))) {
      return res.status(403).json({ success: false, message: 'Kein Zugriff auf die Voucher-Übersicht' });
    }
    const payload = normalizeClientVoucherRow(req.body?.row ?? req.body);
    if (!payload) {
      return res.status(400).json({ success: false, message: 'Ungültige Zeilendaten' });
    }
    const data = loadJson(VOUCHERS_FILE) || {};
    const rows = Array.isArray(data.rows) ? [...data.rows] : [];
    if (rows.some((r) => voucherRowsMatch(r, payload))) {
      return res.json({ success: true, duplicate: true, count: rows.length });
    }
    rows.push(payload);
    saveJson(VOUCHERS_FILE, {
      ...data,
      rows,
      updatedAt: new Date().toISOString(),
      updatedByUserId: req.user.userId
    });
    emitVouchersUpdated(req);
    return res.json({ success: true, count: rows.length });
  } catch (e) {
    next(e);
  }
};

/** Büro / Administrator / Teamleiter shop: Verlauf-Aktion für einen anderen Benutzer (wie IMEI history-action) */
export const updateVoucherHistoryAction = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const currentUser = await User.findByPk(userId);
    const role = String(currentUser?.role ?? currentUser?.get?.('role') ?? '').trim();
    const isBuero = role === 'Büro Mitarbeiter';
    const isTL = role === 'Teamleiter shop';
    const isAdm = roleIsAdmin(role);
    if (!isBuero && !isTL && !isAdm) {
      return res.status(403).json({
        success: false,
        message: 'Nur Büro Mitarbeiter, Administrator oder Teamleiter shop dürfen Verlauf-Aktionen für andere Benutzer setzen'
      });
    }
    const { userName, newAction, nummer, timestamp, sheet, row } = req.body || {};
    if (!userName || !newAction || (newAction !== 'angenommen' && newAction !== 'abgelehnt')) {
      return res.status(400).json({ success: false, message: 'userName, newAction (angenommen|abgelehnt) erforderlich' });
    }
    const targetUser = await User.findOne({ where: { name: userName } });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Benutzer nicht gefunden' });
    }
    if (isTL && !isBuero && !isAdm) {
      const tlOrt = String(currentUser?.einsatz_ort ?? currentUser?.get?.('einsatz_ort') ?? '').trim();
      const targetOrt = String(targetUser?.einsatz_ort ?? targetUser?.get?.('einsatz_ort') ?? '').trim();
      if (!tlOrt || tlOrt !== targetOrt) {
        return res.status(403).json({
          success: false,
          message: 'Teamleiter dürfen nur Aktionen für Benutzer ihrer Kategorie (einsatz_ort) aktualisieren'
        });
      }
    }
    const targetId = String(targetUser.id ?? targetUser.get?.('id'));
    const map = loadVoucherUserStateMap();
    const prev = getVoucherUserStateForUser(targetUser.id ?? targetUser.get?.('id'));
    let copyHistory = Array.isArray(prev.copyHistory) ? [...prev.copyHistory] : [];
    const ts = timestamp != null ? String(timestamp) : '';
    const idx = copyHistory.findIndex((e) => {
      if (!e || String(e.userName || '').trim() !== String(userName).trim()) return false;
      if (String(e.nummer || '') !== String(nummer ?? '')) return false;
      if (ts) return String(e.timestamp || '') === ts;
      const s = sheet != null ? String(sheet) : '';
      const r = row != null ? Number(row) : NaN;
      return s && Number.isFinite(r) && String(e.sheet || 'default') === s && Number(e.row) === r;
    });
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Verlauf-Eintrag nicht gefunden' });
    }
    const entry = copyHistory[idx];
    copyHistory = copyHistory.filter((_, i) => i !== idx);
    const rowId = `${entry.sheet || 'default'}-${entry.row}`;
    let rowActions = prev.rowActions && typeof prev.rowActions === 'object' && !Array.isArray(prev.rowActions)
      ? { ...prev.rowActions }
      : {};
    delete rowActions[rowId];

    if (newAction === 'abgelehnt' && entry.rowSnapshot) {
      const payload = normalizeClientVoucherRow(entry.rowSnapshot);
      if (payload) {
        const vdata = loadJson(VOUCHERS_FILE) || {};
        const rows = Array.isArray(vdata.rows) ? [...vdata.rows] : [];
        if (!rows.some((r) => voucherRowsMatch(r, payload))) {
          rows.push(payload);
          saveJson(VOUCHERS_FILE, {
            ...vdata,
            rows,
            updatedAt: new Date().toISOString(),
            updatedByUserId: req.user.userId
          });
        }
      }
    }
    if (newAction === 'angenommen' && entry.rowSnapshot) {
      const payload = normalizeClientVoucherRow(entry.rowSnapshot);
      if (payload) {
        const vdata = loadJson(VOUCHERS_FILE) || {};
        const rows = Array.isArray(vdata.rows) ? [...vdata.rows] : [];
        const ridx = rows.findIndex((r) => voucherRowsMatch(r, payload));
        if (ridx !== -1) {
          rows.splice(ridx, 1);
          saveJson(VOUCHERS_FILE, {
            ...vdata,
            rows,
            updatedAt: new Date().toISOString(),
            updatedByUserId: req.user.userId
          });
        }
      }
    }
    map[targetId] = {
      ...prev,
      copyHistory,
      rowActions
    };
    saveJson(VOUCHER_USER_STATE_FILE, map);
    emitVouchersUpdated(req);
    return res.json({ success: true });
  } catch (e) {
    next(e);
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

    const currentUser = await User.findByPk(userId);
    const role = String(currentUser?.role ?? currentUser?.get?.('role') ?? '').trim();
    const isBueroWipe = role === 'Büro Mitarbeiter';
    const isAdmWipe = roleIsAdmin(role);
    /** Admin/Büro: „Alle löschen“ leert den gemergten Verlauf → gesamte voucher-user-state.json zurücksetzen */
    const wipeAllUserStates = isBueroWipe || isAdmWipe;
    const isFullClearRequest =
      body.copyHistory !== undefined &&
      Array.isArray(body.copyHistory) &&
      body.copyHistory.length === 0 &&
      body.copyTimestamps !== undefined &&
      Array.isArray(body.copyTimestamps) &&
      body.copyTimestamps.length === 0 &&
      body.rowActions !== undefined &&
      typeof body.rowActions === 'object' &&
      !Array.isArray(body.rowActions) &&
      Object.keys(body.rowActions).length === 0;
    if (isFullClearRequest && wipeAllUserStates) {
      saveJson(VOUCHER_USER_STATE_FILE, {});
      emitVouchersUpdated(req);
      return res.json({ success: true });
    }

    const map = loadVoucherUserStateMap();
    map[String(userId)] = nextState;
    saveJson(VOUCHER_USER_STATE_FILE, map);
    emitVouchersUpdated(req);
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

    const prev = loadJson(VOUCHERS_FILE) || {};
    const existingRows = Array.isArray(prev.rows) ? prev.rows : [];
    const { merged, addedRows, added, skippedDuplicate, previousCount } = mergeVoucherRowsAppend(existingRows, rows);

    const now = new Date().toISOString();
    saveJson(VOUCHERS_FILE, {
      ...prev,
      rows: merged,
      updatedAt: now,
      updatedByUserId: req.user.userId
    });
    emitVouchersUpdated(req);

    let message;
    if (added === 0 && skippedDuplicate > 0) {
      message = `Keine neuen Zeilen: alle ${skippedDuplicate} aus der Datei waren bereits in der Liste (${merged.length} Zeilen gesamt).`;
    } else if (skippedDuplicate > 0) {
      message = `${added} Zeile(n) hinzugefügt, ${skippedDuplicate} Duplikat(e) übersprungen (${merged.length} Zeilen gesamt, vorher ${previousCount}).`;
    } else {
      message = `${added} Zeile(n) zur Voucher-Liste hinzugefügt (${merged.length} Zeilen gesamt, vorher ${previousCount}).`;
    }

    return res.json({
      success: true,
      message,
      data: addedRows,
      count: merged.length,
      added,
      skippedDuplicate,
      previousCount,
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
