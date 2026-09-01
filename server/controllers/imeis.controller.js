import { Op, fn, col, where as sqlWhere } from 'sequelize';
import ImeisUserData from '../models/ImeisUserData.js';
import User from '../models/User.js';
import { normalizeUserId, resolveAuthUserId, coerceUserId } from '../utils/normalizeUserId.js';
import * as ImeiReminder from '../models/ImeiReminder.memory.js';
import * as ExtraCopyRequest from '../models/ExtraCopyRequest.memory.js';
import * as ExtraCopyNotification from '../models/ExtraCopyNotification.memory.js';
import * as ReminderResponseNotification from '../models/ReminderResponseNotification.memory.js';
import {
  isMitarbeiterShop,
  isTeamleiterShop,
  isBüroMitarbeiter,
  getUserRole,
  isAdmin
} from '../utils/imeiOfficeRoles.js';
import { normalizeEinsatzOrtKey } from '../constants/einsatzorte.js';
import { getSonderPublishedEntries, addSonderImeiApprovals, normalizeSonderImeiKey } from '../utils/sonderImeiStore.js';
import {
  addAcceptedImeiEntry,
  getAcceptedImeiKeySet,
  listAcceptedImeis,
  listAcceptedImeisForDisplay,
  permanentlyDeleteAcceptedEntry,
  permanentlyDeleteAcceptedEntriesByIds,
  permanentlyDeleteAcceptedEntriesInRange
} from '../utils/acceptedImeiStore.js';
import { writeAuditLog } from '../utils/auditLog.js';
import * as redisCache from '../utils/redisCache.js';
import { getImeiDeleteAllEnabled } from '../utils/imeiSettings.js';
import {
  normalizeImeiKey,
  canonicalImeiString,
  collectImeiKeysFromUploadRow,
  imeiKeyFromRowId,
  buildImeiRowId
} from '../utils/imeiKey.js';
import {
  buildImeiProductLookup,
  enrichCopyHistoryWithProducts,
  isEmptyHistoryProduct
} from '../utils/imeiProductLookup.js';
import {
  COPY_HISTORY_RETENTION_MS,
  copyHistoryEntryKey,
  copyHistorySlotKey,
  mergeCopyHistoryEntries,
  dedupeCopyHistoryByImeiUser,
  trimCopyHistoryByRetention,
  parseCopyHistoryTimestamp
} from '../utils/copyHistoryRetention.js';

const MERGED_COPY_HISTORY_CACHE_KEY = 'imeis:mergedCopyHistory';
const MERGED_COPY_HISTORY_TTL = 30;
const USER_DATA_CACHE_PREFIX = 'imeis:userData:';
const USER_DATA_CACHE_TTL = 20;

const userDataCacheKey = (userId) => `${USER_DATA_CACHE_PREFIX}${userId}`;

async function invalidateImeisCaches(userId, { sharedListChanged = false } = {}) {
  await redisCache.del(MERGED_COPY_HISTORY_CACHE_KEY);
  if (sharedListChanged) {
    await redisCache.delPattern(`${USER_DATA_CACHE_PREFIX}*`);
    return;
  }
  if (userId != null) {
    await redisCache.del(userDataCacheKey(userId));
  }
}

const USE_MEMORY_DB = process.env.USE_MEMORY_DB === 'true' ||
  (!process.env.DATABASE_URL && !process.env.PG_DATABASE && !process.env.PG_USER);

