import ImeisUserData from '../models/ImeisUserData.js';
import User from '../models/User.js';
import { normalizeUserId, coerceUserId } from './normalizeUserId.js';
import { normalizeImeiKey, canonicalImeiString, imeiKeyFromRowId } from './imeiKey.js';

function parseImeisJsonArray(imeisJson) {
  try {
    if (Array.isArray(imeisJson)) return imeisJson;
    return imeisJson ? JSON.parse(String(imeisJson)) : [];
  } catch (_) {
    return [];
  }
}

function applyProductHintToImeiRow(item, productHint) {
  const product = String(productHint ?? '').trim();
  if (!product || product === '-') return item;
  const next = { ...item, product };
  const baseRowData =
    next.rowData && typeof next.rowData === 'object' && !Array.isArray(next.rowData) ? { ...next.rowData } : {};
  const order =
    Array.isArray(next.columnOrder) && next.columnOrder.length > 0
      ? next.columnOrder
      : Object.keys(baseRowData);
  let applied = false;
  for (const key of order) {
    if (!key) continue;
    const lk = String(key).toLowerCase().trim();
    if (lk === 'produkt' || lk === 'product' || lk.includes('produkt') || lk.includes('product')) {
      baseRowData[key] = product;
      applied = true;
      break;
    }
  }
  if (!applied) {
    baseRowData.Produkt = product;
    const columnOrder = Array.isArray(next.columnOrder) ? [...next.columnOrder] : [];
    if (!columnOrder.includes('Produkt')) columnOrder.push('Produkt');
    next.columnOrder = columnOrder;
  }
  next.rowData = baseRowData;
  return next;
}

/** User-ID der gemeinsamen IMEI-Master-Liste (Admin bevorzugt). */
export async function getSharedImeiOwnerId() {
  try {
    const admin = await User.findOne({ where: { email: 'admin@az-handy.berlin' } });
    const adminId = coerceUserId(admin?.id ?? admin?._id ?? admin?.get?.('id'));
    if (adminId != null) {
      const row = await ImeisUserData.findOne({ where: { user_id: adminId } });
      const imeisJson = (row?.get && row.get('imeis_json')) ?? row?.imeis_json;
      const arr = parseImeisJsonArray(imeisJson);
      if (Array.isArray(arr) && arr.length > 0) return adminId;
    }
  } catch (_) {
    // fallback below
  }

  const all = await ImeisUserData.findAll();
  let best = null;
  let bestCount = 0;
  let bestIsBueroOrAdmin = false;
  for (const row of all) {
    const imeisJson = (row.get && row.get('imeis_json')) ?? row.imeis_json;
    const rowUserId = (row.get && row.get('user_id')) ?? row.user_id;
    const arr = parseImeisJsonArray(imeisJson);
    if (!Array.isArray(arr) || arr.length === 0) continue;
    let user;
    try {
      user = await User.findByPk(rowUserId);
    } catch {
      continue;
    }
    const roleRaw = user?.role ?? user?.get?.('role') ?? '';
    const roleStr = typeof roleRaw === 'string' ? roleRaw : String(roleRaw || '');
    const isBueroOrAdmin =
      roleStr.trim() === 'Büro Mitarbeiter' || roleStr.toLowerCase().includes('admin');
    const count = arr.length;
    const replace = count > bestCount || (count === bestCount && isBueroOrAdmin && !bestIsBueroOrAdmin);
    if (replace) {
      bestCount = count;
      best = normalizeUserId(rowUserId) ?? rowUserId;
      bestIsBueroOrAdmin = isBueroOrAdmin;
    }
  }
  if (best != null) {
    const nb = normalizeUserId(best);
    return nb != null ? nb : best;
  }
  const admin = await User.findOne({ where: { email: 'admin@az-handy.berlin' } });
  return coerceUserId(admin?.id ?? admin?._id ?? admin?.get?.('id')) ?? null;
}

export async function getSharedOwnerImeiKeySet() {
  const ownerId = await getSharedImeiOwnerId();
  if (ownerId == null) return new Set();
  const row = await ImeisUserData.findOne({ where: { user_id: ownerId } });
  const arr = parseImeisJsonArray((row?.get && row.get('imeis_json')) ?? row?.imeis_json);
  const set = new Set();
  for (const item of arr) {
    const k = normalizeImeiKey(item?.imei);
    if (k) set.add(k);
  }
  return set;
}

