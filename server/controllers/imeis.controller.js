import ImeisUserData from '../models/ImeisUserData.js';
import User from '../models/User.js';
import * as ImeiReminder from '../models/ImeiReminder.memory.js';

const USE_MEMORY_DB = process.env.USE_MEMORY_DB === 'true' ||
  (!process.env.DATABASE_URL && !process.env.PG_DATABASE && !process.env.PG_USER);

const isMitarbeiterShop = (role) => {
  if (!role || typeof role !== 'string') return false;
  return role.trim() === 'Mitarbeiter shop';
};

const isBüroMitarbeiter = (role) => {
  if (!role || typeof role !== 'string') return false;
  return role.trim() === 'Büro Mitarbeiter';
};

const isAdmin = (role) => role && typeof role === 'string' && (role.toLowerCase().includes('admin') || role.trim() === 'Administrator');
const shouldUseSharedImeiData = (role) => isMitarbeiterShop(role) || isBüroMitarbeiter(role) || isAdmin(role);

/** Merge copy_history aus allen Benutzern für Verlauf (Büro Mitarbeiter sieht gesamte Historie) */
const getMergedCopyHistory = async () => {
  const all = await ImeisUserData.findAll();
  const merged = [];
  for (const row of all) {
    const historyJson = (row.get && row.get('copy_history_json')) ?? row.copy_history_json;
    if (historyJson) {
      try {
        const arr = JSON.parse(historyJson);
        if (Array.isArray(arr)) merged.push(...arr);
      } catch (_) {}
    }
  }
  return merged
    .filter((e) => e && (e.imei || e.timestamp))
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .slice(0, 200);
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
};

/** Findet die User-ID, von der IMEI-Daten für Mitarbeiter geladen werden (User mit IMEI-Daten) */
const getSharedImeiOwnerId = async () => {
  const all = await ImeisUserData.findAll();
  let best = null;
  let bestCount = 0;
  for (const row of all) {
    const imeisJson = (row.get && row.get('imeis_json')) ?? row.imeis_json;
    const rowUserId = (row.get && row.get('user_id')) ?? row.user_id;
    let arr = [];
    try {
      arr = imeisJson ? JSON.parse(imeisJson) : [];
    } catch (_) {}
    if (Array.isArray(arr) && arr.length > bestCount) {
      bestCount = arr.length;
      best = rowUserId;
    }
  }
  if (best) return best;
  const admin = await User.findOne({ where: { email: 'admin@az-handy.berlin' } });
  return admin?.id ?? null;
};