const normHistUserName = (s) =>
  String(s || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

async function editorFromReqAsync(req) {
  const userId = resolveAuthUserId(req.user);
  let userName = String(req.user?.name ?? req.user?.userName ?? '').trim();
  const email = String(req.user?.email ?? '').trim();
  if (userId) {
    try {
      const u = await User.findByPk(userId);
      const dbName = String(u?.name ?? u?.get?.('name') ?? '').trim();
      if (dbName) userName = dbName;
    } catch (_) {}
  }
  if (!userName) userName = email || 'Unbekannt';
  return { userId, name: userName, userName, email };
}

/** Verlauf „Benutzer“ wie im gemischten Modal – exakt, Groß/klein, Mehrfach-Leerzeichen */
async function resolveTargetUserByName(rawName) {
  const t = String(rawName || '').trim().replace(/\s+/g, ' ');
  if (!t) return null;
  let u = await User.findOne({ where: { name: t } });
  if (u) return u;
  
  const tLow = t.toLowerCase();
  if (USE_MEMORY_DB) {
    const all = await User.findAll({});
    return all.find((x) => normHistUserName(x.name) === tLow) ?? null;
  }
  try {
    const byLower = await User.findOne({
      where: sqlWhere(fn('LOWER', fn('BTRIM', col('name'))), tLow)
    });
    if (byLower) return byLower;
  } catch (_) {}
  return await User.findOne({ where: { name: { [Op.iLike]: t } } });
}

/** Abgelehnt (Büro): Eintrag in jedem copy_history_json mit gleicher IMEI + gleichem Anzeigenamen entfernen */
const removeCopyHistoryEntriesForImeiAndDisplayName = async (imeiRaw, displayNameRaw) => {
  const imeiStr = String(imeiRaw || '').trim();
  const want = normHistUserName(displayNameRaw);
  if (!imeiStr || !want) return;
  const all = await ImeisUserData.findAll();
  for (const row of all) {
    const rowUserId = (row.get && row.get('user_id')) ?? row.user_id;
    const historyJson = (row.get && row.get('copy_history_json')) ?? row.copy_history_json;
    let arr = [];
    try {
      arr = historyJson ? JSON.parse(historyJson) : [];
    } catch (_) {}
    if (!Array.isArray(arr)) continue;
    const next = arr.filter((e) => {
      if (!e) return true;
      if (String(e.imei || '').trim() !== imeiStr) return true;
      return normHistUserName(e.userName) !== want;
    });
    if (next.length === arr.length) continue;
    await ImeisUserData.upsert({
      user_id: rowUserId,
      copy_history_json: JSON.stringify(next)
    });
  }
};

/** Abgelehnt (robust): Eintrag in jedem copy_history_json mit gleicher IMEI + gleichem Timestamp entfernen */
const removeCopyHistoryEntriesForImeiAndTimestamp = async (imeiRaw, tsRaw) => {
  const imeiStr = String(imeiRaw || '').trim();
  const ts = String(tsRaw || '').trim();
  if (!imeiStr || !ts) return;
  const all = await ImeisUserData.findAll();
  for (const row of all) {
    const rowUserId = (row.get && row.get('user_id')) ?? row.user_id;
    const historyJson = (row.get && row.get('copy_history_json')) ?? row.copy_history_json;
    let arr = [];
    try {
      arr = historyJson ? JSON.parse(historyJson) : [];
    } catch (_) {}
    if (!Array.isArray(arr)) continue;
    const next = arr.filter((e) => {
      if (!e) return true;
      if (String(e.imei || '').trim() !== imeiStr) return true;
      return String(e.timestamp || '').trim() !== ts;
    });
    if (next.length === arr.length) continue;
    await ImeisUserData.upsert({
      user_id: rowUserId,
      copy_history_json: JSON.stringify(next)
    });
  }
};

/** Prüft, ob der Nutzer diesen Verlaufseintrag wirklich besitzt (IMEI+Timestamp) */
const userOwnsCopyHistoryEntry = async (userIdRaw, imeiRaw, tsRaw) => {
  const uid = coerceUserId(userIdRaw);
  const imeiStr = String(imeiRaw || '').trim();
  const ts = String(tsRaw || '').trim();
  if (uid == null || !imeiStr || !ts) return false;
  const row = await ImeisUserData.findOne({ where: { user_id: uid } });
  if (!row) return false;
  const historyJson = (row.get && row.get('copy_history_json')) ?? row.copy_history_json;
  let arr = [];
  try {
    arr = historyJson ? JSON.parse(historyJson) : [];
  } catch (_) {
    arr = [];
  }
  if (!Array.isArray(arr)) return false;
  return arr.some((e) =>
    e &&
    String(e.imei || '').trim() === imeiStr &&
    String(e.timestamp || '').trim() === ts
  );
};

/** ID aus Sequelize-/Memory-User zuverlässig lesen (für isSelf) */
const entityUserId = (u) =>
  coerceUserId(
    u?.id ?? u?._id ?? u?.get?.('id') ?? u?.dataValues?.id
  );

/** Admin-Fallback: E-Mail (wie Client), falls Rolle falsch/leer ist */
const isAdminUserEntity = (user) => {
  const role = getUserRole(user);
  if (isAdmin(role)) return true;
  const email = String(user?.email ?? user?.get?.('email') ?? '').trim().toLowerCase();
  return email === 'admin@az-handy.berlin';
};
/** Alle Benutzer sehen die gemeinsame IMEI-Liste (von Büro/Admin hochgeladen) */
const shouldUseSharedImeiData = () => true;

function shouldUseMergedOfficeCopyHistory(role) {
  return isBüroMitarbeiter(role) || isAdmin(role);
}

function copyHistoryEntryInOfficeWindow(entry, sinceMs = Date.now() - COPY_HISTORY_RETENTION_MS) {
  const ts = parseCopyHistoryTimestamp(entry);
  if (Number.isNaN(ts)) return true;
  return ts >= sinceMs;
}

function finalizeOfficeCopyHistory(merged) {
  if (
    process.env.COPY_HISTORY_OFFICE_SHOW_ALL === 'true' ||
    process.env.COPY_HISTORY_OFFICE_SHOW_ALL === '1'
  ) {
    return dedupeCopyHistoryByImeiUser([...merged]).sort(
      (a, b) => (parseCopyHistoryTimestamp(b) || 0) - (parseCopyHistoryTimestamp(a) || 0)
    );
  }
  return trimCopyHistoryByRetention(dedupeCopyHistoryByImeiUser(merged));
}

function copyHistoryFromRowActions(rowActions, userName, rowUserId, productLookup) {
  const out = [];
  if (!rowActions || typeof rowActions !== 'object' || Array.isArray(rowActions)) return out;
  for (const [rowId, act] of Object.entries(rowActions)) {
    if (!act || typeof act !== 'object') continue;
    const action = String(act.action || '').trim();
    if (action !== 'reservieren' && action !== 'dereserviert' && action !== 'checkout') continue;
    const imei = imeiKeyFromRowId(rowId);
    if (!imei) continue;
    const ts = String(act.timestamp || '').trim() || new Date().toISOString();
    if (!copyHistoryEntryInOfficeWindow({ timestamp: ts })) continue;
    let product = String(act.product ?? '').trim();
    if (isEmptyHistoryProduct(product) && productLookup?.get) {
      product = productLookup.get(normalizeImeiKey(imei)) || '-';
    }
    if (isEmptyHistoryProduct(product)) product = '-';
    out.push({
      imei,
      product,
      action,
      timestamp: ts,
      userName: String(act.userName || userName || '').trim() || userName,
      historyOwnerUserId: rowUserId
    });
  }
  return out;
}

function lookupWithRowActionProducts(imeis, rowActions) {
  const lookup = buildImeiProductLookup(imeis);
  if (!rowActions || typeof rowActions !== 'object' || Array.isArray(rowActions)) return lookup;
  for (const [rowId, act] of Object.entries(rowActions)) {
    const p = String(act?.product || '').trim();
    if (!p || p === '-') continue;
    const k = normalizeImeiKey(imeiKeyFromRowId(rowId));
    if (k && !lookup.has(k)) lookup.set(k, p);
  }
  return lookup;
}

async function resolveCopyHistoryForSave(userId, incomingCopyHistory) {
  if (!Array.isArray(incomingCopyHistory)) return [];
  const [ownData] = await ImeisUserData.findOrCreate({
    where: { user_id: userId },
    defaults: { cell_colors_json: '{}', row_actions_json: '{}', copy_history_json: '[]', copy_timestamps_json: '[]' }
  });
  const existingRaw = (ownData.get && ownData.get('copy_history_json')) ?? ownData.copy_history_json;
  let existing = [];
  try {
    existing = existingRaw ? JSON.parse(existingRaw) : [];
  } catch (_) {
    existing = [];
  }
  if (!Array.isArray(existing)) existing = [];
  return mergeCopyHistoryEntries(existing, incomingCopyHistory);
}

/** Einsatzort/Standort-Key normalisieren (Legacy-Kurznamen und Straßennamen) */
const safeJsonParse = (raw, fallback) => {
  try {
    if (raw == null || raw === '') return fallback;
    if (Array.isArray(fallback) && Array.isArray(raw)) return raw;
    if (
      typeof fallback === 'object' &&
      fallback !== null &&
      !Array.isArray(fallback) &&
      typeof raw === 'object' &&
      raw !== null &&
      !Array.isArray(raw)
    ) {
      return raw;
    }
    const str = typeof raw === 'string' ? raw : JSON.stringify(raw);
    const v = JSON.parse(str);
    if (Array.isArray(fallback) && !Array.isArray(v)) return fallback;
    if (
      typeof fallback === 'object' &&
      fallback !== null &&
      !Array.isArray(fallback) &&
      (typeof v !== 'object' || v === null || Array.isArray(v))
    ) {
      return fallback;
    }
    return v;
  } catch {
    return fallback;
  }
};

/** Merge copy_history (+ rowActions-Fallback) aus User-Zeilen für Verlauf */
async function collectMergedCopyHistoryFromRows(rows) {
  const productLookup = await loadSharedImeiProductLookup();
  const merged = [];
  const seenKeys = new Set();
  for (const row of rows) {
    const rowUserId = (row.get && row.get('user_id')) ?? row.user_id;
    let rowUserName = '';
    if (rowUserId != null) {
      try {
        const u = await User.findByPk(rowUserId);
        rowUserName = String(u?.name ?? u?.get?.('name') ?? '').trim();
      } catch (_) {}
    }
    const pushEntry = (e, fallbackUserName) => {
      if (!e || (!e.imei && !e.timestamp)) return;
      const userName = e.userName || fallbackUserName;
      const entry = { ...e, userName, historyOwnerUserId: rowUserId };
      const key = copyHistoryEntryKey(entry);
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      merged.push(entry);
    };
    const historyJson = (row.get && row.get('copy_history_json')) ?? row.copy_history_json;
    if (historyJson) {
      try {
        const arr = JSON.parse(historyJson);
        if (Array.isArray(arr)) {
          for (const e of arr) pushEntry(e, rowUserName);
        }
      } catch (_) {}
    }
    const rowActionsJson = (row.get && row.get('row_actions_json')) ?? row.row_actions_json;
    if (rowActionsJson) {
      try {
        const rowActions = JSON.parse(rowActionsJson);
        for (const e of copyHistoryFromRowActions(rowActions, rowUserName, rowUserId, productLookup)) {
          pushEntry(e, rowUserName);
        }
      } catch (_) {}
    }
  }
  return finalizeOfficeCopyHistory(enrichCopyHistoryWithProducts(merged, productLookup));
}

/** Merge copy_history aus allen Benutzern für Verlauf (Büro/Admin: letzte 4 Tage) */
const computeMergedCopyHistory = async () => {
  const all = await ImeisUserData.findAll();
  return collectMergedCopyHistoryFromRows(all);
};

const getMergedCopyHistory = async () => {
  const cached = await redisCache.get(MERGED_COPY_HISTORY_CACHE_KEY);
  if (cached != null) return cached;
  const merged = await computeMergedCopyHistory();
  await redisCache.set(MERGED_COPY_HISTORY_CACHE_KEY, merged, MERGED_COPY_HISTORY_TTL);
  return merged;
};

/** Merge copy_history nur von Benutzern mit gleichem einsatz_ort (Teamleiter shop sieht Verlauf seiner Kategorie) */
const getCopyHistoryForEinsatzOrt = async (einsatzOrt) => {
  if (!einsatzOrt || typeof einsatzOrt !== 'string') return [];
  const targetKey = normalizeEinsatzOrtKey(einsatzOrt);
  if (!targetKey) return [];

  let usersInCategory = [];
  const allUsers = await User.findAll({ attributes: ['id', 'einsatz_ort'] });
  usersInCategory = (allUsers || []).filter((u) => {
    const ortRaw = u?.einsatz_ort ?? u?.get?.('einsatz_ort') ?? '';
    const ort = normalizeEinsatzOrtKey(ortRaw);
    return ort && ort === targetKey;
  });

  // IDs können in PostgreSQL UUIDs sein (nicht nur Integer). Daher NICHT auf Number() filtern/casten.
  const ids = [
    ...new Set(
      (usersInCategory || [])
        .map((u) => coerceUserId(u?.id ?? u?.get?.('id')))
        .filter((id) => id != null && String(id).trim() !== '')
        .map((id) => String(id))
    )
  ];
  if (ids.length === 0) return [];
  const all = await ImeisUserData.findAll({
    where: { user_id: { [Op.in]: ids } }
  });
  return collectMergedCopyHistoryFromRows(all);
};

/** Verlauf (copy_history) zu dieser IMEI bei allen Benutzern löschen – nötig für gemergten Büro-Verlauf */
const removeImeiFromAllCopyHistories = async (imeiToRemove) => {
  const imeiStr = String(imeiToRemove || '').trim();
  if (!imeiStr) return;
  const all = await ImeisUserData.findAll();
  for (const row of all) {
    const rowUserId = (row.get && row.get('user_id')) ?? row.user_id;
    const historyJson = (row.get && row.get('copy_history_json')) ?? row.copy_history_json;
    let arr = [];
    try {
      arr = historyJson ? JSON.parse(historyJson) : [];
    } catch (_) {}
    if (!Array.isArray(arr)) continue;
    const next = arr.filter((e) => !e || String(e.imei || '').trim() !== imeiStr);
    if (next.length === arr.length) continue;
    await ImeisUserData.upsert({
      user_id: rowUserId,
      copy_history_json: JSON.stringify(next)
    });
  }
};

/** Entfernt ein IMEI aus allen Benutzer-IMEI-Listen (sichtbar für alle Rollen) */
const removeImeiFromAllLists = async (imeiToRemove) => {
  const removeKey = normalizeImeiKey(imeiToRemove);
  if (!removeKey) return;
  const all = await ImeisUserData.findAll();
  for (const row of all) {
    const imeisJson = (row.get && row.get('imeis_json')) ?? row.imeis_json;
    const rowActionsJson = (row.get && row.get('row_actions_json')) ?? row.row_actions_json;
    const rowUserId = (row.get && row.get('user_id')) ?? row.user_id;
    let arr = [];
    try {
      arr = imeisJson ? JSON.parse(imeisJson) : [];
    } catch (_) {}
    let rowActions = {};
    try {
      rowActions = rowActionsJson ? JSON.parse(rowActionsJson) : {};
    } catch (_) {}
    const filtered = Array.isArray(arr)
      ? arr.filter((item) => normalizeImeiKey(item?.imei) !== removeKey)
      : [];
    let hadRowAction = false;
    Object.keys(rowActions).forEach((rowId) => {
      const rk = normalizeImeiKey(imeiKeyFromRowId(rowId));
      if (rk === removeKey) {
        delete rowActions[rowId];
        hadRowAction = true;
      }
    });
    const imeisChanged = Array.isArray(arr) && filtered.length !== arr.length;
    if (imeisChanged || hadRowAction) {
      const upsertPayload = { user_id: rowUserId };
      if (imeisChanged) upsertPayload.imeis_json = JSON.stringify(filtered);
      if (hadRowAction) upsertPayload.row_actions_json = JSON.stringify(rowActions);
      await ImeisUserData.upsert(upsertPayload);
    }
  }
  await removeImeiFromAllCopyHistories(imeiToRemove);
};

/** Findet die User-ID, von der IMEI-Daten für Mitarbeiter geladen werden. Bevorzugt Büro/Admin bei gleicher Anzahl. */
const getSharedImeiOwnerId = async () => {
  // Fix: In PostgreSQL soll die "gemeinsame" IMEI-Liste stabil vom Admin-Account kommen,
  // sonst springt der Owner je nach IMEI-Anzahl zwischen Benutzern (z.B. User 38 statt Admin 42).
  // Wenn admin@az-handy.berlin IMEIs hat, immer diese ID verwenden.
  try {
    const admin = await User.findOne({ where: { email: 'admin@az-handy.berlin' } });
    const adminId = coerceUserId(admin?.id ?? admin?._id ?? admin?.get?.('id'));
    if (adminId != null) {
      const row = await ImeisUserData.findOne({ where: { user_id: adminId } });
      const imeisJson = (row?.get && row.get('imeis_json')) ?? row?.imeis_json;
      let arr = [];
      try {
        if (Array.isArray(imeisJson)) arr = imeisJson;
        else arr = imeisJson ? JSON.parse(String(imeisJson)) : [];
      } catch (_) {
        arr = [];
      }
      if (Array.isArray(arr) && arr.length > 0) return adminId;
    }
  } catch (_) {
    // fallback to heuristic below
  }

  const all = await ImeisUserData.findAll();
  let best = null;
  let bestCount = 0;
  let bestIsBueroOrAdmin = false;
  for (const row of all) {
    const imeisJson = (row.get && row.get('imeis_json')) ?? row.imeis_json;
    const rowUserId = (row.get && row.get('user_id')) ?? row.user_id;
    let arr = [];
    try {
      if (Array.isArray(imeisJson)) arr = imeisJson;
      else if (imeisJson && typeof imeisJson === 'object') arr = [];
      else arr = imeisJson ? JSON.parse(String(imeisJson)) : [];
    } catch (_) {
      arr = [];
    }
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
};

async function loadSharedImeiProductLookup() {
  const map = new Map();
  const mergeFromJson = (imeisJson) => {
    const imeis = safeJsonParse(imeisJson, []);
    const partial = buildImeiProductLookup(Array.isArray(imeis) ? imeis : []);
    for (const [k, v] of partial) {
      if (k && v && !map.has(k)) map.set(k, v);
    }
  };
  try {
    const ownerId = await getSharedImeiOwnerId();
    if (ownerId != null) {
      const row = await ImeisUserData.findOne({ where: { user_id: ownerId } });
      mergeFromJson((row?.get && row.get('imeis_json')) ?? row?.imeis_json);
    }
  } catch (_) {}
  try {
    const all = await ImeisUserData.findAll();
    for (const row of all) {
      mergeFromJson((row.get && row.get('imeis_json')) ?? row.imeis_json);
    }
  } catch (_) {}
  return map;
}

export const getImeisData = async (req, res, next) => {
  try {
    const userId = resolveAuthUserId(req.user);
    if (userId == null) {
      return res.status(401).json({ success: false, message: 'Nicht angemeldet' });
    }
    const currentUser = await User.findByPk(userId);
    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'Benutzer nicht gefunden' });
    }
    const role = getUserRole(currentUser);
    const debugEnabled = String(req.query?.debug || '') === '1';
    const debug = debugEnabled ? {
      userId: String(userId),
      role: String(role ?? ''),
      einsatz_ort: currentUser?.einsatz_ort ?? currentUser?.get?.('einsatz_ort') ?? null
    } : null;

    if (!debugEnabled) {
      const cachedResponse = await redisCache.get(userDataCacheKey(userId));
      if (cachedResponse != null) {
        return res.json(cachedResponse);
      }
    }

    // Mitarbeiter shop & Büro Mitarbeiter: IMEI-Liste vom Admin oder User mit Daten laden, eigene copyHistory/copyTimestamps behalten
    let sharedOwnerId = null;
    try {
      sharedOwnerId = await getSharedImeiOwnerId();
    } catch (err) {
      console.error('getSharedImeiOwnerId:', err);
    }
    let dataUserId = shouldUseSharedImeiData(role) ? sharedOwnerId ?? userId : userId;
    // INTEGER (PostgreSQL) oder String-UUID (Memory): normalizeUserId würde UUID zu null machen
    dataUserId = coerceUserId(dataUserId) ?? userId;
    const sameDataUser = String(dataUserId) === String(userId);
    if (debug) {
      debug.sharedOwnerId = sharedOwnerId != null ? String(sharedOwnerId) : null;
      debug.dataUserId = String(dataUserId);
      debug.sameDataUser = sameDataUser;
      debug.isTeamleiterShop = isTeamleiterShop(role);
      debug.isMitarbeiterShop = isMitarbeiterShop(role);
      debug.isBuero = isBüroMitarbeiter(role);
      debug.usesSharedData = Boolean(shouldUseSharedImeiData(role) && sharedOwnerId && String(sharedOwnerId) !== String(userId));
    }

    if (USE_MEMORY_DB) {
      const [data] = await ImeisUserData.findOrCreate({
        where: { user_id: dataUserId },
        defaults: { cell_colors_json: '{}', row_actions_json: '{}', copy_history_json: '[]', copy_timestamps_json: '[]' }
      });
      let imeis = safeJsonParse(data.imeis_json, []);
      if (!Array.isArray(imeis)) imeis = [];
      let cellColors = safeJsonParse(data.cell_colors_json, {});
      if (typeof cellColors !== 'object' || cellColors === null || Array.isArray(cellColors)) cellColors = {};
      let rowActions = safeJsonParse(data.row_actions_json, {});
      if (typeof rowActions !== 'object' || rowActions === null || Array.isArray(rowActions)) rowActions = {};
      let copyHistory = [];
      let copyTimestamps = [];

      if (shouldUseSharedImeiData(role) && !sameDataUser) {
        const [ownData] = await ImeisUserData.findOrCreate({
          where: { user_id: userId },
          defaults: { cell_colors_json: '{}', row_actions_json: '{}', copy_history_json: '[]', copy_timestamps_json: '[]' }
        });
        copyTimestamps = safeJsonParse(ownData.copy_timestamps_json, []);
        if (!Array.isArray(copyTimestamps)) copyTimestamps = [];
        let rawHistory = safeJsonParse(ownData.copy_history_json, []);
        if (!Array.isArray(rawHistory)) rawHistory = [];
        if (isMitarbeiterShop(role)) {
          const userName = currentUser?.name ?? currentUser?.get?.('name') ?? '';
          copyHistory = rawHistory.filter((e) => e && String(e.userName || '').trim() === String(userName).trim());
        } else if (isTeamleiterShop(role) && currentUser?.einsatz_ort) {
          try {
            copyHistory = await getCopyHistoryForEinsatzOrt(currentUser.einsatz_ort);
          } catch (err) {
            console.error('getCopyHistoryForEinsatzOrt (memory, branch):', err);
            copyHistory = [];
          }
        } else {
          copyHistory = rawHistory;
        }
      } else {
        copyHistory = safeJsonParse(data.copy_history_json, []);
        if (!Array.isArray(copyHistory)) copyHistory = [];
        copyTimestamps = safeJsonParse(data.copy_timestamps_json, []);
        if (!Array.isArray(copyTimestamps)) copyTimestamps = [];
      }
      if (shouldUseMergedOfficeCopyHistory(role)) {
        try {
          copyHistory = await getMergedCopyHistory();
        } catch (err) {
          console.error('getMergedCopyHistory (memory):', err);
          copyHistory = [];
        }
      }
      if (isTeamleiterShop(role) && currentUser?.einsatz_ort) {
        try {
          copyHistory = await getCopyHistoryForEinsatzOrt(currentUser.einsatz_ort);
        } catch (err) {
          console.error('getCopyHistoryForEinsatzOrt (memory):', err);
          copyHistory = [];
        }
      }

      const productLookup = lookupWithRowActionProducts(imeis, rowActions);
      copyHistory = enrichCopyHistoryWithProducts(copyHistory, productLookup);

      const response = {
        success: true,
        imeis,
        cellColors,
        rowActions,
        copyHistory,
        copyTimestamps,
        sonderImeis: getSonderPublishedEntries(),
        ...(debug ? { debug } : {})
      };
      if (!debugEnabled) {
        await redisCache.set(userDataCacheKey(userId), response, USER_DATA_CACHE_TTL);
      }
      return res.json(response);
    }

    const [data, created] = await ImeisUserData.findOrCreate({
      where: { user_id: dataUserId },
      defaults: {
        cell_colors_json: '{}',
        row_actions_json: '{}',
        copy_history_json: '[]',
        copy_timestamps_json: '[]'
      }
    });

    let imeis = safeJsonParse(data.imeis_json, []);
    if (!Array.isArray(imeis)) imeis = [];
    let cellColors = safeJsonParse(data.cell_colors_json, {});
    if (typeof cellColors !== 'object' || cellColors === null || Array.isArray(cellColors)) cellColors = {};
    let rowActions = safeJsonParse(data.row_actions_json, {});
    if (typeof rowActions !== 'object' || rowActions === null || Array.isArray(rowActions)) rowActions = {};
    let copyHistory = [];
    let copyTimestamps = [];

    if (shouldUseSharedImeiData(role) && !sameDataUser) {
      const [ownData] = await ImeisUserData.findOrCreate({
        where: { user_id: userId },
        defaults: {
          cell_colors_json: '{}',
          row_actions_json: '{}',
          copy_history_json: '[]',
          copy_timestamps_json: '[]'
        }
      });
      copyTimestamps = safeJsonParse(ownData.copy_timestamps_json, []);
      if (!Array.isArray(copyTimestamps)) copyTimestamps = [];
      let rawHistory = safeJsonParse(ownData.copy_history_json, []);
      if (!Array.isArray(rawHistory)) rawHistory = [];
      if (isMitarbeiterShop(role)) {
        const userName = currentUser?.name ?? currentUser?.get?.('name') ?? '';
        copyHistory = rawHistory.filter((e) => e && String(e.userName || '').trim() === String(userName).trim());
      } else if (isTeamleiterShop(role) && currentUser?.einsatz_ort) {
        try {
          copyHistory = await getCopyHistoryForEinsatzOrt(currentUser.einsatz_ort);
        } catch (err) {
          console.error('getCopyHistoryForEinsatzOrt (pg, branch):', err);
          copyHistory = [];
        }
      } else {
        copyHistory = rawHistory;
      }
    } else {
      copyHistory = safeJsonParse(data.copy_history_json, []);
      if (!Array.isArray(copyHistory)) copyHistory = [];
      copyTimestamps = safeJsonParse(data.copy_timestamps_json, []);
      if (!Array.isArray(copyTimestamps)) copyTimestamps = [];
    }
    if (shouldUseMergedOfficeCopyHistory(role)) {
      try {
        copyHistory = await getMergedCopyHistory();
      } catch (err) {
        console.error('getMergedCopyHistory:', err);
        copyHistory = [];
      }
    }
    if (isTeamleiterShop(role) && currentUser?.einsatz_ort) {
      try {
        copyHistory = await getCopyHistoryForEinsatzOrt(currentUser.einsatz_ort);
      } catch (err) {
        console.error('getCopyHistoryForEinsatzOrt:', err);
        copyHistory = [];
      }
    }

    const productLookup = lookupWithRowActionProducts(imeis, rowActions);
    copyHistory = enrichCopyHistoryWithProducts(copyHistory, productLookup);

    const response = {
      success: true,
      imeis,
      cellColors,
      rowActions,
      copyHistory,
      copyTimestamps,
      sonderImeis: getSonderPublishedEntries(),
      ...(debug ? { debug } : {})
    };
    if (!debugEnabled) {
      await redisCache.set(userDataCacheKey(userId), response, USER_DATA_CACHE_TTL);
    }
    res.json(response);
  } catch (error) {
    console.error('getImeisData:', error);
    next(error);
  }
};

