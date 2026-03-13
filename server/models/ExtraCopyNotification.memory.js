import { loadJson, saveJson } from '../utils/filePersistence.js';
import { getPersist } from '../utils/persistConfig.js';
const FILE = 'extra_copy_notifications.json';

let notifications = [];
let nextId = 1;

const persist = () => {
  if (!getPersist()) return;
  saveJson(FILE, { notifications, nextId });
};

const load = () => {
  if (!getPersist()) return;
  const data = loadJson(FILE);
  if (data?.notifications?.length !== undefined) {
    notifications = data.notifications;
    nextId = (data.nextId ?? nextId) || Math.max(...notifications.map((n) => n.id || 0), 0) + 1;
  }
};

load();

export const addNotification = (targetUserId, status, message) => {
  const id = nextId++;
  notifications.push({
    id,
    target_user_id: targetUserId,
    status,
    message: message || (status === 'approved' ? 'Ihre Anfrage für eine Extra-Kopie wurde genehmigt.' : 'Ihre Anfrage für eine Extra-Kopie wurde abgelehnt.'),
    created_at: new Date().toISOString(),
    read: false
  });
  persist();
  return id;
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
