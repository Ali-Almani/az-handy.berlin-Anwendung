import User from '../models/User.js';
import { resolveAuthUserId } from '../utils/normalizeUserId.js';
import * as VoucherManualRequest from '../models/VoucherManualRequest.memory.js';
import { loadJson, saveJson } from '../utils/filePersistence.js';
import { mergeVoucherRowsAppend } from './excel.controller.js';
import { getVoucherTabById, normalizeVoucherTabId } from '../constants/voucherTabs.js';
import { writeAuditLog } from '../utils/auditLog.js';

const VOUCHERS_FILE = 'vouchers.json';

const COL_VOCHER_ART = 'Voucher Art';
const COL_BENUTZER = 'Benutzer';
const COL_NUMMER = 'Nummer';

function roleIsAdmin(role) {
  const r = String(role || '').trim().toLowerCase();
  return r.includes('admin') || String(role || '').trim() === 'Administrator';
}

function isBüroMitarbeiter(role) {
  return String(role || '').trim() === 'Büro Mitarbeiter';
}

function emit(req, event, payload) {
  const io = req.app?.get?.('io');
  if (io) io.emit(event, payload);
}

function userCanProcessRequests(role) {
  return isBüroMitarbeiter(role) || roleIsAdmin(role);
}

/** Eine Liste-Zeile inkl. Spalte Benutzer (Feldpersonal / genehmigte Anfragen). */
function buildVoucherRowFromParts({ voucherTabId, nummer, requesterUserName, rowNumber }) {
  const opt = getVoucherTabById(normalizeVoucherTabId(voucherTabId));
  if (!opt) return null;
  const n = String(nummer ?? '').trim();
  if (!n) return null;
  const benutzer = String(requesterUserName ?? '').trim();
  const columnOrder = [COL_VOCHER_ART, COL_BENUTZER, COL_NUMMER];
  const rowData = {
    [COL_VOCHER_ART]: opt.label,
    [COL_BENUTZER]: benutzer,
    [COL_NUMMER]: n
  };
  const data = [opt.label, benutzer, n];
  return {
    row: Number(rowNumber),
    sheet: opt.sheet,
    sheetIndex: 0,
    data,
    rowData,
    rowDataFormats: {},
    columnOrder,
    isTitleRow: false
  };
}

function parseNummerListe(body) {
  const raw = body || {};
  if (Array.isArray(raw.nummern)) {
    return raw.nummern.map((x) => String(x ?? '').trim()).filter(Boolean);
  }
  const single = String(raw.nummer ?? '').trim();
  if (!single) return [];
  if (single.includes('\n') || single.includes('\r')) {
    return single
      .split(/[\r\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [single];
}

function buildVoucherRowFromRequest(reqRow) {
  const tabId = reqRow.voucher_tab_id;
  const row =
    1000000 +
    Math.floor(Math.random() * 8999999) +
    Number(reqRow.id || 0) * 17;
  return buildVoucherRowFromParts({
    voucherTabId: tabId,
    nummer: reqRow.nummer,
    requesterUserName: reqRow.requester_user_name,
    rowNumber: row
  });
}

/** Feld-Personal (nicht Zentrale, nicht Büro/Admin): Voucher-Zeilen direkt in die gemeinsame Liste eintragen */
export const createVoucherManualRequest = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const currentUser = await User.findByPk(userId);
    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'Benutzer nicht gefunden' });
    }
    const role = currentUser?.role ?? currentUser?.get?.('role') ?? '';
    if (userCanProcessRequests(role)) {
      return res.status(403).json({
        success: false,
        message: 'Büro und Administratoren legen Voucher direkt über die Excel-Liste an.'
      });
    }
    const ort = String(
      currentUser?.einsatz_ort ?? currentUser?.get?.('einsatz_ort') ?? ''
    ).trim();
    if (ort === 'Zentrale') {
      return res.status(403).json({
        success: false,
        message: 'Für den Einsatzort Zentrale ist diese Funktion nicht vorgesehen.'
      });
    }
    const { voucherTabId } = req.body || {};
    const tab = normalizeVoucherTabId(voucherTabId);
    if (!VoucherManualRequest.isValidTabId(tab)) {
      return res.status(400).json({ success: false, message: 'Ungültige Voucher-Art' });
    }
    const nums = parseNummerListe(req.body);
    if (nums.length === 0) {
      return res.status(400).json({ success: false, message: 'Mindestens eine Nummer angeben.' });
    }
    const userName = currentUser?.name ?? currentUser?.get?.('name') ?? 'Unbekannt';
    const rowBase =
      1_900_000 +
      (Math.floor(Date.now() / 1000) % 500_000) * 97 +
      (Number(userId) || 0) * 41;
    const newRows = nums
      .map((nummer, idx) =>
        buildVoucherRowFromParts({
          voucherTabId: tab,
          nummer,
          requesterUserName: userName,
          rowNumber: rowBase + idx * 13
        })
      )
      .filter(Boolean);
    if (newRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Keine gültigen Voucher-Zeilen.' });
    }
    const vdata = loadJson(VOUCHERS_FILE) || {};
    const existingRows = Array.isArray(vdata.rows) ? vdata.rows : [];
    const { merged, added, skippedDuplicate } = mergeVoucherRowsAppend(existingRows, newRows);
    if (added === 0) {
      return res.status(409).json({
        success: false,
        message:
          skippedDuplicate > 0
            ? 'Alle angegebenen Nummern sind bereits in der Liste.'
            : 'Voucher konnten nicht hinzugefügt werden.',
        added: 0,
        skippedDuplicate
      });
    }
    saveJson(VOUCHERS_FILE, {
      ...vdata,
      rows: merged,
      updatedAt: new Date().toISOString(),
      updatedByUserId: userId
    });
    emit(req, 'vouchers:updated', {});
    const msgParts = [`${added} Voucher eingetragen`];
    if (skippedDuplicate > 0) {
      msgParts.push(`${skippedDuplicate} übersprungen (bereits vorhanden)`);
    }
    return res.json({
      success: true,
      message: msgParts.join('. ') + '.',
      added,
      skippedDuplicate,
      skippedInvalid: nums.length - newRows.length
    });
  } catch (e) {
    next(e);
  }
};