/** Büro / Administrator: IMEIs zur Sonder-IMEI-Liste für Mitarbeiter shop freigeben */
export const approveSonderImeis = async (req, res, next) => {
  try {
    const userId = resolveAuthUserId(req.user);
    if (userId == null) {
      return res.status(401).json({ success: false, message: 'Nicht angemeldet' });
    }
    const currentUser = await User.findByPk(userId);
    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'Benutzer nicht gefunden' });
    }
    const role = getUserRole(currentUser);
    if (!(isAdmin(role) || isBüroMitarbeiter(role))) {
      return res.status(403).json({
        success: false,
        message: 'Nur Büro oder Administrator können Sonder-IMEIs freigeben'
      });
    }
    const imeisBody = req.body?.imeis;
    if (!Array.isArray(imeisBody) || imeisBody.length === 0) {
      return res.status(400).json({ success: false, message: 'imeis (nicht-leeres Array) erforderlich' });
    }
    const uploaderName = (
      currentUser?.name ??
      currentUser?.get?.('name') ??
      currentUser?.dataValues?.name ??
      ''
    ).trim();
    const sonderImeis = addSonderImeiApprovals(imeisBody, { approvedByName: uploaderName || 'Büro' });
    const io = req.app.get('io');
    if (io) io.emit('imeis:updated');
    return res.json({ success: true, sonderImeis });
  } catch (e) {
    next(e);
  }
};

