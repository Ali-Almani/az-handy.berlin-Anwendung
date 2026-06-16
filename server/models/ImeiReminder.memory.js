import { readJsonStore, updateJsonStore } from '../utils/jsonClusterStore.js';

const FILE = 'imei_reminders.json';
const DEFAULT = () => ({ reminders: [], nextId: 1 });

const normalizeState = (state) => {
  if (!state || !Array.isArray(state.reminders)) {
    return { reminders: [], nextId: 1 };
  }
  const ids = state.reminders.map((r) => Number(r?.id) || 0);
  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  const nextId = Number(state.nextId) || maxId + 1 || 1;
  return { reminders: state.reminders, nextId };
};

export const addReminder = (targetUserId, targetUserName, imei, fromUserName, fromUserId) =>
  updateJsonStore(FILE, DEFAULT(), (state) => {
    const s = normalizeState(state);
    const id = s.nextId++;
    const message = `Erinnerung: Benutzt du noch diese IMEI? (${imei})`;
    s.reminders.push({
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
    Object.assign(state, s);
    return { value: id };
  });

export const getRemindersForUser = (userId) => {
  const { reminders } = normalizeState(readJsonStore(FILE, DEFAULT()));
  return reminders
    .filter((r) => r && String(r.target_user_id) === String(userId) && !r.read)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

export const markReminderRead = (reminderId, userId) =>
  updateJsonStore(FILE, DEFAULT(), (state) => {
    const s = normalizeState(state);
    const r = s.reminders.find(
      (x) => x && String(x.id) === String(reminderId) && String(x.target_user_id) === String(userId)
    );
    if (!r) return { value: false };
    r.read = true;
    Object.assign(state, s);
    return { value: true };
  });

export const findRemindersForUserAndImei = (targetUserId, imei) => {
  const { reminders } = normalizeState(readJsonStore(FILE, DEFAULT()));
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
