import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getMyImeiRemindersApi } from '../services/imeis.service';
import { isBüroMitarbeiter } from '../utils/roles';

const REMINDER_POLL_MS = 20000;

export function useImeiReminderBadge() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState([]);

  const fetchReminders = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await getMyImeiRemindersApi();
      const list = res?.reminders ?? [];
      setReminders(list);
    } catch {
      setReminders([]);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || isBüroMitarbeiter(user)) return;

    let intervalId = null;

    const startPolling = () => {
      fetchReminders();
      intervalId = setInterval(fetchReminders, REMINDER_POLL_MS);
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
  }, [user?.id, fetchReminders]);

  return {
    hasUnreadReminders: reminders.length > 0,
    reminderCount: reminders.length
  };
}
