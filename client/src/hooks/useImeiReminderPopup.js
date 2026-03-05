import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getMyImeiRemindersApi } from '../services/imeis.service';
import { isBüroMitarbeiter } from '../utils/roles';

const REMINDER_POLL_MS = 2000;

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
    fetchReminders();
    const id = setInterval(fetchReminders, REMINDER_POLL_MS);
    return () => clearInterval(id);
  }, [user?.id, fetchReminders]);

  return {
    hasUnreadReminders: reminders.length > 0,
    reminderCount: reminders.length
  };
}
