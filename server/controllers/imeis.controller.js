import ImeisUserData from '../models/ImeisUserData.js';
import User from '../models/User.js';
import * as ImeiReminder from '../models/ImeiReminder.memory.js';
import * as ExtraCopyRequest from '../models/ExtraCopyRequest.memory.js';
import * as ExtraCopyNotification from '../models/ExtraCopyNotification.memory.js';
import * as ReminderResponseNotification from '../models/ReminderResponseNotification.memory.js';

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
/** Alle Benutzer sehen die gemeinsame IMEI-Liste (von Büro/Admin hochgeladen) */
const shouldUseSharedImeiData = () => true;

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

/** Findet die User-ID, von der IMEI-Daten für Mitarbeiter geladen werden. Bevorzugt Büro/Admin bei gleicher Anzahl. */
const getSharedImeiOwnerId = async () => {
  const all = await ImeisUserData.findAll();
  let best = null;
  let bestCount = 0;
  let bestIsBueroOrAdmin = false;
  for (const row of all) {
    const imeisJson = (row.get && row.get('imeis_json')) ?? row.imeis_json;
    const rowUserId = (row.get && row.get('user_id')) ?? row.user_id;
    let arr = [];
    try {
      arr = imeisJson ? JSON.parse(imeisJson) : [];
    } catch (_) {}
    if (!Array.isArray(arr) || arr.length === 0) continue;
    const user = await User.findByPk(rowUserId);
    const role = user?.role ?? '';
    const isBueroOrAdmin = role.trim() === 'Büro Mitarbeiter' || role.toLowerCase().includes('admin');
    const count = arr.length;
    const replace = count > bestCount || (count === bestCount && isBueroOrAdmin && !bestIsBueroOrAdmin);
    if (replace) {
      bestCount = count;
      best = rowUserId;
      bestIsBueroOrAdmin = isBueroOrAdmin;
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

/** Interne Speicherlogik – wiederverwendbar für Excel-Upload (vermeidet 413 bei großem JSON) */
export const saveImeisDataToStorage = async (userId, body, app) => {
  const currentUser = await User.findByPk(userId);
  const role = currentUser?.role ?? null;
  const { imeis, cellColors, rowActions, copyHistory, copyTimestamps, removedImei } = body;

  if (removedImei) {
    await removeImeiFromAllLists(removedImei);
  }

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
    const io = app?.get?.('io');
    const dataChanged = imeis !== undefined || rowActions !== undefined || removedImei;
    if (io && dataChanged) io.emit('imeis:updated');
    return;
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

  const io = app?.get?.('io');
  const dataChanged = imeis !== undefined || rowActions !== undefined || removedImei;
  if (io && dataChanged) io.emit('imeis:updated');
};

export const saveImeisData = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    await saveImeisDataToStorage(userId, req.body, req.app);
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

    // Echtzeit: Alle Benutzer benachrichtigen (IMEI-Liste hat sich geändert: angenommen = entfernt, abgelehnt = rowActions geändert)
    const io = req.app?.get?.('io');
    if (io) io.emit('imeis:updated');

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

/** Benutzer: Benachrichtigung an Büro senden, wenn auf Erinnerung reagiert (angenommen/abgelehnt) */
export const notifyReminderResponse = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const currentUser = await User.findByPk(userId);
    const role = currentUser?.role ?? null;
    if (isBüroMitarbeiter(role) || isAdmin(role)) {
      return res.status(403).json({ message: 'Büro Mitarbeiter und Administratoren senden keine Erinnerungs-Antworten' });
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
    const userId = req.user.userId;
    const currentUser = await User.findByPk(userId);
    const role = currentUser?.role ?? null;
    if (!isBüroMitarbeiter(role) && !isAdmin(role)) {
      return res.status(403).json({ message: 'Nur Büro Mitarbeiter können diese Benachrichtigungen einsehen' });
    }
    const list = ReminderResponseNotification.getUnreadForUser(userId);
    res.json({ success: true, notifications: list });
  } catch (error) {
    next(error);
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
    const role = currentUser?.role ?? null;
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
    const userId = req.user.userId;
    const currentUser = await User.findByPk(userId);
    const role = currentUser?.role ?? null;
    if (!isBüroMitarbeiter(role) && !isAdmin(role)) {
      return res.status(403).json({ message: 'Nur Büro Mitarbeiter können Anfragen einsehen' });
    }
    const requests = ExtraCopyRequest.getPendingRequests();
    res.json({ success: true, requests });
  } catch (error) {
    next(error);
  }
};

/** Büro Mitarbeiter: Extra-Kopie genehmigen – entfernt ältesten Timestamp beim Antragsteller */
export const approveExtraCopyRequest = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const currentUser = await User.findByPk(userId);
    const role = currentUser?.role ?? null;
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
    const role = currentUser?.role ?? null;
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
