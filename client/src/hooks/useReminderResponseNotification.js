import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getReminderResponseNotificationsApi, markReminderResponseNotificationReadApi } from '../services/imeis.service';
import { getSocket } from '../services/socket';
import { isBüroMitarbeiter, isAdmin } from '../utils/roles';

const POLL_MS = 20000;

export function useReminderResponseNotification() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await getReminderResponseNotificationsApi();
      setNotifications(res?.notifications ?? []);
    } catch {
      setNotifications([]);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || (!isBüroMitarbeiter(user) && !isAdmin(user))) return;

    const socket = getSocket();
    let bcChannel = null;
    try {
      bcChannel = new BroadcastChannel('reminder-response-notifications');
      bcChannel.onmessage = (e) => {
        const payload = e?.data;
        const targetIds = payload?.targetUserIds ?? [];
        const myId = user?.id != null ? String(user.id) : null;
        if (myId && targetIds.some((id) => String(id) === myId)) {
          fetchNotifications();
        }
      };
    } catch (_) {}

    const onReminderResponseNew = (payload) => {
      const targetId = payload?.targetUserId ? String(payload.targetUserId) : null;
      const myId = user?.id != null ? String(user.id) : null;
      if (targetId && myId && targetId === myId) {
        const n = payload?.notification;
        if (n) {
          setNotifications((prev) => [n, ...prev.filter((x) => String(x.id) !== String(n.id))]);
        } else {
          fetchNotifications();
        }
      }
    };
    if (socket) {
      socket.on('reminder-response:new', onReminderResponseNew);
    }

    let intervalId = null;

    const startPolling = () => {
      fetchNotifications();
      intervalId = setInterval(fetchNotifications, POLL_MS);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        stopPolling();
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (!document.hidden) {
      startPolling();
    }

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (socket) socket.off('reminder-response:new', onReminderResponseNew);
      if (bcChannel) bcChannel.close();
    };
  }, [user?.id, fetchNotifications]);

  const markAsRead = useCallback(async (id) => {
    try {
      await markReminderResponseNotificationReadApi(id);
      setNotifications((prev) => prev.filter((n) => String(n.id) !== String(id)));
    } catch {}
  }, []);

  return {
    notifications,
    hasUnreadNotifications: notifications.length > 0,
    notificationCount: notifications.length,
    markAsRead,
    refresh: fetchNotifications
  };
}
