import ExcelJS from 'exceljs';
import { saveImeisDataToStorage, appendImeisFromExcelUpload } from './imeis.controller.js';
import { isBüroMitarbeiter, isAdmin, getUserRole } from '../utils/imeiOfficeRoles.js';
import User from '../models/User.js';
import * as VoucherManualRequest from '../models/VoucherManualRequest.memory.js';
import { saveJson, loadJson } from '../utils/filePersistence.js';
import { getVoucherDeleteAllEnabled } from '../utils/voucherSettings.js';
import { resolveAuthUserId } from '../utils/normalizeUserId.js';
import { writeAuditLog } from '../utils/auditLog.js';

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

/**
 * Anzeigetext aus Excel-Zelle (wichtig für IMEI: lange Ganzzahlen sonst Rundung / Exponentialdarstellung).
 */
function excelCellToPlainString(cell) {
  if (!cell) return '';
  const v = cell.value;
  if (v instanceof Date) {
    const d = v.getDate();
    const m = v.getMonth() + 1;
    const y = v.getFullYear();
    return `${d}.${m}.${y}`;
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    if (Array.isArray(v.richText)) {
      const rt = v.richText.map((p) => (p && p.text) || '').join('').trim();
      if (rt !== '') return rt;
    }
    if (Object.prototype.hasOwnProperty.call(v, 'result') && v.result != null && v.result !== '') {
      const r = v.result;
      if (r instanceof Date) {
        const d = r.getDate();
        const m = r.getMonth() + 1;
        const y = r.getFullYear();
        return `${d}.${m}.${y}`;
      }
      const fromText = cell.text != null ? String(cell.text).trim() : '';
      if (fromText !== '') return fromText;
      return String(r).trim();
    }
    if (typeof v.text === 'string' && v.text.trim() !== '') {
      return v.text.trim();
    }
    if (v.hyperlink != null && v.text != null) {
      return String(v.text).trim();
    }
  }
  const text = cell.text != null ? String(cell.text).trim() : '';
  if (text !== '') return text;
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

/** Luhn auf genau 15 Ziffern inkl. Prüfziffer (wie IMEI). */
function imeiLuhnValid15(val) {
  const d = String(val ?? '').replace(/\D/g, '');
  if (d.length !== 15) return false;
  const arr = d.split('').reverse().map((c) => parseInt(c, 10));
  const sum = arr.reduce((acc, digit, idx) => {
    if (idx % 2 === 0) return acc + digit;
    const doubled = digit * 2;
    return acc + (doubled > 9 ? doubled - 9 : doubled);
  }, 0);
  return sum % 10 === 0;
}

function cellLooksLikeImeiString(val) {
  const s = String(val ?? '').trim();
  if (!s) return false;
  const digits = s.replace(/\D/g, '');
  return digits.length >= 14 && digits.length <= 17;
}

/** 0 = keine IMEI, 1 = Länge plausibel, 2 = 15 Ziffern + gültige Luhn (starkes Signal). */
function cellImeiPlausibility(val) {
  if (!cellLooksLikeImeiString(val)) return 0;
  const d = String(val ?? '').replace(/\D/g, '');
  if (d.length === 15 && imeiLuhnValid15(d)) return 2;
  return 1;
}

/**
 * Erkennt die IMEI-Spalte zuverlässiger als includes('imei'): Spalten wie „IMEI vorhanden“
 * (Ja/Nein) liefern sonst für viele Zeilen denselben Wert → alles als Duplikat.
 */
function scoreImeiHeader(header) {
  const h = String(header ?? '').trim().toLowerCase();
  if (!h) return 0;

  const mentionsImei = h.includes('imei');
  const mentionsSerial = /seriennummer/.test(h) || /^serial\b/.test(h) || h.includes('serial-nr');
  if (!mentionsImei && !mentionsSerial) return 0;

  if (mentionsImei) {
    if (
      /(vorhanden|ohne\s*imei|kein\s*imei|imei\s*ok|ohneimei|imei-status|imei\s*check|hat\s*imei|mit\s*imei)/.test(h)
    ) {
      return -1;
    }
  }

  if (/^imei$/.test(h)) return 100;
  if (/^imei[\s._-]*(nr|nummer|no\.?|#)/.test(h) || /^(nr|nummer)[\s._-]*imei/.test(h)) return 95;
  if (/gerät(e)?[\s._-]*imei|imei[\s._-]*gerät/.test(h)) return 93;
  if (/\bhaupt[\s._-]*imei\b/.test(h) || /^imei1$/.test(h)) return 91;
  if (/seriennummer/.test(h) || /^serial\b/.test(h)) return 78;
  if (mentionsImei) {
    if (/imei\s*2|zweit|sim\s*2|secondary|second/.test(h)) return 56;
    return 72;
  }
  return 0;
}

/** Mittlere Plausibilität 0–2 (Luhn-treue IMEI-Spalten schlagen 14-stellige Artikelnummern). */
function imeiColumnQualityAvg(colIndex, rowArrays) {
  let sum = 0;
  let nonempty = 0;
  for (const ra of rowArrays) {
    if (!Array.isArray(ra) || colIndex < 0 || colIndex >= ra.length) continue;
    const v = ra[colIndex];
    if (v === undefined || v === null || String(v).trim() === '') continue;
    nonempty += 1;
    sum += cellImeiPlausibility(v);
  }
  if (nonempty === 0) return 0;
  return sum / nonempty;
}

function pickImeiColumnIndex(headers, rowArrays) {
  const nCols = Math.max(
    headers.length,
    ...rowArrays.map((r) => (Array.isArray(r) ? r.length : 0)),
    0
  );
  let best = -1;
  let bestCombined = -1;
  for (let j = 0; j < nCols; j++) {
    const hs = scoreImeiHeader(headers[j]);
    if (hs < 0) continue;
    const q = imeiColumnQualityAvg(j, rowArrays);
    if (hs === 0 && q < 0.35) continue;
    const combined = hs * 1000 + q * 400;
    if (combined > bestCombined) {
      bestCombined = combined;
      best = j;
    }
  }
  if (best >= 0) return best;

  best = -1;
  bestCombined = -1;
  for (let j = 0; j < nCols; j++) {
    const q = imeiColumnQualityAvg(j, rowArrays);
    if (q > bestCombined) {
      bestCombined = q;
      best = j;
    }
  }
  if (bestCombined >= 0.2) return best;
  return -1;
}

const MAX_SHEET_HEADER_PROBE = 22;

function headersFromRowArray(rowArray) {
  return rowArray.map((cell, idx) => {
    const v = String(cell ?? '').trim();
    return v || `Spalte${idx + 1}`;
  });
}

function sheetRowIsEmpty(rowArray) {
  return rowArray.every((val) => !val || String(val).trim() === '');
}

/** Alle nicht-leeren Zeilen: rowNumber, rowArray, fmtByCol (1-basierte Spaltennummer → Format). */
function collectNonEmptySheetRows(worksheet) {
  let maxCol = 1;
  worksheet.eachRow((row) => {
    const n = row.lastColumn?.number ?? row.cellCount ?? 0;
    if (n > maxCol) maxCol = n;
  });
  const out = [];
  worksheet.eachRow((row, rowNumber) => {
    const rowArray = new Array(maxCol).fill('');
    const fmtByCol = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber < 1 || colNumber > rowArray.length) return;
      const cellValue = excelCellToPlainString(cell);
      rowArray[colNumber - 1] = cellValue;
      if (cell.font && cell.font.color) {
        const textColor = exceljsColorToHex(cell.font.color);
        if (textColor && textColor !== '#000000') {
          fmtByCol[colNumber] = { textColor: textColor };
        }
      }
    });
    if (sheetRowIsEmpty(rowArray)) return;
    out.push({ rowNumber, rowArray, fmtByCol });
  });
  return out;
}