export const getImeisData = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const currentUser = await User.findByPk(userId);
    const role = currentUser?.role ?? null;

    // Mitarbeiter shop & Büro Mitarbeiter: IMEI-Liste vom Admin oder User mit Daten laden, eigene copyHistory/copyTimestamps behalten
    const dataUserId = shouldUseSharedImeiData(role) ? (await getSharedImeiOwnerId()) ?? userId : userId;

    if (USE_MEMORY_DB) {
      const [data] = await ImeisUserData.findOrCreate({
        where: { user_id: dataUserId },
        defaults: { cell_colors_json: '{}', row_actions_json: '{}', copy_history_json: '[]', copy_timestamps_json: '[]' }
      });
      let imeis = data.imeis_json ? JSON.parse(data.imeis_json) : [];
      let cellColors = data.cell_colors_json ? JSON.parse(data.cell_colors_json) : {};
      let rowActions = data.row_actions_json ? JSON.parse(data.row_actions_json) : {};
      let copyHistory = [];
      let copyTimestamps = [];

      if (shouldUseSharedImeiData(role) && dataUserId !== userId) {
        const [ownData] = await ImeisUserData.findOrCreate({
          where: { user_id: userId },
          defaults: { cell_colors_json: '{}', row_actions_json: '{}', copy_history_json: '[]', copy_timestamps_json: '[]' }
        });
        copyTimestamps = ownData.copy_timestamps_json ? JSON.parse(ownData.copy_timestamps_json) : [];
        let rawHistory = ownData.copy_history_json ? JSON.parse(ownData.copy_history_json) : [];
        if (isMitarbeiterShop(role)) {
          const userName = currentUser?.name || '';
          copyHistory = rawHistory.filter((e) => e && String(e.userName || '').trim() === String(userName).trim());
        } else {
          copyHistory = rawHistory;
        }
      } else {
        copyHistory = data.copy_history_json ? JSON.parse(data.copy_history_json) : [];
        copyTimestamps = data.copy_timestamps_json ? JSON.parse(data.copy_timestamps_json) : [];
      }
      if (isBüroMitarbeiter(role)) {
        copyHistory = await getMergedCopyHistory();
      }

      return res.json({
        success: true,
        imeis,
        cellColors,
        rowActions,
        copyHistory,
        copyTimestamps
      });
    }

    const [data, created] = await ImeisUserData.findOrCreate({
      where: { user_id: dataUserId },
      defaults: { cell_colors_json: '{}', row_actions_json: '{}', copy_history_json: '[]' }
    });

    let imeis = data.imeis_json ? JSON.parse(data.imeis_json) : [];
    let cellColors = data.cell_colors_json ? JSON.parse(data.cell_colors_json) : {};
    let rowActions = data.row_actions_json ? JSON.parse(data.row_actions_json) : {};
    let copyHistory = [];
    let copyTimestamps = [];

    if (shouldUseSharedImeiData(role) && dataUserId !== userId) {
      const [ownData] = await ImeisUserData.findOrCreate({
        where: { user_id: userId },
        defaults: { cell_colors_json: '{}', row_actions_json: '{}', copy_history_json: '[]' }
      });
      copyTimestamps = ownData.copy_timestamps_json ? JSON.parse(ownData.copy_timestamps_json) : [];
      let rawHistory = ownData.copy_history_json ? JSON.parse(ownData.copy_history_json) : [];
      if (isMitarbeiterShop(role)) {
        const userName = currentUser?.name || '';
        copyHistory = rawHistory.filter((e) => e && String(e.userName || '').trim() === String(userName).trim());
      } else {
        copyHistory = rawHistory;
      }
    } else {
      copyHistory = data.copy_history_json ? JSON.parse(data.copy_history_json) : [];
      copyTimestamps = data.copy_timestamps_json ? JSON.parse(data.copy_timestamps_json) : [];
    }
    if (isBüroMitarbeiter(role)) {
      copyHistory = await getMergedCopyHistory();
    }

    res.json({
      success: true,
      imeis,
      cellColors,
      rowActions,
      copyHistory,
      copyTimestamps
    });
  } catch (error) {
    next(error);
  }
};

export const saveImeisData = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const currentUser = await User.findByPk(userId);
    const role = currentUser?.role ?? null;
    const { imeis, cellColors, rowActions, copyHistory, copyTimestamps, removedImei } = req.body;

    if (removedImei) {
      await removeImeiFromAllLists(removedImei);
    }

    // Mitarbeiter shop: nur copyHistory, copyTimestamps und rowActions – keine IMEI-Änderungen
    const isMitarbeiter = isMitarbeiterShop(role);
    const ownerId = await getSharedImeiOwnerId();
    const usesSharedData = shouldUseSharedImeiData(role) && ownerId && ownerId !== userId;

    const payload = {
      user_id: userId,
      ...(!isMitarbeiter && imeis !== undefined && { imeis_json: JSON.stringify(imeis) }),
      ...(!isMitarbeiter && cellColors !== undefined && { cell_colors_json: JSON.stringify(cellColors) }),
      ...(!isMitarbeiter && !usesSharedData && rowActions !== undefined && { row_actions_json: JSON.stringify(rowActions) }),
      ...(copyHistory !== undefined && { copy_history_json: JSON.stringify(copyHistory) }),
      ...(copyTimestamps !== undefined && { copy_timestamps_json: JSON.stringify(copyTimestamps) })
    };

    const mergeRowActionsIntoOwner = async () => {
      if (rowActions === undefined || !ownerId) return;
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
      await ImeisUserData.upsert(payload);
      if (usesSharedData && rowActions !== undefined) await mergeRowActionsIntoOwner();
      return res.json({ success: true, message: 'IMEIS-Daten gespeichert' });
    }

    const [data] = await ImeisUserData.findOrCreate({
      where: { user_id: userId },
      defaults: { cell_colors_json: '{}', row_actions_json: '{}', copy_history_json: '[]' }
    });

    if (!isMitarbeiter && imeis !== undefined) data.imeis_json = JSON.stringify(imeis);
    if (!isMitarbeiter && cellColors !== undefined) data.cell_colors_json = JSON.stringify(cellColors);
    if (!isMitarbeiter && !usesSharedData && rowActions !== undefined) data.row_actions_json = JSON.stringify(rowActions);
    if (usesSharedData && rowActions !== undefined) {
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
    if (copyHistory !== undefined) data.copy_history_json = JSON.stringify(copyHistory);
    if (copyTimestamps !== undefined) data.copy_timestamps_json = JSON.stringify(copyTimestamps);
    await data.save();

    res.json({ success: true, message: 'IMEIS-Daten gespeichert' });
  } catch (error) {
    next(error);
  }
};