/** Letzte gespeicherte Zeile zu einer IMEI (z. B. noch in Kopie eines anderen Nutzers). */
export async function findImeiRowSnapshotAcrossUsers(imeiRaw) {
  const imeiKey = normalizeImeiKey(imeiRaw);
  if (!imeiKey) return null;
  let best = null;
  let bestScore = -1;
  const all = await ImeisUserData.findAll();
  for (const row of all) {
    const imeisJson = (row.get && row.get('imeis_json')) ?? row.imeis_json;
    const arr = parseImeisJsonArray(imeisJson);
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (normalizeImeiKey(item?.imei) !== imeiKey) continue;
      const score = item?.rowData && typeof item.rowData === 'object' ? Object.keys(item.rowData).length : 0;
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }
  }
  return best ? JSON.parse(JSON.stringify(best)) : null;
}

/** Row-Actions zur IMEI bei allen Benutzern entfernen (Verlauf-Synthese / Hide). */
export async function clearRowActionsForImeiAllUsers(imeiToRemove) {
  const removeKey = normalizeImeiKey(imeiToRemove);
  if (!removeKey) return false;
  let changed = false;
  const all = await ImeisUserData.findAll();
  for (const row of all) {
    const rowActionsJson = (row.get && row.get('row_actions_json')) ?? row.row_actions_json;
    const rowUserId = (row.get && row.get('user_id')) ?? row.user_id;
    let rowActions = {};
    try {
      rowActions = rowActionsJson ? JSON.parse(rowActionsJson) : {};
    } catch (_) {}
    let hadRowAction = false;
    Object.keys(rowActions).forEach((rowId) => {
      const rk = normalizeImeiKey(imeiKeyFromRowId(rowId));
      if (rk === removeKey) {
        delete rowActions[rowId];
        hadRowAction = true;
      }
    });
    if (hadRowAction) {
      changed = true;
      await ImeisUserData.upsert({ user_id: rowUserId, row_actions_json: JSON.stringify(rowActions) });
    }
  }
  return changed;
}

/** IMEI wieder in die gemeinsame Master-Liste (wurde beim Kopieren entfernt). */
export async function restoreImeiToSharedOwnerList(imeiRaw, { productHint, rowTemplate = null } = {}) {
  const imeiKey = normalizeImeiKey(imeiRaw);
  if (!imeiKey) return { ok: false, reason: 'invalid_imei' };
  const ownerId = await getSharedImeiOwnerId();
  if (ownerId == null) return { ok: false, reason: 'no_owner' };
  const [ownerRow] = await ImeisUserData.findOrCreate({
    where: { user_id: ownerId },
    defaults: { cell_colors_json: '{}', row_actions_json: '{}', copy_history_json: '[]', copy_timestamps_json: '[]' }
  });
  const imeisJson = (ownerRow.get && ownerRow.get('imeis_json')) ?? ownerRow.imeis_json;
  let arr = parseImeisJsonArray(imeisJson);
  if (!Array.isArray(arr)) arr = [];
  if (arr.some((item) => normalizeImeiKey(item?.imei) === imeiKey)) {
    return { ok: true, reason: 'already_present', ownerId };
  }

  let template =
    rowTemplate && typeof rowTemplate === 'object'
      ? JSON.parse(JSON.stringify(rowTemplate))
      : await findImeiRowSnapshotAcrossUsers(imeiRaw);
  const nowIso = new Date().toISOString();
  let maxRow = 0;
  for (const item of arr) {
    const r = Number(item?.row);
    if (Number.isFinite(r) && r > maxRow) maxRow = r;
  }
  const sheetDefault = arr.find((i) => i?.sheet)?.sheet || 'default';
  if (!template) {
    template = {
      sheet: sheetDefault,
      imei: canonicalImeiString(imeiRaw),
      row: maxRow + 1,
      rowData: {},
      columnOrder: Array.isArray(arr[0]?.columnOrder) ? [...arr[0].columnOrder] : []
    };
  } else {
    template = {
      ...template,
      imei: canonicalImeiString(template.imei != null ? template.imei : imeiRaw),
      sheet: template.sheet || sheetDefault,
      row: template.row != null ? template.row : maxRow + 1
    };
  }
  template = applyProductHintToImeiRow(template, productHint);
  template._restoredAt = nowIso;
  arr.push(template);
  await ImeisUserData.upsert({ user_id: ownerId, imeis_json: JSON.stringify(arr) });
  return { ok: true, reason: 'restored', ownerId };
}