function buildRowDataFromHeaders(headers, rowArray, fmtByCol) {
  const rowData = {};
  const rowDataFormats = {};
  const len = Math.max(headers.length, rowArray.length);
  for (let j = 0; j < len; j++) {
    const headerName = headers[j] || `Spalte${j + 1}`;
    const val = rowArray[j] ?? '';
    rowData[headerName] = val;
    const fmt = fmtByCol[j + 1];
    if (fmt) rowDataFormats[headerName] = fmt;
  }
  return { rowData, rowDataFormats };
}

function evaluateSheetParseWithHeaderAt(sheetRows, headerIdx) {
  if (headerIdx < 0 || headerIdx >= sheetRows.length) return null;
  const headers = headersFromRowArray(sheetRows[headerIdx].rowArray);
  const dataEntries = sheetRows.slice(headerIdx + 1);
  if (dataEntries.length === 0) return null;
  const rowArrays = dataEntries.map((e) => e.rowArray);
  const pickCol = pickImeiColumnIndex(headers, rowArrays);
  let imeiHits = 0;
  let plausSum = 0;
  for (const e of dataEntries) {
    let v = '';
    if (pickCol !== -1 && e.rowArray[pickCol]) v = String(e.rowArray[pickCol]).trim();
    else if (e.rowArray[0]) v = String(e.rowArray[0]).trim();
    const p = cellImeiPlausibility(v);
    plausSum += p;
    if (p > 0) imeiHits += 1;
  }
  let score = plausSum;
  if (pickCol >= 0 && pickCol < sheetRows[headerIdx].rowArray.length) {
    const hv = sheetRows[headerIdx].rowArray[pickCol];
    if (cellImeiPlausibility(hv) > 0) score -= 4;
  }
  return {
    score,
    imeiHits,
    headers,
    pickCol,
    dataEntries
  };
}