export const getVoucherManualRequests = async (req, res, next) => {
  try {
    const userId = resolveAuthUserId(req.user);
    if (userId == null) {
      return res.status(401).json({ success: false, message: 'Nicht angemeldet' });
    }
    const currentUser = await User.findByPk(userId);
    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'Benutzer nicht gefunden' });
    }
    const role = currentUser?.role ?? currentUser?.get?.('role') ?? '';
    if (!userCanProcessRequests(role)) {
      return res.status(403).json({
        success: false,
        message: 'Nur Büro Mitarbeiter und Administratoren sehen offene Voucher-Anfragen.'
      });
    }
    let pending = [];
    try {
      pending = VoucherManualRequest.getPendingRequests();
    } catch (err) {
      console.error('getVoucherManualRequests getPendingRequests:', err);
    }
    const list = (Array.isArray(pending) ? pending : []).map((r) => ({
      id: r?.id,
      requester_user_name: r?.requester_user_name ?? '',
      voucher_art_label: r?.voucher_art_label ?? '',
      voucher_tab_id: r?.voucher_tab_id ?? '',
      nummer: r?.nummer ?? '',
      created_at: r?.created_at ?? null
    }));
    return res.json({ success: true, requests: list });
  } catch (e) {
    console.error('getVoucherManualRequests uncaught:', e);
    return res.json({ success: true, requests: [] });
  }
};

export const approveVoucherManualRequest = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const currentUser = await User.findByPk(userId);
    const role = currentUser?.role ?? currentUser?.get?.('role') ?? '';
    if (!userCanProcessRequests(role)) {
      return res.status(403).json({ success: false, message: 'Keine Berechtigung' });
    }
    const { id } = req.params;
    const pending = VoucherManualRequest.getRequestById(id);
    if (!pending || pending.status !== 'pending') {
      return res.status(404).json({ success: false, message: 'Anfrage nicht gefunden oder bereits bearbeitet' });
    }
    const newRow = buildVoucherRowFromRequest(pending);
    if (!newRow) {
      return res.status(500).json({ success: false, message: 'Interner Fehler: Voucher-Zeile' });
    }
    const vdata = loadJson(VOUCHERS_FILE) || {};
    const existingRows = Array.isArray(vdata.rows) ? vdata.rows : [];
    const { merged, added, skippedDuplicate } = mergeVoucherRowsAppend(existingRows, [newRow]);
    if (added === 0) {
      return res.status(409).json({
        success: false,
        message:
          skippedDuplicate > 0
            ? 'Diese Voucher-Nummer ist bereits in der Liste.'
            : 'Voucher konnte nicht hinzugefügt werden.'
      });
    }
    saveJson(VOUCHERS_FILE, {
      ...vdata,
      rows: merged,
      updatedAt: new Date().toISOString(),
      updatedByUserId: userId
    });
    VoucherManualRequest.markApproved(id, userId);
    emit(req, 'vouchers:updated', {});
    emit(req, 'voucherManualRequests:updated', {});
    writeAuditLog(req, {
      category: 'voucher',
      action: 'voucher.request.approve',
      summary: `Voucher-Anfrage genehmigt: ${pending.nummer ?? id}`,
      meta: { requestId: id, nummer: pending.nummer }
    });
    return res.json({ success: true, message: 'Voucher wurde in der Liste eingetragen' });
  } catch (e) {
    next(e);
  }
};

export const rejectVoucherManualRequest = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const currentUser = await User.findByPk(userId);
    const role = currentUser?.role ?? currentUser?.get?.('role') ?? '';
    if (!userCanProcessRequests(role)) {
      return res.status(403).json({ success: false, message: 'Keine Berechtigung' });
    }
    const { id } = req.params;
    const pending = VoucherManualRequest.getRequestById(id);
    if (!pending || pending.status !== 'pending') {
      return res.status(404).json({ success: false, message: 'Anfrage nicht gefunden oder bereits bearbeitet' });
    }
    VoucherManualRequest.markRejected(id, userId);
    emit(req, 'voucherManualRequests:updated', {});
    writeAuditLog(req, {
      category: 'voucher',
      action: 'voucher.request.reject',
      summary: `Voucher-Anfrage abgelehnt: ${pending.nummer ?? id}`,
      meta: { requestId: id, nummer: pending.nummer }
    });
    return res.json({ success: true, message: 'Anfrage abgelehnt' });
  } catch (e) {
    next(e);
  }
};