function normalizeImeiDedupKey(imei) {
  return normalizeImeiKey(imei);
}

/**
 * Upload-Zeilen einarbeiten: neue IMEIs anhängen; bei bereits vorhandener IMEI die Zeile mit
 * Excel-Daten aktualisieren (Blatt, row, rowData, …), damit neue Lieferlisten sichtbar werden.
 */
export function mergeImeiRowsAppend(existingImeis, incomingImeis) {
  const existing = Array.isArray(existingImeis) ? [...existingImeis] : [];
  const keyToIndex = new Map();
  const nowIso = new Date().toISOString();
  for (let i = 0; i < existing.length; i++) {
    const k = normalizeImeiDedupKey(existing[i]?.imei);
    if (k && !keyToIndex.has(k)) keyToIndex.set(k, i);
  }
  const merged = [...existing];
  let added = 0;
  let updatedFromUpload = 0;
  const addedRows = [];
  for (const item of incomingImeis) {
    if (!item || typeof item !== 'object') continue;
    const k = normalizeImeiDedupKey(item?.imei);
    if (!k) continue;
    const idx = keyToIndex.get(k);
    if (idx !== undefined) {
      const prev = merged[idx];
      // rowData/columnOrder aus Excel übernehmen, sheet/row behalten (sichtbar + rowActions-rowId stabil).
      merged[idx] = {
        ...prev,
        ...item,
        rowData: item?.rowData ? { ...item.rowData } : prev?.rowData,
        columnOrder: Array.isArray(item?.columnOrder) ? [...item.columnOrder] : prev?.columnOrder,
        rowDataFormats: item?.rowDataFormats ? { ...item.rowDataFormats } : prev?.rowDataFormats,
        sheet: prev?.sheet ?? item.sheet,
        row: prev?.row ?? item.row,
        imei: canonicalImeiString(
          item.imei != null && String(item.imei).trim() !== '' ? item.imei : prev?.imei
        ),
        _addedAt: prev?._addedAt || item._addedAt || nowIso,
        _excelUpdatedAt: nowIso
      };
      updatedFromUpload += 1;
      continue;
    }
    keyToIndex.set(k, merged.length);
    const row = {
      ...item,
      imei: canonicalImeiString(item.imei),
      _addedAt: item._addedAt || nowIso
    };
    merged.push(row);
    addedRows.push(row);
    added += 1;
  }
  return {
    merged,
    addedRows,
    added,
    skippedDuplicate: 0,
    updatedFromUpload,
    previousCount: existing.length
  };
}

function restoreAcceptedArchiveFromExcelUpload(merged, incomingImeis, acceptedKeys) {
  const incomingByKey = new Map();
  for (const item of incomingImeis) {
    if (!item || typeof item !== 'object') continue;
    for (const k of collectImeiKeysFromUploadRow(item)) {
      if (acceptedKeys.has(k)) incomingByKey.set(k, item);
    }
  }

  const keysToRestore = [...incomingByKey.keys()];
  if (keysToRestore.length === 0) {
    return {
      merged: merged.map((row) => {
        const next = { ...row };
        delete next._acceptedArchiveMatch;
        return next;
      }),
      restoredFromArchive: 0,
      reAddedFromArchive: 0
    };
  }

  // Archiv + Verlauf bleiben erhalten – IMEIs nur wieder in die Hauptliste aufnehmen.
  const nowIso = new Date().toISOString();
  const result = [...merged];
  const keyToIndex = new Map();
  for (let i = 0; i < result.length; i++) {
    const k = normalizeImeiDedupKey(result[i]?.imei);
    if (k && !keyToIndex.has(k)) keyToIndex.set(k, i);
  }

  let reAddedFromArchive = 0;
  for (const k of keysToRestore) {
    const incoming = incomingByKey.get(k);
    const idx = keyToIndex.get(k);
    if (idx !== undefined) {
      const prev = result[idx];
      result[idx] = {
        ...prev,
        ...incoming,
        rowData: incoming?.rowData ? { ...incoming.rowData } : prev?.rowData,
        columnOrder: Array.isArray(incoming?.columnOrder) ? [...incoming.columnOrder] : prev?.columnOrder,
        rowDataFormats: incoming?.rowDataFormats ? { ...incoming.rowDataFormats } : prev?.rowDataFormats,
        sheet: incoming?.sheet ?? prev?.sheet,
        row: incoming?.row ?? prev?.row,
        imei: canonicalImeiString(incoming?.imei ?? k),
        _addedAt: prev?._addedAt || nowIso,
        _excelUpdatedAt: nowIso,
        _restoredFromAcceptedArchiveAt: nowIso
      };
      delete result[idx]._acceptedArchiveMatch;
    } else {
      result.push({
        ...incoming,
        imei: canonicalImeiString(incoming?.imei ?? k),
        sheet: incoming?.sheet ?? 'Excel',
        row: incoming?.row ?? result.length + 1,
        _addedAt: nowIso,
        _restoredFromAcceptedArchiveAt: nowIso
      });
      keyToIndex.set(k, result.length - 1);
      reAddedFromArchive += 1;
    }
  }

  const restoredKeys = new Set(keysToRestore);
  const cleaned = result.map((row) => {
    const next = { ...row };
    const k = normalizeImeiDedupKey(next?.imei);
    if (!k || !restoredKeys.has(k)) {
      delete next._acceptedArchiveMatch;
    }
    return next;
  });

  return {
    merged: cleaned,
    restoredFromArchive: keysToRestore.length,
    reAddedFromArchive
  };
}

function rowActionMatchesImeiKeys(rowId, keySet) {
  const rk = normalizeImeiKey(imeiKeyFromRowId(rowId));
  if (rk && keySet.has(rk)) return true;
  const digits = String(rowId).replace(/\D/g, '');
  if (!digits) return false;
  for (const k of keySet) {
    if (digits.includes(k)) return true;
  }
  return false;
}