/** Wenn Zeile 1 ein Titel ist und echte Überschriften in Zeile 2 stehen, hi=0 sonst falsche IMEI-Spalte. */
function bestSheetParseConfig(sheetRows) {
  let best = null;
  const limit = Math.min(MAX_SHEET_HEADER_PROBE, sheetRows.length);
  for (let hi = 0; hi < limit; hi++) {
    const ev = evaluateSheetParseWithHeaderAt(sheetRows, hi);
    if (!ev) continue;
    if (!best || ev.score > best.score || (ev.score === best.score && ev.imeiHits > best.imeiHits)) {
      best = { headerIdx: hi, ...ev };
    }
  }
  return best;
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
    const role = getUserRole(u);
    return isBüroMitarbeiter(role) || isAdmin(role);
  } catch {
    return false;
  }
}

function maskImeiPreview(val) {
  const d = String(val ?? '').replace(/\D/g, '');
  if (d.length < 8) return '(zu kurz)';
  return `${d.slice(0, 6)}…${d.slice(-2)}`;
}

/** Büro/Admin: an bestehende Liste anhängen; sonst bisheriges Verhalten (ersetzen). */
async function saveImeisAfterExcelParse(req, imeis) {
  const uploaderId = req.user?.userId;
  if (!uploaderId || imeis.length === 0) return null;
  const append = await userCanAppendImeiExcel(uploaderId);
  if (append) {
    const parsePreview = imeis.slice(0, 5).map((r) => maskImeiPreview(r?.imei));
    const { merged, added, skippedDuplicate, updatedFromUpload, previousCount, addedRows, total, acceptedArchiveMatches } =
      await appendImeisFromExcelUpload(uploaderId, imeis, req.app);
    let message;
    if (added === 0 && (updatedFromUpload ?? 0) > 0) {
      message = `${updatedFromUpload} IMEI-Zeile(n) mit Daten aus der Datei aktualisiert (${total} IMEIs gesamt, vorher ${previousCount}).`;
    } else if (added > 0 && (updatedFromUpload ?? 0) > 0) {
      message = `${added} neue IMEI(s) hinzugefügt, ${updatedFromUpload} bestehende aktualisiert (${total} gesamt, vorher ${previousCount}).`;
    } else if (added > 0) {
      message = `${added} IMEI(s) zur IMEI-Liste hinzugefügt (${total} gesamt, vorher ${previousCount}).`;
    } else {
      message = `Keine Änderungen aus der Datei (${total} IMEIs gesamt).`;
    }
    if ((acceptedArchiveMatches ?? 0) > 0) {
      message = `${message} ${acceptedArchiveMatches} IMEI(s) aus dem Angenommen-Archiv – siehe Kategorie „Angenommen (Excel)“.`;
    }
    writeAuditLog(req, {
      category: 'excel',
      action: 'excel.upload',
      summary: `Excel-Upload: ${added} neu, ${updatedFromUpload ?? 0} aktualisiert (${total} gesamt)`,
      meta: { added, updatedFromUpload: updatedFromUpload ?? 0, total, fileRows: imeis.length }
    });
    return {
      success: true,
      message,
      data: addedRows,
      mergedCount: total,
      added,
      skippedDuplicate,
      updatedFromUpload: updatedFromUpload ?? 0,
      previousCount,
      acceptedArchiveMatches: acceptedArchiveMatches ?? 0,
      saved: true,
      parsedFromFile: imeis.length,
      parsePreview
    };
  }
  await saveImeisDataToStorage(uploaderId, { imeis }, req.app);
  writeAuditLog(req, {
    category: 'excel',
    action: 'excel.upload',
    summary: `Excel-Upload: ${imeis.length} IMEI(s) gespeichert`,
    meta: { count: imeis.length }
  });
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
      const pendingCsv = [];
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

        const isEmptyRow = rowArray.every((val) => !val || val.toString().trim() === '');
        if (isEmptyRow) continue;
        pendingCsv.push({ row: i + 1, rowArray, rowData });
      }

      const csvImeiCol = pickImeiColumnIndex(
        headers,
        pendingCsv.map((p) => p.rowArray)
      );
      const imeis = [];
      for (const p of pendingCsv) {
        let imeiValue = '';
        if (csvImeiCol !== -1 && p.rowArray[csvImeiCol]) {
          imeiValue = p.rowArray[csvImeiCol].toString().trim();
        } else if (p.rowArray[0]) {
          imeiValue = p.rowArray[0].toString().trim();
        }
        if (imeiValue) {
          imeis.push({
            imei: imeiValue,
            row: p.row,
            sheet: 'Sheet1',
            sheetIndex: 0,
            data: p.rowArray,
            rowData: p.rowData,
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
      const sheetRows = collectNonEmptySheetRows(worksheet);
      const cfg = bestSheetParseConfig(sheetRows);
      if (!cfg) return;

      const { headers, pickCol, dataEntries } = cfg;
      for (const e of dataEntries) {
        let imeiValue = '';
        if (pickCol !== -1 && e.rowArray[pickCol]) {
          imeiValue = String(e.rowArray[pickCol]).trim();
        } else if (e.rowArray[0]) {
          imeiValue = String(e.rowArray[0]).trim();
        }
        if (!imeiValue) continue;
        if (!cellLooksLikeImeiString(imeiValue)) continue;
        const { rowData, rowDataFormats } = buildRowDataFromHeaders(headers, e.rowArray, e.fmtByCol);
        imeis.push({
          imei: imeiValue,
          row: e.rowNumber,
          sheet: sheetName,
          sheetIndex: sheetId - 1,
          data: e.rowArray,
          rowData,
          rowDataFormats,
          columnOrder: headers
        });
      }
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
    const uid = resolveAuthUserId(req.user);
    if (uid == null) {
      return res.status(401).json({ success: false, message: 'Nicht angemeldet' });
    }
    if (!(await userCanViewVouchers(uid))) {
      return res.status(403).json({ success: false, message: 'Kein Zugriff auf die Voucher-Übersicht' });
    }
    const data = loadJson(VOUCHERS_FILE) || {};
    const uploaded = Array.isArray(data.rows) ? data.rows : [];
    const map = loadVoucherUserStateMap();
    let userState = getVoucherUserStateForUser(uid);
    const currentUser = await User.findByPk(uid);
    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'Benutzer nicht gefunden' });
    }
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
  if (input.isTitleRow === true) out.isTitleRow = true;
  if (input.isTitleRow === false) out.isTitleRow = false;
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

function looksLikeVoucherNumberValue(v) {
  const s = normalizeVoucherNummerValue(v);
  if (!s) return false;
  return /^\d{10,20}$/.test(s);
}

function markVoucherRowTitleMeta(row) {
  if (!row || typeof row !== 'object') return row;
  const numKey = findVoucherNummerKey(row.columnOrder, row.rowData);
  if (!numKey) return row;
  const value = normalizeVoucherNummerValue(row.rowData?.[numKey]);
  if (!value) return { ...row, isTitleRow: false };
  return { ...row, isTitleRow: !looksLikeVoucherNumberValue(value) };
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

/** Blätter aus dem Upload ersetzen: alte Zeilen derselben Excel-Sheets entfernen, dann neu anhängen. */
export function mergeVoucherRowsReplaceSheets(existingRows, incomingRows) {
  const incoming = Array.isArray(incomingRows) ? incomingRows : [];
  if (!incoming.length) {
    return mergeVoucherRowsAppend(existingRows, incoming);
  }
  const incomingSheets = new Set(incoming.map((r) => String(r.sheet || 'Sheet1')));
  const kept = (Array.isArray(existingRows) ? existingRows : []).filter(
    (r) => !incomingSheets.has(String(r.sheet || 'Sheet1'))
  );
  return mergeVoucherRowsAppend(kept, incoming);
}

/** Reservieren: Zeile aus der gemeinsamen Voucher-Liste entfernen (persistiert in vouchers.json) */
export const removeVoucherListRow = async (req, res, next) => {
  try {
    if (!(await userCanViewVouchers(resolveAuthUserId(req.user)))) {
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
    if (!(await userCanViewVouchers(resolveAuthUserId(req.user)))) {
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
    const userId = resolveAuthUserId(req.user);
    if (userId == null) {
      return res.status(401).json({ success: false, message: 'Nicht angemeldet' });
    }
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
    const { userName, historyOwnerUserId, newAction, nummer, timestamp, sheet, row } = req.body || {};
    if (!newAction || (newAction !== 'angenommen' && newAction !== 'abgelehnt')) {
      return res.status(400).json({ success: false, message: 'newAction (angenommen|abgelehnt) erforderlich' });
    }
    let targetUser = null;
    if (historyOwnerUserId != null && String(historyOwnerUserId).trim() !== '') {
      targetUser = await User.findByPk(historyOwnerUserId);
    }
    if (!targetUser && userName) {
      targetUser = await User.findOne({ where: { name: userName } });
    }
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
      if (!e) return false;
      // prefer userId match when available; fallback to username for legacy entries
      if (historyOwnerUserId != null && String(historyOwnerUserId).trim() !== '') {
        if (String(e.historyOwnerUserId ?? '').trim() !== String(historyOwnerUserId).trim()) return false;
      } else if (userName) {
        if (String(e.userName || '').trim() !== String(userName).trim()) return false;
      }
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
    const userId = resolveAuthUserId(req.user);
    if (userId == null) {
      return res.status(401).json({ success: false, message: 'Nicht angemeldet' });
    }
    if (!(await userCanViewVouchers(userId))) {
      return res.status(403).json({ success: false, message: 'Kein Zugriff auf die Voucher-Übersicht' });
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
      if (!getVoucherDeleteAllEnabled()) {
        return res.status(403).json({
          success: false,
          message: '„Alle löschen“ ist derzeit deaktiviert (Administrator-Einstellung).'
        });
      }
      saveJson(VOUCHER_USER_STATE_FILE, {});
      const prevV = loadJson(VOUCHERS_FILE) || {};
      saveJson(VOUCHERS_FILE, {
        ...prevV,
        rows: [],
        updatedAt: new Date().toISOString(),
        updatedByUserId: userId
      });
      VoucherManualRequest.clearAllRequests();
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
    const ok = await userCanUploadVouchers(resolveAuthUserId(req.user));
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
          rows.push(
            markVoucherRowTitleMeta({
              row: i + 1,
              sheet: 'Sheet1',
              sheetIndex: 0,
              data: rowArray,
              rowData,
              rowDataFormats: {},
              columnOrder: headers
            })
          );
        }
      }
    } else {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      workbook.eachSheet((worksheet, sheetId) => {
        const sheetName = worksheet.name;
        const headerRow = worksheet.getRow(1);
        const vHeaderLastCol = headerRow.lastColumn?.number ?? headerRow.cellCount ?? 0;
        const headers = Array.from({ length: Math.max(vHeaderLastCol, 1) }, (_, i) => `Spalte${i + 1}`);
        if (headerRow) {
          headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const headerValue = excelCellToPlainString(cell);
            const headerName = (headerValue && headerValue.trim()) || `Spalte${colNumber}`;
            if (colNumber > headers.length) {
              while (headers.length < colNumber) headers.push(`Spalte${headers.length + 1}`);
            }
            headers[colNumber - 1] = headerName;
          });
        }

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const rowData = {};
          const rowDataFormats = {};
          const lastCol = Math.max(headers.length, row.lastColumn?.number ?? row.cellCount ?? 0);
          const rowArray = new Array(lastCol).fill('');
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (colNumber < 1 || colNumber > rowArray.length) return;
            const cellValue = excelCellToPlainString(cell);
            rowArray[colNumber - 1] = cellValue;
            const headerName = headers[colNumber - 1] || `Spalte${colNumber}`;
            rowData[headerName] = cellValue;
            if (cell.font && cell.font.color) {
              const textColor = exceljsColorToHex(cell.font.color);
              if (textColor && textColor !== '#000000') {
                rowDataFormats[headerName] = { textColor };
              }
            }
          });
          const isEmptyRow = rowArray.every((val) => !val || val.toString().trim() === '');
          if (!isEmptyRow) {
            rows.push(
              markVoucherRowTitleMeta({
                row: rowNumber,
                sheet: sheetName,
                sheetIndex: sheetId - 1,
                data: rowArray,
                rowData,
                rowDataFormats,
                columnOrder: headers
              })
            );
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
    const { merged, addedRows, added, skippedDuplicate, previousCount } = mergeVoucherRowsReplaceSheets(
      existingRows,
      rows
    );

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
