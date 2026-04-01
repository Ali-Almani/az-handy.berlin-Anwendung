import User from '../models/User.js';
import { normalizeUserId } from '../utils/normalizeUserId.js';
import * as VoucherManualRequest from '../models/VoucherManualRequest.memory.js';
import { loadJson, saveJson } from '../utils/filePersistence.js';
import { mergeVoucherRowsAppend } from './excel.controller.js';

const VOUCHERS_FILE = 'vouchers.json';

const VOUCHER_ART_OPTIONS = {
  o2_ff: {
    id: 'o2_ff',
    label: 'o2 mit Family and Friends  ( F&F ) Voucher',
    sheet: 'o2 mit Family and Friends  ( F&F ) Voucher'
  },
  ay_ag0: {
    id: 'ay_ag0',
    label: 'Ay Yildiz    AG0- Voucher',
    sheet: 'Ay Yildiz    AG0- Voucher'
  },
  ay_5eur: {
    id: 'ay_5eur',
    label: 'Ay Yildiz    5Euro Rabatt  Voucher',
    sheet: 'Ay Yildiz    5Euro Rabatt  Voucher'
  }
};

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

/** Feld-Personal (nicht Zentrale, nicht Büro/Admin): Voucher-Zeile an Büro vorschlagen */
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
    const { voucherTabId, nummer } = req.body || {};
    const tab = String(voucherTabId || '').trim();
    if (!VoucherManualRequest.isValidTabId(tab)) {
      return res.status(400).json({ success: false, message: 'Ungültige Voucher-Art' });
    }
    const opt = VOUCHER_ART_OPTIONS[tab];
    const userName = currentUser?.name ?? currentUser?.get?.('name') ?? 'Unbekannt';
    const result = VoucherManualRequest.addRequest({
      requesterUserId: userId,
      requesterUserName: userName,
      voucherTabId: tab,
      voucherArtLabel: opt.label,
      nummer
    });
    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }
    emit(req, 'voucherManualRequests:updated', {});
    return res.json({ success: true, message: 'Anfrage an das Büro gesendet', id: result.id });
  } catch (e) {
    next(e);
  }
};

export const getVoucherManualRequests = async (req, res, next) => {
  try {
    const userId = normalizeUserId(req.user?.userId);
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
    next(e);
  }
};

function buildVoucherRowFromRequest(reqRow) {
  const tabId = reqRow.voucher_tab_id;
  const opt = VOUCHER_ART_OPTIONS[tabId];
  if (!opt) return null;
  const nummer = String(reqRow.nummer || '').trim();
  const colArt = 'Voucher Art';
  const colNum = 'Nummer';
  const columnOrder = [colArt, colNum];
  const rowData = {
    [colArt]: opt.label,
    [colNum]: nummer
  };
  const data = [opt.label, nummer];
  const row =
    1000000 +
    Math.floor(Math.random() * 8999999) +
    Number(reqRow.id || 0) * 17;
  return {
    row,
    sheet: opt.sheet,
    sheetIndex: 0,
    data,
    rowData,
    rowDataFormats: {},
    columnOrder
  };
}

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
    return res.json({ success: true, message: 'Anfrage abgelehnt' });
  } catch (e) {
    next(e);
  }
};
