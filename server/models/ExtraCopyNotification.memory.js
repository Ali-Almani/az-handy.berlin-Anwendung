import { readJsonStore, updateJsonStore } from '../utils/jsonClusterStore.js';

const FILE = 'extra_copy_notifications.json';
const DEFAULT = () => ({ notifications: [], nextId: 1 });

const normalizeState = (state) => {
  if (!state || !Array.isArray(state.notifications)) {
    return { notifications: [], nextId: 1 };
  }
  const ids = state.notifications.map((n) => Number(n?.id) || 0);
  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  const nextId = Number(state.nextId) || maxId + 1 || 1;
  return { notifications: state.notifications, nextId };
};

export const addNotification = (targetUserId, status, message) =>
  updateJsonStore(FILE, DEFAULT(), (state) => {
    const s = normalizeState(state);
    const id = s.nextId++;
    s.notifications.push({
      id,
      target_user_id: targetUserId,
      status,
      message:
        message ||
        (status === 'approved'
          ? 'Ihre Anfrage für eine Extra-Kopie wurde genehmigt.'
          : 'Ihre Anfrage für eine Extra-Kopie wurde abgelehnt.'),
      created_at: new Date().toISOString(),
      read: false
    });
    Object.assign(state, s);
    return { value: id };
  });

export const getUnreadForUser = (userId) => {
  const { notifications } = normalizeState(readJsonStore(FILE, DEFAULT()));
  return notifications
    .filter((n) => n && String(n.target_user_id) === String(userId) && !n.read)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

export const markAsRead = (id, userId) =>
  updateJsonStore(FILE, DEFAULT(), (state) => {
    const s = normalizeState(state);
    const n = s.notifications.find(
      (x) => x && String(x.id) === String(id) && String(x.target_user_id) === String(userId)
    );
    if (!n) return { value: false };
    n.read = true;
    Object.assign(state, s);
    return { value: true };
  });