async function clearReservierenRowActionsForImeiKeys(imeiKeys = [], explicitRowIds = []) {
  const keySet = new Set(
    (Array.isArray(imeiKeys) ? imeiKeys : [])
      .map((k) => normalizeImeiKey(k))
      .filter(Boolean)
  );
  const rowIdSet = new Set(
    (Array.isArray(explicitRowIds) ? explicitRowIds : []).filter(Boolean)
  );
  if (!keySet.size && !rowIdSet.size) return;
  const all = await ImeisUserData.findAll();
  for (const row of all) {
    const rowUserId = (row.get && row.get('user_id')) ?? row.user_id;
    const rowActionsJson = (row.get && row.get('row_actions_json')) ?? row.row_actions_json;
    let rowActions = {};
    try {
      rowActions = rowActionsJson ? JSON.parse(rowActionsJson) : {};
    } catch (_) {
      rowActions = {};
    }
    if (typeof rowActions !== 'object' || rowActions === null || Array.isArray(rowActions)) continue;
    let changed = false;
    Object.keys(rowActions).forEach((rowId) => {
      const act = rowActions[rowId];
      if (act?.action !== 'reservieren') return;
      if (rowIdSet.has(rowId) || rowActionMatchesImeiKeys(rowId, keySet)) {
        delete rowActions[rowId];
        changed = true;
      }
    });
    if (changed) {
      await ImeisUserData.upsert({
        user_id: rowUserId,
        row_actions_json: JSON.stringify(rowActions)
      });
    }
  }
}

/**
 * Excel-Upload (Büro/Admin): bestehende gemeinsame Liste lesen, mergen, unter Uploader speichern.
 */
export async function appendImeisFromExcelUpload(uploaderUserId, incomingImeis, app) {
  const incoming = Array.isArray(incomingImeis) ? incomingImeis : [];
  const ownerId = await getSharedImeiOwnerId();
  const baseUserId = ownerId ?? uploaderUserId;
  let existing = [];
  const baseRow = await ImeisUserData.findOne({ where: { user_id: baseUserId } });
  if (baseRow) {
    const raw = (baseRow.get && baseRow.get('imeis_json')) ?? baseRow.imeis_json;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) existing = parsed;
      } catch (_) {}
    }
  }
  const { merged, added, skippedDuplicate, updatedFromUpload, previousCount, addedRows } = mergeImeiRowsAppend(
    existing,
    incoming
  );
  const acceptedKeys = getAcceptedImeiKeySet();
  const restoreKeysSet = new Set();
  for (const item of incoming) {
    for (const k of collectImeiKeysFromUploadRow(item)) {
      if (acceptedKeys.has(k)) restoreKeysSet.add(k);
    }
  }
  const restoreKeys = [...restoreKeysSet];
  const { merged: restoredMerged, restoredFromArchive, reAddedFromArchive } = restoreAcceptedArchiveFromExcelUpload(
    merged,
    incoming,
    acceptedKeys
  );
  if (restoreKeys.length > 0) {
    const restoreKeySet = new Set(restoreKeys);
    const explicitRowIds = restoredMerged
      .filter((item) => {
        const k = normalizeImeiKey(item?.imei);
        return k && restoreKeySet.has(k);
      })
      .map((item) => buildImeiRowId(item));
    await clearReservierenRowActionsForImeiKeys(restoreKeys, explicitRowIds);
  }
  const totalAdded = added + reAddedFromArchive;
  await saveImeisDataToStorage(baseUserId, { imeis: restoredMerged }, app);
  const io = app?.get?.('io');
  if (io) io.emit('imeis:updated');
  await invalidateImeisCaches(baseUserId, { sharedListChanged: true });
  return {
    merged: restoredMerged,
    addedRows,
    added: totalAdded,
    skippedDuplicate,
    updatedFromUpload,
    previousCount,
    total: restoredMerged.length,
    restoredFromArchive,
    reAddedFromArchive,
    acceptedArchiveMatches: restoredFromArchive
  };
}

/** Interne Speicherlogik – wiederverwendbar für Excel-Upload (vermeidet 413 bei großem JSON) */
export const saveImeisDataToStorage = async (userId, body, app) => {
  const uid = coerceUserId(userId);
  if (uid == null) {
    throw new Error('Ungültige Benutzer-ID');
  }
  userId = uid;
  const currentUser = await User.findByPk(userId);
  const role = getUserRole(currentUser);
  const { imeis, cellColors, rowActions, copyHistory, copyTimestamps, removedImei } = body;

  // Server-Schutz: "reservieren/dereserviert" muss im Verlauf erscheinen (Teamleiter-Verlauf basiert auf copy_history_json).
  // Wir synthesizen fehlende Einträge aus rowActions (nur für eigene Aktionen dieses Users),
  // auch wenn der Client bereits copyHistory mitsendet (weil manche Clients "reservieren" sonst verlieren).
  let augmentedCopyHistory = copyHistory;
  try {
    if (rowActions && typeof rowActions === 'object' && !Array.isArray(rowActions)) {
      const myName = String(currentUser?.name ?? currentUser?.get?.('name') ?? '').trim();
      if (myName) {
        const baseHistory =
          copyHistory !== undefined
            ? (Array.isArray(copyHistory) ? copyHistory : [])
            : (() => {
                return [];
              })();
        let existingArr = baseHistory;
        // Falls Client kein copyHistory mitsendet, verwenden wir den aktuellen gespeicherten Zustand als Basis
        if (copyHistory === undefined) {
          const [ownData] = await ImeisUserData.findOrCreate({
            where: { user_id: userId },
            defaults: { cell_colors_json: '{}', row_actions_json: '{}', copy_history_json: '[]', copy_timestamps_json: '[]' }
          });
          const existingRaw = (ownData.get && ownData.get('copy_history_json')) ?? ownData.copy_history_json;
          try {
            existingArr = existingRaw ? JSON.parse(existingRaw) : [];
          } catch (_) {
            existingArr = [];
          }
          if (!Array.isArray(existingArr)) existingArr = [];
        }

        const existingKey = new Set(
          (existingArr || []).map((e) => copyHistoryEntryKey(e))
        );
        const existingSlot = new Set(
          (existingArr || []).map((e) => copyHistorySlotKey(e))
        );

        const productLookup =
          Array.isArray(imeis) && imeis.length > 0
            ? buildImeiProductLookup(imeis)
            : await loadSharedImeiProductLookup();

        const additions = [];
        Object.entries(rowActions).forEach(([rowId, act]) => {
          if (!act || typeof act !== 'object') return;
          const actName = String(act.userName || '').trim();
          if (actName !== myName) return;
          const action = String(act.action || '').trim();
          if (action !== 'reservieren' && action !== 'dereserviert') return;
          const imei = String(imeiKeyFromRowId(rowId) || '').trim();
          if (!imei) return;
          const ts = String(act.timestamp || new Date().toISOString()).trim();
          const key = copyHistoryEntryKey({ imei, userName: myName, timestamp: ts, action });
          const slot = copyHistorySlotKey({ imei, userName: myName });
          if (existingKey.has(key) || existingSlot.has(slot)) return;
          existingKey.add(key);
          existingSlot.add(slot);
          let product = String(act.product ?? '').trim();
          if (isEmptyHistoryProduct(product)) {
            product = productLookup.get(normalizeImeiKey(imei)) || '-';
          }
          if (isEmptyHistoryProduct(product)) product = '-';
          additions.push({ imei, product, action, timestamp: ts, userName: myName });
        });

        if (additions.length > 0) {
          augmentedCopyHistory = mergeCopyHistoryEntries(existingArr, additions);
        }
      }
    }
  } catch (_) {}

  if (removedImei) {
    await removeImeiFromAllLists(removedImei);
  }

  const isMitarbeiter = isMitarbeiterShop(role);
  const ownerId = await getSharedImeiOwnerId();
  const canEditSharedImeiList = isAdmin(role) || isBüroMitarbeiter(role);
  const masterListUserId = canEditSharedImeiList && ownerId != null ? ownerId : userId;
  const clearingMasterList =
    canEditSharedImeiList &&
    ownerId != null &&
    imeis !== undefined &&
    Array.isArray(imeis) &&
    imeis.length === 0;

  if (clearingMasterList && !getImeiDeleteAllEnabled()) {
    const err = new Error('„Alle löschen“ ist derzeit deaktiviert (Administrator-Einstellung).');
    err.statusCode = 403;
    throw err;
  }

  const usesSharedData = shouldUseSharedImeiData(role) && ownerId && ownerId !== userId;

  let historyToSave = augmentedCopyHistory !== undefined ? augmentedCopyHistory : copyHistory;
  if (historyToSave !== undefined && !clearingMasterList) {
    if (shouldUseMergedOfficeCopyHistory(role)) {
      historyToSave = undefined;
    } else {
      const saveProductLookup =
        Array.isArray(imeis) && imeis.length > 0
          ? buildImeiProductLookup(imeis)
          : await loadSharedImeiProductLookup();
      if (Array.isArray(historyToSave)) {
        historyToSave = enrichCopyHistoryWithProducts(historyToSave, saveProductLookup);
      }
      historyToSave = await resolveCopyHistoryForSave(userId, historyToSave);
      await redisCache.del(MERGED_COPY_HISTORY_CACHE_KEY);
    }
  }

  const payload = {
    user_id: userId,
    ...(!isMitarbeiter && !canEditSharedImeiList && imeis !== undefined && { imeis_json: JSON.stringify(imeis) }),
    ...(!isMitarbeiter && !canEditSharedImeiList && cellColors !== undefined && { cell_colors_json: JSON.stringify(cellColors) }),
    ...(!isMitarbeiter && !usesSharedData && rowActions !== undefined && { row_actions_json: JSON.stringify(rowActions) }),
    ...(historyToSave !== undefined && !clearingMasterList && { copy_history_json: JSON.stringify(historyToSave) }),
    ...(copyTimestamps !== undefined && !clearingMasterList && { copy_timestamps_json: JSON.stringify(copyTimestamps) })
  };

  const mergeRowActionsIntoOwner = async () => {
    if (rowActions === undefined || !ownerId || clearingMasterList) return;
    const [ownerRow] = await ImeisUserData.findOrCreate({
      where: { user_id: ownerId },
      defaults: { cell_colors_json: '{}', row_actions_json: '{}', copy_history_json: '[]', copy_timestamps_json: '[]' }
    });
    const ownerActionsJson = (ownerRow.get && ownerRow.get('row_actions_json')) ?? ownerRow.row_actions_json;
    let ownerActions = {};
    try { ownerActions = ownerActionsJson ? JSON.parse(ownerActionsJson) : {}; } catch (_) {}
    const currentUserName = currentUser?.name || '';
    const merged = { ...ownerActions };
    Object.keys(merged).forEach((k) => {
      if (merged[k]?.userName === currentUserName && !(k in rowActions)) delete merged[k];
    });
    Object.assign(merged, rowActions);
    await ImeisUserData.upsert({ user_id: ownerId, row_actions_json: JSON.stringify(merged) });
  };

  if (USE_MEMORY_DB) {
    if (!isMitarbeiter && canEditSharedImeiList && (imeis !== undefined || cellColors !== undefined || clearingMasterList)) {
      const listPayload = { user_id: masterListUserId };
      if (imeis !== undefined) listPayload.imeis_json = JSON.stringify(imeis);
      if (cellColors !== undefined) listPayload.cell_colors_json = JSON.stringify(cellColors);
      if (clearingMasterList) listPayload.row_actions_json = '{}';
      await ImeisUserData.upsert(listPayload);
    }
    if (clearingMasterList) {
      const all = await ImeisUserData.findAll();
      const done = new Set();
      for (const row of all) {
        const uid = row.user_id ?? (row.get && row.get('user_id'));
        const k = String(uid);
        if (!uid || done.has(k)) continue;
        done.add(k);
        await ImeisUserData.upsert({ user_id: uid, copy_history_json: '[]', copy_timestamps_json: '[]' });
      }
    }
    await ImeisUserData.upsert(payload);
    if (usesSharedData && rowActions !== undefined) await mergeRowActionsIntoOwner();
    const io = app?.get?.('io');
    const dataChanged = imeis !== undefined || rowActions !== undefined || removedImei || clearingMasterList;
    if (io && dataChanged) io.emit('imeis:updated');
    const sharedListChanged = Boolean(imeis !== undefined && canEditSharedImeiList && ownerId != null);
    await invalidateImeisCaches(userId, { sharedListChanged });
    return;
  }

  if (!isMitarbeiter && canEditSharedImeiList && (imeis !== undefined || cellColors !== undefined || clearingMasterList)) {
    const [ownerListRow] = await ImeisUserData.findOrCreate({
      where: { user_id: masterListUserId },
      defaults: { cell_colors_json: '{}', row_actions_json: '{}', copy_history_json: '[]', copy_timestamps_json: '[]' }
    });
    if (imeis !== undefined) ownerListRow.imeis_json = JSON.stringify(imeis);
    if (cellColors !== undefined) ownerListRow.cell_colors_json = JSON.stringify(cellColors);
    if (clearingMasterList) ownerListRow.row_actions_json = '{}';
    await ownerListRow.save();
  }
  if (clearingMasterList) {
    // Sequelize 6: update ohne where (where: {}) wirft oft einen Fehler → pro user_id aktualisieren
    const allRows = await ImeisUserData.findAll({ attributes: ['user_id'] });
    const uidSet = new Set();
    for (const row of allRows) {
      const uid = row.user_id ?? (row.get && row.get('user_id'));
      if (uid != null) uidSet.add(Number(uid));
    }
    for (const uid of uidSet) {
      await ImeisUserData.update(
        { copy_history_json: '[]', copy_timestamps_json: '[]' },
        { where: { user_id: uid } }
      );
    }
  }

  const [data] = await ImeisUserData.findOrCreate({
    where: { user_id: userId },
    defaults: {
      cell_colors_json: '{}',
      row_actions_json: '{}',
      copy_history_json: '[]',
      copy_timestamps_json: '[]'
    }
  });

  if (!isMitarbeiter && !canEditSharedImeiList && imeis !== undefined) data.imeis_json = JSON.stringify(imeis);
  if (!isMitarbeiter && !canEditSharedImeiList && cellColors !== undefined) data.cell_colors_json = JSON.stringify(cellColors);
  if (!isMitarbeiter && !usesSharedData && rowActions !== undefined) data.row_actions_json = JSON.stringify(rowActions);
  if (usesSharedData && rowActions !== undefined && !clearingMasterList) {
    const [ownerData] = await ImeisUserData.findOrCreate({
      where: { user_id: ownerId },
      defaults: { cell_colors_json: '{}', row_actions_json: '{}', copy_history_json: '[]' }
    });
    const ownerActionsJson = (ownerData.get && ownerData.get('row_actions_json')) ?? ownerData.row_actions_json;
    let ownerActions = {};
    try { ownerActions = ownerActionsJson ? JSON.parse(ownerActionsJson) : {}; } catch (_) {}
    const currentUserName = currentUser?.name || '';
    const merged = { ...ownerActions };
    Object.keys(merged).forEach((k) => {
      if (merged[k]?.userName === currentUserName && !(k in rowActions)) delete merged[k];
    });
    Object.assign(merged, rowActions);
    ownerData.row_actions_json = JSON.stringify(merged);
    await ownerData.save();
  }
  if (historyToSave !== undefined && !clearingMasterList) data.copy_history_json = JSON.stringify(historyToSave);
  if (copyTimestamps !== undefined && !clearingMasterList) data.copy_timestamps_json = JSON.stringify(copyTimestamps);
  await data.save();

  const io = app?.get?.('io');
  const dataChanged = imeis !== undefined || rowActions !== undefined || removedImei || clearingMasterList;
  if (io && dataChanged) io.emit('imeis:updated');
  const sharedListChanged = Boolean(imeis !== undefined && canEditSharedImeiList && ownerId != null);
  await invalidateImeisCaches(userId, { sharedListChanged });
};

