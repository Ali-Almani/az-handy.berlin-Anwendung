import { loadJson, saveJson } from '../utils/filePersistence.js';
import { getPersist } from '../utils/persistConfig.js';
const FILE = 'imei_reminders.json';

let reminders = [];
let nextId = 1;

const persist = () => {
  if (!getPersist()) return;
  saveJson(FILE, { reminders, nextId });
};

const load = () => {
  if (!getPersist()) return;
  const data = loadJson(FILE);
  if (data && Array.isArray(data.reminders)) {
    reminders = data.reminders;
    const ids = reminders.map((r) => Number(r?.id) || 0);
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    nextId = Number(data.nextId) || maxId + 1 || 1;
  } else {
    reminders = [];
  }
};

load();

export const addReminder = (targetUserId, targetUserName, imei, fromUserName, fromUserId) => {
  if (!Array.isArray(reminders)) reminders = [];
  const id = nextId++;
  const message = `Erinnerung: Benutzt du noch diese IMEI? (${imei})`;
  reminders.push({
    id,
    target_user_id: targetUserId,
    target_user_name: targetUserName || 'Unbekannt',
    imei: String(imei || '').trim(),
    message,
    from_user_name: fromUserName || 'Büro',
    from_user_id: fromUserId ?? null,
    created_at: new Date().toISOString(),
    read: false
  });
  persist();
  return id;
};

export const getRemindersForUser = (userId) => {
  if (!Array.isArray(reminders)) return [];
  return reminders
    .filter((r) => r && String(r.target_user_id) === String(userId) && !r.read)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

export const markReminderRead = (reminderId, userId) => {
  if (!Array.isArray(reminders)) return false;
  const r = reminders.find((x) => x && String(x.id) === String(reminderId) && String(x.target_user_id) === String(userId));
  if (r) {
    r.read = true;
    persist();
    return true;
  }
  return false;
};

/** Finde Erinnerungen für Benutzer+IMEI (für Benachrichtigung an Büro bei Aktion) */
export const findRemindersForUserAndImei = (targetUserId, imei) => {
  if (!Array.isArray(reminders)) return [];
  const imeiStr = String(imei || '').trim();
  const targetStr = String(targetUserId || '');
  return reminders.filter(
    (r) =>
      r &&
      String(r.target_user_id) === targetStr &&
      String(r.imei || '').trim() === imeiStr &&
      (r.from_user_id || r.from_user_name)
  );
};
