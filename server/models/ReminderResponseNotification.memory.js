import { loadJson, saveJson } from '../utils/filePersistence.js';

const PERSIST = process.env.PERSIST_MEMORY_DATA !== 'false';
const FILE = 'reminder_response_notifications.json';

let notifications = [];
let nextId = 1;

const persist = () => {
  if (!PERSIST) return;
  saveJson(FILE, { notifications, nextId });
};

const load = () => {
  if (!PERSIST) return;
  const data = loadJson(FILE);
  if (data?.notifications?.length !== undefined) {
    notifications = data.notifications;
    nextId = (data.nextId ?? nextId) || Math.max(...notifications.map((n) => n.id || 0), 0) + 1;
  }
};

load();

/** Benachrichtigung an Büro-Mitarbeiter: Benutzer hat auf Erinnerung reagiert */
export const addNotification = (targetUserId, fromUserName, imei, action) => {
  const id = nextId++;
  const actionText = action === 'angenommen' ? 'angenommen' : 'abgelehnt';
  const message = `${fromUserName} hat auf deine Erinnerung für IMEI ${imei} reagiert: ${actionText}`;
  const notification = {
    id,
    target_user_id: targetUserId,
    from_user_name: fromUserName || 'Unbekannt',
    imei: String(imei || '').trim(),
    action: action || 'angenommen',
    message,
    created_at: new Date().toISOString(),
    read: false
  };
  notifications.push(notification);
  persist();
  return notification;
};

export const getUnreadForUser = (userId) => {
  return notifications
    .filter((n) => String(n.target_user_id) === String(userId) && !n.read)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

export const markAsRead = (id, userId) => {
  const n = notifications.find((x) => String(x.id) === String(id) && String(x.target_user_id) === String(userId));
  if (n) {
    n.read = true;
    persist();
    return true;
  }
  return false;
};