export const saveImeisData = async (req, res, next) => {
  try {
    const userId = resolveAuthUserId(req.user);
    if (userId == null) {
      return res.status(401).json({ success: false, message: 'Nicht angemeldet' });
    }
    await saveImeisDataToStorage(userId, req.body, req.app);
    const clearingAll = Array.isArray(req.body?.imeis) && req.body.imeis.length === 0;
    if (clearingAll) {
      writeAuditLog(req, {
        category: 'imei',
        action: 'imei.delete_all',
        summary: 'Alle IMEIs gelöscht'
      });
    }
    res.json({ success: true, message: 'IMEIS-Daten gespeichert' });
  } catch (error) {
    next(error);
  }
};

/** Büro Mitarbeiter: Aktion (angenommen/abgelehnt) für alle. Teamleiter shop: nur für Benutzer seiner Kategorie (einsatz_ort). */
export const updateHistoryAction = async (req, res, next) => {
  try {
    const userId = resolveAuthUserId(req.user);
    if (userId == null) {
      return res.status(401).json({ success: false, message: 'Nicht angemeldet' });
    }
    const currentUser = await User.findByPk(userId);
    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'Benutzer nicht gefunden' });
    }
    const role = getUserRole(currentUser);
    const isBüro = isBüroMitarbeiter(role);
    const isTeamleiter = isTeamleiterShop(role);
    const isAdminUser = isAdminUserEntity(currentUser);
    const { imei, userName, newAction, targetUserId, historyTimestamp, product } = req.body;
    if (!imei || !userName) {
      return res.status(400).json({ message: 'imei und userName erforderlich' });
    }
    const actionNorm = String(newAction || '').trim();
    if (!['angenommen', 'abgelehnt'].includes(actionNorm)) {
      return res.status(400).json({ message: 'newAction: angenommen oder abgelehnt erforderlich' });
    }

    let targetUser = null;
    let resolvedTargetUserId = null;
    // Robust: wenn Client die Ziel-ID mitsendet, bevorzugen (verhindert isSelf-Fehler bei Namensvarianten)
    if (targetUserId != null && targetUserId !== '') {
      try {
        targetUser = await User.findByPk(coerceUserId(targetUserId));
      } catch (_) {}
      if (targetUser) {
        resolvedTargetUserId = entityUserId(targetUser);
      }
    }
    if (!targetUser) {
      targetUser = await resolveTargetUserByName(userName);
      if (!targetUser) {
        return res.status(404).json({ message: 'Benutzer nicht gefunden' });
      }
      resolvedTargetUserId = entityUserId(targetUser);
    }
    let isSelf =
      resolvedTargetUserId != null && userId != null && String(resolvedTargetUserId) === String(userId);
    if (!isSelf && currentUser) {
      const myName = normHistUserName(currentUser.name ?? currentUser.get?.('name'));
      if (myName && myName === normHistUserName(userName)) {
        isSelf = true;
        targetUser = currentUser;
        resolvedTargetUserId = entityUserId(currentUser);
      }
    }
    /** Eigener Verlauf: jeder angemeldete Nutzer darf; Fremde nur Büro/Admin/Teamleiter.
     * Robust: Wenn Name nicht exakt matcht, erlauben wir "self" nur wenn der Eintrag (IMEI+Timestamp)
     * im eigenen copy_history_json existiert.
     */
    const allowedOffice = isBüro || isTeamleiter || isAdminUser;
    if (!allowedOffice && !isSelf) {
      const owns = await userOwnsCopyHistoryEntry(userId, imei, historyTimestamp);
      if (owns) {
        isSelf = true;
        targetUser = currentUser;
        resolvedTargetUserId = entityUserId(currentUser);
      } else {
        return res.status(403).json({
          message:
            'Nur Büro Mitarbeiter, Administrator oder Teamleiter shop dürfen Aktionen für andere Benutzer aktualisieren'
        });
      }
    }
    if (!isSelf && isTeamleiter && !isBüro && !isAdminUser) {
      const tlOrt = normalizeEinsatzOrtKey(currentUser?.einsatz_ort);
      const targetOrt = normalizeEinsatzOrtKey(targetUser?.einsatz_ort);
      if (!tlOrt || tlOrt !== targetOrt) {
        return res.status(403).json({ message: 'Teamleiter dürfen nur Aktionen für Benutzer ihrer Kategorie (einsatz_ort) aktualisieren' });
      }
    }

    const imeiNorm = String(imei || '').trim();
    const targetDisplayName = targetUser?.name ?? targetUser?.get?.('name') ?? userName;
    const did = { action: actionNorm, imei: imeiNorm };

    if (actionNorm === 'angenommen') {
      try {
        const editor = await editorFromReqAsync(req);
        addAcceptedImeiEntry({
          imei: imeiNorm,
          product: String(product ?? '').trim(),
          userName: targetDisplayName,
          acceptedByUserId: userId,
          acceptedByName: editor.userName || editor.name || '',
          historyTimestamp: historyTimestamp ?? null
        });
      } catch (archiveErr) {
        console.error('addAcceptedImeiEntry:', archiveErr);
      }
      await removeImeiFromAllLists(imeiNorm);
      did.removedFromLists = true;
      did.removedFromHistories = true; // removeImeiFromAllLists() entfernt auch copy_history
    }
    if (actionNorm === 'abgelehnt') {
      // Erst exakt per Timestamp (UI-Eintrag), dann Fallback per Anzeigename (alte Clients)
      await removeCopyHistoryEntriesForImeiAndTimestamp(imeiNorm, historyTimestamp);
      await removeCopyHistoryEntriesForImeiAndDisplayName(imeiNorm, targetDisplayName);
      // Erwartung: IMEI soll aus dem Verlauf komplett verschwinden (für alle Rollen / gemergter Verlauf)
      await removeImeiFromAllCopyHistories(imeiNorm);
      did.removedFromHistories = true;
    }
    /** abgelehnt: Zeile wieder sichtbar (Row-Actions zur IMEI löschen) */
    if (actionNorm === 'abgelehnt') {
      const dataOwnerId = await getSharedImeiOwnerId();
      if (dataOwnerId) {
        const [ownerData] = await ImeisUserData.findOrCreate({
          where: { user_id: dataOwnerId },
          defaults: { cell_colors_json: '{}', row_actions_json: '{}', copy_history_json: '[]', copy_timestamps_json: '[]' }
        });
        const actionsJson = (ownerData.get && ownerData.get('row_actions_json')) ?? ownerData.row_actions_json;
        let rowActions = {};
        try {
          rowActions = actionsJson ? JSON.parse(actionsJson) : {};
        } catch (_) {}
        Object.keys(rowActions).forEach((rowId) => {
          if (rowId.includes(`-${String(imei).trim()}-`)) delete rowActions[rowId];
        });
        await ImeisUserData.upsert({ user_id: dataOwnerId, row_actions_json: JSON.stringify(rowActions) });
      }
    }

    // Echtzeit: Alle Benutzer benachrichtigen (IMEI-Liste hat sich geändert: angenommen = entfernt, abgelehnt = rowActions geändert)
    const io = req.app?.get?.('io');
    if (io) io.emit('imeis:updated');

    writeAuditLog(req, {
      category: 'imei',
      action: `imei.history.${actionNorm}`,
      summary: `Verlauf: IMEI ${String(imei).trim()} → ${actionNorm}`,
      meta: { imei: String(imei).trim(), action: actionNorm, targetUserName: targetDisplayName }
    });

    res.json({
      success: true,
      message: 'Aktion aktualisiert',
      rowActions: actionNorm === 'abgelehnt' ? {} : undefined,
      did
    });
  } catch (error) {
    next(error);
  }
};

