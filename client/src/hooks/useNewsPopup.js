import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getNews, markNewsAsRead } from '../services/dashboard.service';
import { getSocket } from '../services/socket';
import { isAdmin } from '../utils/roles';

const NEWS_POLL_MS = 15000; // Fallback-Polling falls Socket nicht verfügbar
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
  const [authorName, setAuthorName] = useState('');
  const [showPopup, setShowPopup] = useState(false);

  const fetchNews = useCallback(async () => {
    if (!user?.id) return null;
    try {
      const res = await getNews();
      return {
        content: res?.data?.content ?? '',
        authorName: (res?.data?.authorName ?? '').trim(),
        hasRead: !!res?.data?.hasRead
      };
    } catch {
      return null;
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    // Nur Nicht-Administratoren: Popup bei neuer Anweisung (Admins speichern selbst, kein eigenes Popup).
    if (isAdmin(user)) {
      setShowPopup(false);
      return;
    }

    const showNewNews = (newContent, newAuthorName, hasReadFromServer = false) => {
      if (!newContent || !newContent.trim()) return;
      if (hasReadFromServer) return; // Server sagt: Benutzer hat bereits gelesen → kein Popup
      const hash = simpleHash(newContent);
      if (!hash) return;
      const lastRead = getLastReadHash(user.id);
      if (lastRead !== hash) {
        setContent(newContent);
        setAuthorName(newAuthorName || '');
        setShowPopup(true);
      }
    };

    const check = async () => {
      const data = await fetchNews();
      if (!data) return;
      showNewNews(data.content, data.authorName, data.hasRead);
    };

    // Echtzeit: Socket.io – wenn Admin Anweisung speichert, sofort Popup
    const socket = getSocket();
    const onNewsNew = (payload) => {
      if (payload?.content) showNewNews(payload.content, payload.authorName || '', false);
    };
    if (socket) {
      socket.on('news:new', onNewsNew);
    }

    check();
    const id = setInterval(check, NEWS_POLL_MS);

    return () => {
      clearInterval(id);
      if (socket) socket.off('news:new', onNewsNew);
    };
  }, [user, fetchNews]);

  const handleMarkAsRead = useCallback(async () => {
    const hash = simpleHash(content);
    if (hash) {
      setLastReadHash(user?.id, hash);
      if (!isAdmin(user)) {
        try {
          await markNewsAsRead(hash, user?.name);
        } catch {}
      }
    }
    setShowPopup(false);
  }, [content, user, user?.id, user?.name]);

  return {
    showPopup: showPopup && !!content,
    content,
    authorName,
    onMarkAsRead: handleMarkAsRead
  };
}
