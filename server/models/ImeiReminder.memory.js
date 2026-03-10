import { loadJson, saveJson } from '../utils/filePersistence.js';

const PERSIST = process.env.PERSIST_MEMORY_DATA !== 'false';
const FILE = 'imei_reminders.json';

let reminders = [];
let nextId = 1;

const persist = () => {
  if (!PERSIST) return;
  saveJson(FILE, { reminders, nextId });
};

const load = () => {
  if (!PERSIST) return;
  const data = loadJson(FILE);
  if (data?.reminders?.length) {
    reminders = data.reminders;
    nextId = (data.nextId ?? nextId) || Math.max(...reminders.map((r) => r.id || 0), 0) + 1;
  }
};

load();

export const addReminder = (targetUserId, targetUserName, imei, fromUserName, fromUserId) => {
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
  return reminders
    .filter((r) => String(r.target_user_id) === String(userId) && !r.read)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

export const markReminderRead = (reminderId, userId) => {
  const r = reminders.find((x) => String(x.id) === String(reminderId) && String(x.target_user_id) === String(userId));
  if (r) {
    r.read = true;
    persist();
    return true;
  }
  return false;
};

/** Finde Erinnerungen für Benutzer+IMEI (für Benachrichtigung an Büro bei Aktion) */
export const findRemindersForUserAndImei = (targetUserId, imei) => {
  const imeiStr = String(imei || '').trim();
  const targetStr = String(targetUserId || '');
  return reminders.filter(
    (r) => String(r.target_user_id) === targetStr && String(r.imei || '').trim() === imeiStr && (r.from_user_id || r.from_user_name)
  );
};