/** Büro Mitarbeiter: Erinnerung an alle. Teamleiter shop: nur an Benutzer seiner Kategorie (einsatz_ort). */
export const sendImeiReminder = async (req, res, next) => {
  try {
    const userId = resolveAuthUserId(req.user);
    if (userId == null) {
      return res.status(401).json({ success: false, message: 'Nicht angemeldet' });
    }
    const currentUser = await User.findByPk(userId);
    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'Benutzer nicht gefunden' });
    }
    const role = getUserRole(currentUser);
    const isBüro = isBüroMitarbeiter(role);
    const isTeamleiter = isTeamleiterShop(role);
    const isAdminUser = isAdminUserEntity(currentUser);
    if (!isBüro && !isTeamleiter && !isAdminUser) {
      return res.status(403).json({ message: 'Nur Büro Mitarbeiter, Administrator oder Teamleiter shop dürfen Erinnerungen senden' });
    }
    const { targetUserName, imei, targetUserId: targetUserIdBody } = req.body;
    if (!imei || String(imei).trim() === '') {
      return res.status(400).json({ message: 'imei erforderlich' });
    }
    const tidRaw = targetUserIdBody != null && targetUserIdBody !== '' ? targetUserIdBody : null;
    const tid = tidRaw != null ? coerceUserId(tidRaw) ?? String(tidRaw).trim() : null;

    let targetUser = null;
    if (tid) {
      targetUser = await User.findByPk(tid);
    }
    if (!targetUser && targetUserName) {
      targetUser = await resolveTargetUserByName(targetUserName);
    }
    if (!targetUser) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }
    if (isTeamleiter && !isBüro && !isAdminUser) {
      const tlOrt = normalizeEinsatzOrtKey(currentUser?.einsatz_ort);
      const targetOrt = normalizeEinsatzOrtKey(targetUser?.einsatz_ort);
      if (!tlOrt || tlOrt !== targetOrt) {
        return res.status(403).json({ message: 'Teamleiter dürfen nur Erinnerungen an Benutzer ihrer Kategorie (einsatz_ort) senden' });
      }
    }

    const targetId = targetUser.id ?? targetUser._id ?? targetUser.get?.('id');
    const targetName = targetUser.name ?? targetUser.get?.('name') ?? targetUserName ?? '';
    const fromName = currentUser?.name ?? currentUser?.get?.('name') ?? 'Büro';
    const fromId = currentUser?.id ?? currentUser?.get?.('id') ?? userId;

    ImeiReminder.addReminder(targetId, targetName, imei, fromName, fromId);

    res.json({ success: true, message: 'Erinnerung gesendet' });
  } catch (error) {
    next(error);
  }
};

/** Eigene IMEI-Erinnerungen abrufen */
export const getMyImeiReminders = async (req, res, next) => {
  try {
    const userId = resolveAuthUserId(req.user) ?? req.user?.userId;
    const reminders = ImeiReminder.getRemindersForUser(userId);
    res.json({ success: true, reminders });
  } catch (error) {
    next(error);
  }
};

/** IMEI-Erinnerung als gelesen markieren */
export const markImeiReminderRead = async (req, res, next) => {
  try {
    const userId = resolveAuthUserId(req.user) ?? req.user?.userId;
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'ID erforderlich' });
    const ok = ImeiReminder.markReminderRead(id, userId);
    if (!ok) return res.status(404).json({ message: 'Erinnerung nicht gefunden' });
    res.json({ success: true, message: 'Als gelesen markiert' });
  } catch (error) {
    next(error);
  }
};

/** Benutzer: Benachrichtigung an Büro senden, wenn auf Erinnerung reagiert (angenommen/abgelehnt) */
export const notifyReminderResponse = async (req, res, next) => {
  try {
    const userId = resolveAuthUserId(req.user);
    if (userId == null) {
      return res.status(401).json({ success: false, message: 'Nicht angemeldet' });
    }
    const currentUser = await User.findByPk(userId);
    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'Benutzer nicht gefunden' });
    }
    const { imei, action } = req.body;
    if (!imei || !action || !['angenommen', 'abgelehnt'].includes(action)) {
      return res.status(400).json({ message: 'imei und action (angenommen/abgelehnt) erforderlich' });
    }
    const userName = currentUser?.name ?? currentUser?.get?.('name') ?? 'Unbekannt';
    const reminders = ImeiReminder.findRemindersForUserAndImei(userId, imei);
    const notified = new Set();
    const io = req.app?.get?.('io');

    for (const r of reminders) {
      let fromId = r.from_user_id;
      if (!fromId && r.from_user_name) {
        const fromUser = await User.findOne({ where: { name: r.from_user_name } });
        fromId = fromUser?.id ?? fromUser?._id ?? fromUser?.get?.('id');
      }
      if (fromId && !notified.has(String(fromId))) {
        const notification = ReminderResponseNotification.addNotification(fromId, userName, imei, action);
        notified.add(String(fromId));
        if (io && notification) {
          io.emit('reminder-response:new', { targetUserId: String(fromId), notification });
        }
      }
    }
    res.json({ success: true, message: 'Benachrichtigung gesendet' });
  } catch (error) {
    next(error);
  }
};

/** Büro Mitarbeiter: Benachrichtigungen über Erinnerungs-Antworten abrufen */
export const getReminderResponseNotifications = async (req, res, next) => {
  try {
    const userId = resolveAuthUserId(req.user);
    if (userId == null) {
      return res.status(401).json({ success: false, message: 'Nicht angemeldet' });
    }
    const currentUser = await User.findByPk(userId);
    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'Benutzer nicht gefunden' });
    }
    const role = getUserRole(currentUser);
    if (!isBüroMitarbeiter(role) && !isAdmin(role)) {
      return res.status(403).json({ message: 'Nur Büro Mitarbeiter können diese Benachrichtigungen einsehen' });
    }
    let list = [];
    try {
      list = ReminderResponseNotification.getUnreadForUser(userId);
    } catch (err) {
      console.error('getReminderResponseNotifications:', err);
    }
    if (!Array.isArray(list)) list = [];
    res.json({ success: true, notifications: list });
  } catch (error) {
    console.error('getReminderResponseNotifications uncaught:', error);
    res.json({ success: true, notifications: [] });
  }
};

/** Büro Mitarbeiter: Benachrichtigung als gelesen markieren */
export const markReminderResponseNotificationRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'ID erforderlich' });
    const ok = ReminderResponseNotification.markAsRead(id, userId);
    if (!ok) return res.status(404).json({ message: 'Benachrichtigung nicht gefunden' });
    res.json({ success: true, message: 'Als gelesen markiert' });
  } catch (error) {
    next(error);
  }
};

