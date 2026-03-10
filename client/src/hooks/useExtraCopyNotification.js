import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getExtraCopyNotificationsApi, markExtraCopyNotificationReadApi } from '../services/imeis.service';
import { isBüroMitarbeiter, isAdmin } from '../utils/roles';

const POLL_MS = 2500;

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
    fetchNotifications();
    const id = setInterval(fetchNotifications, POLL_MS);
    return () => clearInterval(id);
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
