const STORAGE_REMINDERS = 'mock-imei-reminders';
const STORAGE_NOTIFICATIONS = 'mock-reminder-response-notifications';

const parseToken = (token) => {
  if (!token) return null;
  const parts = token.split('-');
  return parts.length >= 3 ? parts.slice(2, -1).join('-') : null;
};

const loadReminders = () => {
  try {
    const raw = localStorage.getItem(STORAGE_REMINDERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveReminders = (arr) => {
  localStorage.setItem(STORAGE_REMINDERS, JSON.stringify(arr));
};

const loadNotifications = () => {
  try {
    const raw = localStorage.getItem(STORAGE_NOTIFICATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveNotifications = (arr) => {
  localStorage.setItem(STORAGE_NOTIFICATIONS, JSON.stringify(arr));
};

/** Büro sendet Erinnerung – speichern für Benutzer-Anzeige und spätere Benachrichtigung */
export const mockSendReminder = (mockUsers, token, { targetUserName, imei, targetUserId }) => {
  const fromUserId = parseToken(token);
  const fromUser = mockUsers.find((u) => u.id === fromUserId);
  const fromUserName = fromUser?.name ?? 'Büro';
  let targetUser = null;
  if (targetUserId != null && targetUserId !== '') {
    targetUser = mockUsers.find((u) => String(u.id) === String(targetUserId));
  }
  if (!targetUser && targetUserName) {
    targetUser = mockUsers.find((u) => String(u.name || '').trim() === String(targetUserName || '').trim());
  }
  const resolvedTargetUserId = targetUser?.id ?? null;
  const reminders = loadReminders();
  const id = `r-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  reminders.push({
    id,
    target_user_id: resolvedTargetUserId,
    target_user_name: targetUser?.name ?? targetUserName,
    imei: String(imei || '').trim(),
    from_user_id: fromUserId,
    from_user_name: fromUserName,
    message: `Erinnerung: Benutzt du noch diese IMEI? (${imei})`,
    created_at: new Date().toISOString(),
    read: false
  });
  saveReminders(reminders);
  return { data: { success: true, message: 'Erinnerung gesendet' } };
};

/** Benutzer: Eigene Erinnerungen abrufen (für Popup) */
export const mockGetMyReminders = (token) => {
  const userId = parseToken(token);
  if (!userId) return { data: { success: true, reminders: [] } };
  const reminders = loadReminders()
    .filter((r) => String(r.target_user_id) === String(userId) && !r.read)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((r) => ({ id: r.id, message: r.message, from_user_name: r.from_user_name, read: r.read }));
  return { data: { success: true, reminders } };
};

/** Benutzer: Erinnerung als gelesen markieren */
export const mockMarkReminderRead = (token, reminderId) => {
  const userId = parseToken(token);
  if (!userId) return { data: { success: true } };
  const reminders = loadReminders();
  const r = reminders.find((x) => String(x.id) === String(reminderId) && String(x.target_user_id) === String(userId));
  if (r) {
    r.read = true;
    saveReminders(reminders);
  }
  return { data: { success: true } };
};

/** Benutzer hat reagiert – Benachrichtigung an Büro erstellen */
export const mockNotifyReminderResponse = (mockUsers, token, { imei, action }) => {
  const userId = parseToken(token);
  if (!userId) return { data: { success: true, message: 'Benachrichtigung gesendet' } };
  const currentUser = mockUsers.find((u) => u.id === userId);
  const role = currentUser?.role ?? '';
  if (role === 'Büro Mitarbeiter' || role === 'Administrator' || role === 'admin') {
    return { data: { success: true, message: 'Benachrichtigung gesendet' } };
  }
  const imeiStr = String(imei || '').trim();
  const reminders = loadReminders().filter(
    (r) => String(r.target_user_id) === String(userId) && String(r.imei || '').trim() === imeiStr && r.from_user_id
  );
  const userName = currentUser?.name ?? 'Unbekannt';
  const notifications = loadNotifications();
  const notified = new Set();
  for (const r of reminders) {
    const fromId = r.from_user_id;
    if (fromId && !notified.has(String(fromId))) {
      const actionText = action === 'angenommen' ? 'angenommen' : 'abgelehnt';
      const message = `${userName} hat auf deine Erinnerung für IMEI ${imeiStr} reagiert: ${actionText}`;
      notifications.push({
        id: `n-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        target_user_id: fromId,
        from_user_name: userName,
        imei: imeiStr,
        action: action || 'angenommen',
        message,
        created_at: new Date().toISOString(),
        read: false
      });
      notified.add(String(fromId));
    }
  }
  saveNotifications(notifications);
  try {
    const channel = new BroadcastChannel('reminder-response-notifications');
    channel.postMessage({ type: 'new', targetUserIds: [...notified] });
    channel.close();
  } catch (_) {}
  return { data: { success: true, message: 'Benachrichtigung gesendet' } };
};

/** Büro: Benachrichtigungen abrufen */
export const mockGetReminderResponseNotifications = (mockUsers, token) => {
  const userId = parseToken(token);
  if (!userId) return { data: { success: true, notifications: [] } };
  const notifications = loadNotifications()
    .filter((n) => String(n.target_user_id) === String(userId) && !n.read)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return { data: { success: true, notifications } };
};

/** Büro: Benachrichtigung als gelesen markieren */
export const mockMarkReminderResponseNotificationRead = (token, id) => {
  const userId = parseToken(token);
  if (!userId) return { data: { success: true, message: 'Als gelesen markiert' } };
  const notifications = loadNotifications();
  const n = notifications.find((x) => String(x.id) === String(id) && String(x.target_user_id) === String(userId));
  if (n) {
    n.read = true;
    saveNotifications(notifications);
  }
  return { data: { success: true, message: 'Als gelesen markiert' } };
};