/** Benutzer (nicht Büro): Anfrage für eine Extra-Kopie an Büro senden */
export const createExtraCopyRequest = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const currentUser = await User.findByPk(userId);
    const role = getUserRole(currentUser);
    if (isBüroMitarbeiter(role) || isAdmin(role)) {
      return res.status(403).json({ message: 'Büro Mitarbeiter und Administratoren benötigen keine Genehmigung' });
    }
    const userName = currentUser?.name ?? currentUser?.get?.('name') ?? 'Unbekannt';
    const id = ExtraCopyRequest.addRequest(userId, userName);
    if (!id) {
      return res.status(400).json({ message: 'Sie haben bereits eine offene Anfrage. Bitte warten Sie auf die Antwort.' });
    }
    res.json({ success: true, message: 'Anfrage an Büro gesendet', id });
  } catch (error) {
    next(error);
  }
};

/** Büro Mitarbeiter: Offene Extra-Kopie-Anfragen abrufen */
export const getExtraCopyRequests = async (req, res, next) => {
  try {
    const userId = resolveAuthUserId(req.user);
    if (userId == null) {
      return res.status(401).json({ success: false, message: 'Nicht angemeldet' });
    }
    const currentUser = await User.findByPk(userId);
    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'Benutzer nicht gefunden' });
    }
    const role = getUserRole(currentUser);
    if (!isBüroMitarbeiter(role) && !isAdmin(role)) {
      return res.status(403).json({ message: 'Nur Büro Mitarbeiter können Anfragen einsehen' });
    }
    let requests = [];
    try {
      requests = ExtraCopyRequest.getPendingRequests();
    } catch (err) {
      console.error('getExtraCopyRequests:', err);
    }
    if (!Array.isArray(requests)) requests = [];
    res.json({ success: true, requests });
  } catch (error) {
    console.error('getExtraCopyRequests uncaught:', error);
    res.json({ success: true, requests: [] });
  }
};

/** Büro Mitarbeiter: Extra-Kopie genehmigen – entfernt ältesten Timestamp beim Antragsteller */
export const approveExtraCopyRequest = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const currentUser = await User.findByPk(userId);
    const role = getUserRole(currentUser);
    if (!isBüroMitarbeiter(role) && !isAdmin(role)) {
      return res.status(403).json({ message: 'Nur Büro Mitarbeiter können Anfragen genehmigen' });
    }
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'ID erforderlich' });
    const request = ExtraCopyRequest.getRequestById(id);
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ message: 'Anfrage nicht gefunden oder bereits bearbeitet' });
    }
    const requesterId = request.requester_user_id;

    const [data] = await ImeisUserData.findOrCreate({
      where: { user_id: requesterId },
      defaults: { cell_colors_json: '{}', row_actions_json: '{}', copy_history_json: '[]', copy_timestamps_json: '[]' }
    });
    const timestampsJson = (data.get && data.get('copy_timestamps_json')) ?? data.copy_timestamps_json;
    let copyTimestamps = [];
    try {
      copyTimestamps = timestampsJson ? JSON.parse(timestampsJson) : [];
    } catch (_) {}
    if (copyTimestamps.length > 0) {
      const sorted = [...copyTimestamps].sort((a, b) => a - b);
      sorted.shift();
      await ImeisUserData.upsert({ user_id: requesterId, copy_timestamps_json: JSON.stringify(sorted) });
    }
    ExtraCopyRequest.approveRequest(id, userId);
    ExtraCopyNotification.addNotification(requesterId, 'approved', 'Ihre Anfrage für eine Extra-Kopie wurde genehmigt. Sie können jetzt eine weitere IMEI kopieren.');
    const unread = ExtraCopyNotification.getUnreadForUser(requesterId);
    const notification = unread[0] ?? null;
    const io = req.app.get('io');
    if (io) {
      io.emit('extraCopy:decision', {
        targetUserId: String(requesterId),
        status: 'approved',
        notification
      });
    }
    await invalidateImeisCaches(requesterId);
    res.json({ success: true, message: 'Extra-Kopie genehmigt' });
  } catch (error) {
    next(error);
  }
};

/** Büro Mitarbeiter: Extra-Kopie ablehnen */
export const rejectExtraCopyRequest = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const currentUser = await User.findByPk(userId);
    const role = getUserRole(currentUser);
    if (!isBüroMitarbeiter(role) && !isAdmin(role)) {
      return res.status(403).json({ message: 'Nur Büro Mitarbeiter können Anfragen ablehnen' });
    }
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'ID erforderlich' });
    const request = ExtraCopyRequest.getRequestById(id);
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ message: 'Anfrage nicht gefunden oder bereits bearbeitet' });
    }
    const requesterId = request.requester_user_id;
    ExtraCopyRequest.rejectRequest(id);
    ExtraCopyNotification.addNotification(requesterId, 'rejected', 'Ihre Anfrage für eine Extra-Kopie wurde abgelehnt. Bitte warten Sie, bis das Rate-Limit wieder verfügbar ist.');
    const unread = ExtraCopyNotification.getUnreadForUser(requesterId);
    const notification = unread[0] ?? null;
    const io = req.app.get('io');
    if (io) {
      io.emit('extraCopy:decision', {
        targetUserId: String(requesterId),
        status: 'rejected',
        notification
      });
    }
    await invalidateImeisCaches(requesterId);
    res.json({ success: true, message: 'Anfrage abgelehnt' });
  } catch (error) {
    next(error);
  }
};

/** Benutzer: Eigene Extra-Kopie-Benachrichtigungen abrufen (Genehmigung/Ablehnung) */
export const getExtraCopyNotifications = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const list = ExtraCopyNotification.getUnreadForUser(userId);
    res.json({ success: true, notifications: list });
  } catch (error) {
    next(error);
  }
};

/** Benutzer: Benachrichtigung als gelesen markieren */
export const markExtraCopyNotificationRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'ID erforderlich' });
    const ok = ExtraCopyNotification.markAsRead(id, userId);
    if (!ok) return res.status(404).json({ message: 'Benachrichtigung nicht gefunden' });
    res.json({ success: true, message: 'Als gelesen markiert' });
  } catch (error) {
    next(error);
  }
};

async function assertOfficeOrAdmin(req, res) {
  const userId = resolveAuthUserId(req.user);
  if (userId == null) {
    res.status(401).json({ success: false, message: 'Nicht angemeldet' });
    return false;
  }
  const currentUser = await User.findByPk(userId);
  if (!currentUser) {
    res.status(401).json({ success: false, message: 'Benutzer nicht gefunden' });
    return false;
  }
  const role = getUserRole(currentUser);
  if (!(isAdmin(role) || isBüroMitarbeiter(role))) {
    res.status(403).json({ success: false, message: 'Nur Büro Mitarbeiter oder Administrator.' });
    return false;
  }
  return true;
}

/** Büro/Admin: Archiv aller angenommenen IMEIs (Zeitraum optional). */
export const getAcceptedImeisArchive = async (req, res, next) => {
  try {
    if (!(await assertOfficeOrAdmin(req, res))) return;
    const { from, to } = req.query;
    const entries = listAcceptedImeisForDisplay({ from, to });
    res.json({ success: true, entries });
  } catch (error) {
    next(error);
  }
};

/** Büro/Admin: Mehrere Einträge dauerhaft aus Angenommen-Archiv löschen. */
export const deleteAcceptedImeiArchiveEntriesBulk = async (req, res, next) => {
  try {
    if (!(await assertOfficeOrAdmin(req, res))) return;
    const { ids, from, to, allInRange } = req.body ?? {};
    if (allInRange === true) {
      const removed = permanentlyDeleteAcceptedEntriesInRange({ from, to });
      writeAuditLog(req, {
        category: 'imei',
        action: 'imei.accepted_archive.delete',
        summary: `${removed} Angenommen-Archiv Eintrag/Einträge gelöscht (Zeitraum)`,
        meta: { removed, from, to }
      });
      return res.json({
        success: true,
        message: `${removed} Eintrag/Einträge dauerhaft gelöscht.`,
        removed
      });
    }
    const idList = Array.isArray(ids) ? ids.map((id) => String(id).trim()).filter(Boolean) : [];
    if (idList.length === 0) {
      return res.status(400).json({ success: false, message: 'ids (Array) oder allInRange erforderlich.' });
    }
    const removed = permanentlyDeleteAcceptedEntriesByIds(idList);
    if (removed === 0) {
      return res.status(404).json({ success: false, message: 'Keine Einträge gefunden.' });
    }
    writeAuditLog(req, {
      category: 'imei',
      action: 'imei.accepted_archive.delete',
      summary: `${removed} Angenommen-Archiv Eintrag/Einträge gelöscht`,
      meta: { removed, count: idList.length }
    });
    res.json({
      success: true,
      message: `${removed} Eintrag/Einträge dauerhaft gelöscht.`,
      removed
    });
  } catch (error) {
    next(error);
  }
};

/** Büro/Admin: Eintrag dauerhaft aus Angenommen-Archiv löschen. */
export const deleteAcceptedImeiArchiveEntry = async (req, res, next) => {
  try {
    if (!(await assertOfficeOrAdmin(req, res))) return;
    const id = String(req.params.id || '').trim();
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID erforderlich.' });
    }
    const removed = permanentlyDeleteAcceptedEntry(id);
    if (!removed) {
      return res.status(404).json({ success: false, message: 'Eintrag nicht gefunden.' });
    }
    writeAuditLog(req, {
      category: 'imei',
      action: 'imei.accepted_archive.delete',
      summary: `Angenommen-Archiv Eintrag gelöscht: ${id}`,
      meta: { entryId: id }
    });
    res.json({ success: true, message: 'Eintrag dauerhaft gelöscht.' });
  } catch (error) {
    next(error);
  }
};