/** Büro Mitarbeiter: Aktion (angenommen/abgelehnt) für Einträge anderer Benutzer aktualisieren */
export const updateHistoryAction = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const currentUser = await User.findByPk(userId);
    const role = currentUser?.role ?? null;
    if (!isBüroMitarbeiter(role)) {
      return res.status(403).json({ message: 'Nur Büro Mitarbeiter dürfen Aktionen für andere aktualisieren' });
    }
    const { imei, userName, newAction } = req.body;
    if (!imei || !userName) {
      return res.status(400).json({ message: 'imei und userName erforderlich' });
    }

    const targetUser = await User.findOne({ where: { name: userName } });
    if (!targetUser) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    const [targetData] = await ImeisUserData.findOrCreate({
      where: { user_id: targetUser.id },
      defaults: { cell_colors_json: '{}', row_actions_json: '{}', copy_history_json: '[]', copy_timestamps_json: '[]' }
    });
    const historyJson = (targetData.get && targetData.get('copy_history_json')) ?? targetData.copy_history_json;
    let copyHistory = [];
    try {
      copyHistory = historyJson ? JSON.parse(historyJson) : [];
    } catch (_) {}
    const updatedHistory = copyHistory.filter(
      (e) => !(e && String(e.imei || '').trim() === String(imei).trim() && String(e.userName || '').trim() === String(userName).trim())
    );
    await ImeisUserData.upsert({ user_id: targetUser.id, copy_history_json: JSON.stringify(updatedHistory) });

    if (newAction === 'angenommen') {
      await removeImeiFromAllLists(imei);
    }
    if (newAction === 'abgelehnt') {
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

    res.json({ success: true, message: 'Aktion aktualisiert', rowActions: newAction === 'abgelehnt' ? {} : undefined });
  } catch (error) {
    next(error);
  }
};

/** Büro Mitarbeiter: Erinnerung an Mitarbeiter senden („Benutzt du noch diese IMEI?“) */
export const sendImeiReminder = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const currentUser = await User.findByPk(userId);
    const role = currentUser?.role ?? null;
    if (!isBüroMitarbeiter(role)) {
      return res.status(403).json({ message: 'Nur Büro Mitarbeiter dürfen Erinnerungen senden' });
    }
    const { targetUserName, imei } = req.body;
    if (!targetUserName || !imei) {
      return res.status(400).json({ message: 'targetUserName und imei erforderlich' });
    }

    const targetUser = await User.findOne({ where: { name: targetUserName } });
    if (!targetUser) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    const targetId = targetUser.id ?? targetUser._id ?? targetUser.get?.('id');
    const targetName = targetUser.name ?? targetUser.get?.('name') ?? targetUserName;
    const fromName = currentUser?.name ?? currentUser?.get?.('name') ?? 'Büro';

    ImeiReminder.addReminder(targetId, targetName, imei, fromName);

    res.json({ success: true, message: 'Erinnerung gesendet' });
  } catch (error) {
    next(error);
  }
};

/** Eigene IMEI-Erinnerungen abrufen */
export const getMyImeiReminders = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const reminders = ImeiReminder.getRemindersForUser(userId);
    res.json({ success: true, reminders });
  } catch (error) {
    next(error);
  }
};

/** IMEI-Erinnerung als gelesen markieren */
export const markImeiReminderRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'ID erforderlich' });
    const ok = ImeiReminder.markReminderRead(id, userId);
    if (!ok) return res.status(404).json({ message: 'Erinnerung nicht gefunden' });
    res.json({ success: true, message: 'Als gelesen markiert' });
  } catch (error) {
    next(error);
  }
};
