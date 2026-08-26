import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getSocket } from '../services/socket';
import {
  getAuditCriticalNotificationsApi,
  markAuditCriticalNotificationReadApi
} from '../services/auditLog.service';
import { isAdmin } from '../utils/roles';

const POLL_MS = 30000;

export function useAuditLogCriticalNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const canSee = Boolean(user?.id && isAdmin(user));

  const fetchNotifications = useCallback(async () => {
    if (!canSee) return;
    try {
      const res = await getAuditCriticalNotificationsApi();
      setNotifications(Array.isArray(res?.notifications) ? res.notifications : []);
    } catch {
      setNotifications([]);
    }
  }, [canSee]);

  useEffect(() => {
    if (!canSee) {
      setNotifications([]);
      return undefined;
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

    const socket = getSocket();
    const onCritical = () => {
      fetchNotifications();
    };
    if (socket) socket.on('auditLog:critical', onCritical);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (socket) socket.off('auditLog:critical', onCritical);
    };
  }, [canSee, fetchNotifications]);

  const markAsRead = useCallback(async (id) => {
    try {
      await markAuditCriticalNotificationReadApi(id);
      setNotifications((prev) => prev.filter((n) => String(n.id) !== String(id)));
    } catch {
      /* ignore */
    }
  }, []);

  return {
    notifications,
    hasUnreadNotifications: notifications.length > 0,
    notificationCount: notifications.length,
    markAsRead,
    refresh: fetchNotifications
  };
}
