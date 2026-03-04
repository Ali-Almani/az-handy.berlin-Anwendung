import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getNews, markNewsAsRead } from '../services/dashboard.service';
import { isAdmin } from '../utils/roles';

const NEWS_POLL_MS = 15000;
const STORAGE_KEY = 'news-last-read';

const getLastReadHash = (userId) => {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return data[String(userId)] || '';
  } catch {
    return '';
  }
};

const setLastReadHash = (userId, hash) => {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    data[String(userId)] = hash;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
};

const simpleHash = (str) => {
  if (!str || !str.trim()) return '';
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i) | 0;
  }
  return String(h);
};

export function useNewsPopup() {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [showPopup, setShowPopup] = useState(false);

  const fetchNews = useCallback(async () => {
    if (!user?.id) return null;
    try {
      const res = await getNews();
      return res?.data?.content ?? '';
    } catch {
      return null;
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || isAdmin(user)) return;

    const check = async () => {
      const newContent = await fetchNews();
      if (newContent == null) return;
      const hash = simpleHash(newContent);
      if (!hash) return;
      const lastRead = getLastReadHash(user.id);
      if (lastRead !== hash) {
        setContent(newContent);
        setShowPopup(true);
      }
    };

    check();
    const id = setInterval(check, NEWS_POLL_MS);
    return () => clearInterval(id);
  }, [user?.id, fetchNews]);

  const handleMarkAsRead = useCallback(async () => {
    const hash = simpleHash(content);
    if (hash) {
      setLastReadHash(user?.id, hash);
      try {
        await markNewsAsRead(hash, user?.name);
      } catch {}
    }
    setShowPopup(false);
  }, [content, user?.id]);

  return {
    showPopup: showPopup && content && !isAdmin(user),
    content,
    onMarkAsRead: handleMarkAsRead
  };
}
