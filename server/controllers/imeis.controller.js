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
import { getSonderPublishedEntries, addSonderImeiApprovals } from '../utils/sonderImeiStore.js';

const USE_MEMORY_DB = process.env.USE_MEMORY_DB === 'true' ||
  (!process.env.DATABASE_URL && !process.env.PG_DATABASE && !process.env.PG_USER);

const normHistUserName = (s) =>
  String(s || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

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

/** Einsatzort/Standort-Key normalisieren (z.B. "KM 127" == "KM127") */
const normalizeEinsatzOrtKey = (ort) => {
  return String(ort ?? '')
    .replace(/\u00a0/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[-_/]+/g, '')
    .replace(/\s+/g, '');
};

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

/** Merge copy_history aus allen Benutzern für Verlauf (Büro Mitarbeiter sieht gesamte Historie) */
const getMergedCopyHistory = async () => {
  const all = await ImeisUserData.findAll();
  // Cache: user_id -> name (damit "Benutzer" im Verlauf immer sichtbar ist)
  const userNameById = new Map();
  const merged = [];
  for (const row of all) {
    const rowUserId = (row.get && row.get('user_id')) ?? row.user_id;
    const historyJson = (row.get && row.get('copy_history_json')) ?? row.copy_history_json;
    if (historyJson) {
      try {
        const arr = JSON.parse(historyJson);
        if (Array.isArray(arr)) {
          for (const e of arr) {
            if (e && (e.imei || e.timestamp)) {
              let userName = e.userName;
              if (!userName) {
                const k = String(rowUserId ?? '');
                if (k) {
                  if (!userNameById.has(k)) {
                    try {
                      const u = await User.findByPk(rowUserId);
                      const n = String(u?.name ?? u?.get?.('name') ?? '').trim();
                      userNameById.set(k, n || null);
                    } catch (_) {
                      userNameById.set(k, null);
                    }
                  }
                  userName = userNameById.get(k) || userName;
                }
              }
              merged.push({ ...e, userName, historyOwnerUserId: rowUserId });
            }
          }
        }
      } catch (_) {}
    }
  }
  return merged
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .slice(0, 200);
};

/** Merge copy_history nur von Benutzern mit gleichem einsatz_ort (Teamleiter shop sieht Verlauf seiner Kategorie) */
const getCopyHistoryForEinsatzOrt = async (einsatzOrt) => {
  if (!einsatzOrt || typeof einsatzOrt !== 'string') return [];
  const targetKey = normalizeEinsatzOrtKey(einsatzOrt);
  if (!targetKey) return [];

  let usersInCategory = [];
  if (USE_MEMORY_DB) {
    // Memory: keine SQL-Funktionen → robust in JS normalisieren
    const allUsers = await User.findAll({ attributes: ['id', 'einsatz_ort'] });
    usersInCategory = (allUsers || []).filter((u) => {
      const ortRaw = u?.einsatz_ort ?? u?.get?.('einsatz_ort') ?? '';
      const ort = normalizeEinsatzOrtKey(ortRaw);
      return ort && ort === targetKey;
    });
  } else {
    // PostgreSQL: trim + case-insensitive + entfernt Leerzeichen/Bindestriche/Unterstriche
    usersInCategory = await User.findAll({
      where: sqlWhere(
        fn(
          'LOWER',
          fn(
            'REGEXP_REPLACE',
            fn('BTRIM', col('einsatz_ort')),
            '[\\s\\-_]+',
            '',
            'g'
          )
        ),
        targetKey
      ),
      attributes: ['id']
    });
  }

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
  // Cache: user_id -> name (damit "Benutzer" im Verlauf immer sichtbar ist)
  const userNameById = new Map();
  const merged = [];
  for (const row of all) {
    const rowUserId = (row.get && row.get('user_id')) ?? row.user_id;
    const historyJson = (row.get && row.get('copy_history_json')) ?? row.copy_history_json;
    if (historyJson) {
      try {
        const arr = JSON.parse(historyJson);
        if (Array.isArray(arr)) {
          for (const e of arr) {
            if (e && (e.imei || e.timestamp)) {
              let userName = e.userName;
              if (!userName) {
                const k = String(rowUserId ?? '');
                if (k) {
                  if (!userNameById.has(k)) {
                    try {
                      const u = await User.findByPk(rowUserId);
                      const n = String(u?.name ?? u?.get?.('name') ?? '').trim();
                      userNameById.set(k, n || null);
                    } catch (_) {
                      userNameById.set(k, null);
                    }
                  }
                  userName = userNameById.get(k) || userName;
                }
              }
              merged.push({ ...e, userName, historyOwnerUserId: rowUserId });
            }
          }
        }
      } catch (_) {}
    }
  }
  return merged
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .slice(0, 200);
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
  const imeiStr = String(imeiToRemove || '').trim();
  if (!imeiStr) return;
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
    const filtered = Array.isArray(arr) ? arr.filter((item) => String(item?.imei || '').trim() !== imeiStr) : [];
    let hadRowAction = false;
    Object.keys(rowActions).forEach((rowId) => {
      if (rowId.includes(`-${imeiStr}-`)) {
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
  await removeImeiFromAllCopyHistories(imeiStr);
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
      if (isBüroMitarbeiter(role)) {
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

      return res.json({
        success: true,
        imeis,
        cellColors,
        rowActions,
        copyHistory,
        copyTimestamps,
        sonderImeis: getSonderPublishedEntries(),
        ...(debug ? { debug } : {})
      });
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
    if (isBüroMitarbeiter(role)) {
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

    res.json({
      success: true,
      imeis,
      cellColors,
      rowActions,
      copyHistory,
      copyTimestamps,
      sonderImeis: getSonderPublishedEntries(),
      ...(debug ? { debug } : {})
    });
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

/** Wissenschaftliche Notation in Ziffernfolge (ohne JS-Number-Rundung), z. B. für Excel-Exporte. */
function sciNotationToDigitString(s) {
  const t = String(s ?? '').trim().replace(/\s+/g, '');
  const match = t.match(/^([+-]?)(\d+(?:\.\d+)?)[eE]([+-]?\d+)$/i);
  if (!match) return null;
  const sign = match[1];
  const mant = match[2];
  const exp = parseInt(match[3], 10);
  const dot = mant.indexOf('.');
  const intPart = dot === -1 ? mant : mant.slice(0, dot);
  const frac = dot === -1 ? '' : mant.slice(dot + 1);
  let all = intPart + frac;
  const decShift = frac.length;
  let shift = exp - decShift;
  if (shift >= 0) {
    all += '0'.repeat(shift);
  } else {
    const rm = -shift;
    if (all.length <= rm) return null;
    all = all.slice(0, all.length - rm);
  }
  all = all.replace(/^0+/, '') || '0';
  if (sign === '-') return null;
  return all;
}

function normalizeImeiDedupKey(imei) {
  const raw = String(imei ?? '').trim().replace(/\s+/g, '');
  if (!raw) return '';
  if (/[eE][+-]?\d+/.test(raw)) {
    const fromSci = sciNotationToDigitString(raw);
    if (fromSci && fromSci.length >= 14) return fromSci;
  }
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 14) return digits;
  return raw;
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
      merged[idx] = {
        ...prev,
        ...item,
        imei:
          item.imei != null && String(item.imei).trim() !== ''
            ? String(item.imei).trim()
            : prev?.imei,
        _addedAt: prev?._addedAt || item._addedAt || nowIso
      };
      updatedFromUpload += 1;
      continue;
    }
    keyToIndex.set(k, merged.length);
    const row = {
      ...item,
      imei:
        item.imei != null && String(item.imei).trim() !== '' ? String(item.imei).trim() : String(item.imei),
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
  // Immer dieselbe user_id-Zeile wie die Quelle der bestehenden Liste (vermeidet Schreiben nur beim Uploader).
  await saveImeisDataToStorage(baseUserId, { imeis: merged }, app);
  return {
    merged,
    addedRows,
    added,
    skippedDuplicate,
    updatedFromUpload,
    previousCount,
    total: merged.length
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
          (existingArr || []).map(
            (e) =>
              `${String(e?.imei || '').trim()}|${normHistUserName(e?.userName)}|${String(e?.timestamp || '').trim()}|${String(e?.action || '').trim()}`
          )
        );

        const additions = [];
        Object.entries(rowActions).forEach(([rowId, act]) => {
          if (!act || typeof act !== 'object') return;
          const actName = String(act.userName || '').trim();
          if (actName !== myName) return;
          const action = String(act.action || '').trim();
          if (action !== 'reservieren' && action !== 'dereserviert') return;
          // rowId enthält IMEI: `${sheet}-${imei}-${row}`
          const parts = String(rowId || '').split('-');
          if (parts.length < 3) return;
          const imei = String(parts[1] || '').trim();
          if (!imei) return;
          const ts = String(act.timestamp || new Date().toISOString()).trim();
          const key = `${imei}|${normHistUserName(myName)}|${ts}|${action}`;
          if (existingKey.has(key)) return;
          existingKey.add(key);
          additions.push({ imei, product: '-', action, timestamp: ts, userName: myName });
        });

        if (additions.length > 0) {
          augmentedCopyHistory = [...additions, ...(existingArr || [])]
            .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
            .slice(0, 200);
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
  const usesSharedData = shouldUseSharedImeiData(role) && ownerId && ownerId !== userId;

  const payload = {
    user_id: userId,
    ...(!isMitarbeiter && !canEditSharedImeiList && imeis !== undefined && { imeis_json: JSON.stringify(imeis) }),
    ...(!isMitarbeiter && !canEditSharedImeiList && cellColors !== undefined && { cell_colors_json: JSON.stringify(cellColors) }),
    ...(!isMitarbeiter && !usesSharedData && rowActions !== undefined && { row_actions_json: JSON.stringify(rowActions) }),
    ...((augmentedCopyHistory !== undefined ? augmentedCopyHistory : copyHistory) !== undefined &&
      !clearingMasterList && { copy_history_json: JSON.stringify(augmentedCopyHistory !== undefined ? augmentedCopyHistory : copyHistory) }),
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
  if (copyHistory !== undefined && !clearingMasterList) data.copy_history_json = JSON.stringify(copyHistory);
  if (copyTimestamps !== undefined && !clearingMasterList) data.copy_timestamps_json = JSON.stringify(copyTimestamps);
  await data.save();

  const io = app?.get?.('io');
  const dataChanged = imeis !== undefined || rowActions !== undefined || removedImei || clearingMasterList;
  if (io && dataChanged) io.emit('imeis:updated');
};

export const saveImeisData = async (req, res, next) => {
  try {
    const userId = resolveAuthUserId(req.user);
    if (userId == null) {
      return res.status(401).json({ success: false, message: 'Nicht angemeldet' });
    }
    await saveImeisDataToStorage(userId, req.body, req.app);
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
    const { imei, userName, newAction, targetUserId, historyTimestamp } = req.body;
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
