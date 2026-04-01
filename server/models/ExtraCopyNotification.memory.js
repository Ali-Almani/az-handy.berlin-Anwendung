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
  if (data && Array.isArray(data.notifications)) {
    notifications = data.notifications;
    const ids = notifications.map((n) => Number(n?.id) || 0);
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    nextId = Number(data.nextId) || maxId + 1 || 1;
  } else {
    notifications = [];
  }
};

load();

export const addNotification = (targetUserId, status, message) => {
  if (!Array.isArray(notifications)) notifications = [];
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
  if (!Array.isArray(notifications)) return [];
  return notifications
    .filter((n) => n && String(n.target_user_id) === String(userId) && !n.read)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

export const markAsRead = (id, userId) => {
  if (!id) return false;
  if (!Array.isArray(notifications)) return false;
  const n = notifications.find((x) => x && String(x.id) === String(id) && String(x.target_user_id) === String(userId));
  if (n) {
    n.read = true;
    persist();
    return true;
  }
  return false;
};
