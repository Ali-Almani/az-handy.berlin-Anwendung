import { readJsonStore, updateJsonStore } from '../utils/jsonClusterStore.js';

const FILE = 'reminder_response_notifications.json';
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

export const addNotification = (targetUserId, fromUserName, imei, action) =>
  updateJsonStore(FILE, DEFAULT(), (state) => {
    const s = normalizeState(state);
    const id = s.nextId++;
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
    s.notifications.push(notification);
    Object.assign(state, s);
    return { value: notification };
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
