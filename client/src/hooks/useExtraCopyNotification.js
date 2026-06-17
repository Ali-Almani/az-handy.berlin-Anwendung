import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getExtraCopyNotificationsApi, markExtraCopyNotificationReadApi } from '../services/imeis.service';
import { getSocket } from '../services/socket';
import { isBüroMitarbeiter, isAdmin } from '../utils/roles';

const POLL_MS = 20000;

export function useExtraCopyNotification() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await getExtraCopyNotificationsApi();
      setNotifications(res?.notifications ?? []);
    } catch {
      setNotifications([]);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || isBüroMitarbeiter(user) || isAdmin(user)) return;

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
    };
  }, [user?.id, fetchNotifications]);

  useEffect(() => {
    if (!user?.id || isBüroMitarbeiter(user) || isAdmin(user)) return;

    const socket = getSocket();

    const onDecision = (payload) => {
      const targetId = payload?.targetUserId ? String(payload.targetUserId) : null;
      const myId = user?.id != null ? String(user.id) : null;
      if (targetId && myId && targetId === myId) {
        fetchNotifications();
      }
    };

    if (socket) socket.on('extraCopy:decision', onDecision);

    return () => {
      if (socket) socket.off('extraCopy:decision', onDecision);
    };
  }, [user?.id, fetchNotifications]);

  const markAsRead = useCallback(async (id) => {
    try {
      await markExtraCopyNotificationReadApi(id);
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
