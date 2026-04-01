import DashboardNote from '../models/DashboardNote.js';
import DashboardNoteHistory from '../models/DashboardNoteHistory.model.js';
import User from '../models/User.js';
import * as NewsRead from '../models/NewsRead.memory.js';
import { loadJson, saveJson } from '../utils/filePersistence.js';
import { resolveAuthUserId } from '../utils/normalizeUserId.js';

const USE_MEMORY_DB = process.env.USE_MEMORY_DB === 'true' ||
  (!process.env.DATABASE_URL && !process.env.PG_DATABASE && !process.env.PG_USER);

const isAdminUser = (user) => {
  if (!user) return false;
  const role = String(user.role ?? user.get?.('role') ?? '').trim();
  return role === 'Administrator' || role === 'admin' || role.toLowerCase().includes('admin');
};

/** Ersten Benutzer mit Rolle Administrator/admin finden (für gemeinsame Admin-Notizen) */
async function getAdminUserForNotes() {
  const admins1 = await User.findAll({ where: { role: 'Administrator' } });
  const admins2 = await User.findAll({ where: { role: 'admin' } });
  return admins1[0] || admins2[0] || null;
}

const simpleHash = (str) => {
  if (!str || !str.trim()) return '';
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i) | 0;
  }
  return String(h);
};

/** News für alle: Admin-Notiz oder neueste Archiv-Nachricht (für Popup) */
export const getNews = async (req, res, next) => {
  try {
    const admin = await getAdminUserForNotes();
    const adminId = admin?.id ?? admin?._id ?? null;
    let authorName = (admin?.name ?? admin?.get?.('name') ?? admin?.dataValues?.name ?? '').trim();
    if (!adminId) {
      return res.json({ success: true, content: '', updatedAt: null, authorName: '', hasRead: false });
    }
    const [note] = await DashboardNote.findOrCreate({
      where: { user_id: adminId },
      defaults: { content: '' }
    });
    let content = (note?.content ?? note?.get?.('content') ?? '') || '';
    let updatedAt = note?.updated_at ?? note?.get?.('updated_at') ?? null;
    if (!content.trim()) {
      if (USE_MEMORY_DB && typeof DashboardNote.getHistory === 'function') {
        const history = DashboardNote.getHistory(adminId, 1);
        const latest = history[0];
        if (latest && (latest.content ?? '').trim()) {
          content = (latest.content ?? '').trim();
          updatedAt = latest.created_at ?? latest.createdAt ?? null;
        }
      } else if (!USE_MEMORY_DB) {
        const latest = await DashboardNoteHistory.findOne({
          where: { user_id: adminId },
          order: [['created_at', 'DESC']],
          raw: true
        });
        if (latest && (latest.content ?? '').trim()) {
          content = (latest.content ?? '').trim();
          updatedAt = latest.created_at ?? null;
        }
      }
    }
    const contentHash = simpleHash(content);
    const userId = req.user?.userId ?? null;
    const hasRead = contentHash && userId && NewsRead.hasUserRead(userId, contentHash);
    return res.json({ success: true, content, updatedAt, authorName, hasRead: !!hasRead });
  } catch (error) {
    next(error);
  }
};

export const getNote = async (req, res, next) => {
  try {
    const userId = resolveAuthUserId(req.user);
    if (userId == null) {
      return res.status(401).json({ success: false, message: 'Nicht angemeldet' });
    }
    const currentUser = await User.findByPk(userId);
    const admin = await getAdminUserForNotes();
    const adminId = admin?.id ?? admin?._id ?? userId;
    const noteUserId = isAdminUser(currentUser) ? adminId : userId;

    if (USE_MEMORY_DB) {
      const [note] = await DashboardNote.findOrCreate({
        where: { user_id: noteUserId },
        defaults: { content: '' }
      });
      return res.json({
        success: true,
        content: note?.content ?? '',
        updatedAt: note?.updated_at ?? null
      });
    }

    const [note] = await DashboardNote.findOrCreate({
      where: { user_id: noteUserId },
      defaults: { content: '' }
    });

    res.json({
      success: true,
      content: note.content ?? '',
      updatedAt: note.updated_at ?? null
    });
  } catch (error) {
    console.error('getNote:', error);
    return res.json({ success: true, content: '', updatedAt: null });
  }
};

export const saveNote = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const currentUser = await User.findByPk(userId);
    if (!isAdminUser(currentUser)) {
      return res.status(403).json({ message: 'Nur Administratoren können Anweisungen schreiben' });
    }
    const { content } = req.body;

    const admin = await getAdminUserForNotes();
    const adminId = admin?.id ?? admin?._id ?? userId;

    if (USE_MEMORY_DB) {
      const [note] = await DashboardNote.findOrCreate({
        where: { user_id: adminId },
        defaults: { content: '' }
      });
      if (content && String(content).trim()) {
        DashboardNote.addHistory(adminId, content ?? '');
      }
      await note.update({ content: '' });
      broadcastNewsIfAdmin(req, content, userId);
      return res.json({
        success: true,
        message: 'Notiz gespeichert',
        updatedAt: note.updated_at
      });
    }

    const [note] = await DashboardNote.findOrCreate({
      where: { user_id: adminId },
      defaults: { content: '' }
    });

    if (content && String(content).trim()) {
      await DashboardNoteHistory.create({
        user_id: adminId,
        content: content ?? ''
      });
    }
    await note.update({ content: '' });
    broadcastNewsIfAdmin(req, content, userId);

    res.json({
      success: true,
      message: 'Notiz gespeichert',
      updatedAt: note.updated_at
    });
  } catch (error) {
    next(error);
  }
};

/** Echtzeit-Broadcast: Wenn Admin eine Anweisung speichert, an alle Benutzer senden */
async function broadcastNewsIfAdmin(req, content, userId) {
  if (!content || !String(content).trim()) return;
  const io = req.app?.get?.('io');
  if (!io) return;
  try {
    const currentUser = await User.findByPk(userId);
    if (!isAdminUser(currentUser)) return;
    const authorName = (currentUser?.name ?? currentUser?.get?.('name') ?? currentUser?.dataValues?.name ?? 'Administrator').trim();
    io.emit('news:new', { content: String(content).trim(), authorName });
  } catch {}
}

/** News als gelesen markieren (nur für nicht-Admin) */
export const markNewsAsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const currentUser = await User.findByPk(userId);
    if (isAdminUser(currentUser)) {
      return res.status(403).json({ message: 'Administrator kann nicht als gelesen markieren' });
    }
    const { contentHash } = req.body;
    if (!contentHash || typeof contentHash !== 'string') {
      return res.status(400).json({ message: 'contentHash erforderlich' });
    }
    const userName = currentUser?.name ?? currentUser?.get?.('name') ?? 'Unbekannt';
    NewsRead.addRead(userId, userName, contentHash.trim());
    return res.json({ success: true, message: 'Als gelesen markiert' });
  } catch (error) {
    next(error);
  }
};

/** Wer hat die News gelesen (nur Admin) */
export const getNewsReaders = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const currentUser = await User.findByPk(userId);
    if (!isAdminUser(currentUser)) {
      return res.status(403).json({ message: 'Nur Administratoren können die Leserliste einsehen' });
    }
    const reads = NewsRead.getReads();
    return res.json({
      success: true,
      readers: reads.map((r) => ({
        userName: r.user_name,
        readAt: r.read_at,
        contentHash: r.content_hash
      }))
    });
  } catch (error) {
    next(error);
  }
};

/** Alte Nachrichten – für alle Rollen (Admin: mit Lesern, andere: nur Liste) */
export const getNewsArchive = async (req, res, next) => {
  try {
    const admin = await getAdminUserForNotes();
    const adminId = admin?.id ?? admin?._id ?? null;
    if (!adminId) return res.json({ success: true, messages: [] });

    const [note] = await DashboardNote.findOrCreate({
      where: { user_id: adminId },
      defaults: { content: '' }
    });
    const currentContent = (note?.content ?? note?.get?.('content') ?? '') || '';
    const currentHash = simpleHash(currentContent);

    let history = [];
    try {
      if (USE_MEMORY_DB && typeof DashboardNote.getHistory === 'function') {
        history = DashboardNote.getHistory(adminId, 100) || [];
      } else if (!USE_MEMORY_DB) {
        const rows = await DashboardNoteHistory.findAll({
          where: { user_id: adminId },
          order: [['created_at', 'DESC']],
          limit: 100,
          raw: true
        });
        history = Array.isArray(rows)
          ? rows.map((r) => ({ id: r.id, content: r.content, created_at: r.created_at }))
          : [];
      }
    } catch (err) {
      console.error('getNewsArchive: history load:', err);
      history = [];
    }
    if (!Array.isArray(history)) history = [];

    let messages = [];
    try {
      messages = history
        .filter((h) => {
          const c = (h?.content ?? '').trim();
          return c && simpleHash(c) !== currentHash;
        })
        .map((h) => {
          const content = (h?.content ?? '').trim();
          const hash = simpleHash(content);
          let readers = [];
          try {
            readers =
              typeof NewsRead.getReadsByContentHash === 'function'
                ? NewsRead.getReadsByContentHash(hash) || []
                : [];
          } catch (err) {
            console.error('getNewsArchive: getReadsByContentHash:', err);
            readers = [];
          }
          if (!Array.isArray(readers)) readers = [];
          return {
            id: h.id,
            content,
            createdAt: h.created_at ?? h.createdAt,
            updatedAt: h.updated_at ?? h.updatedAt ?? null,
            updatedBy: h.updated_by ?? null,
            readers: readers.map((r) => ({ userName: r?.user_name ?? '', readAt: r?.read_at ?? null }))
          };
        });
    } catch (err) {
      console.error('getNewsArchive: build messages:', err);
      messages = [];
    }

    return res.json({ success: true, messages });
  } catch (error) {
    console.error('getNewsArchive:', error);
    return res.json({ success: true, messages: [] });
  }
};

/** Nachricht im Archiv bearbeiten (nur Admin) */
export const updateNewsArchiveEntry = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const currentUser = await User.findByPk(userId);
    if (!isAdminUser(currentUser)) {
      return res.status(403).json({ message: 'Nur Administratoren können Nachrichten bearbeiten' });
    }
    const { id } = req.params;
    const { content } = req.body;
    if (!id) return res.status(400).json({ message: 'ID erforderlich' });

    const admin = await getAdminUserForNotes();
    const adminId = admin?.id ?? admin?._id ?? null;
    if (!adminId) return res.status(404).json({ message: 'Kein Administrator gefunden' });

    let entry = null;
    if (USE_MEMORY_DB && typeof DashboardNote.getHistory === 'function') {
      const history = DashboardNote.getHistory(adminId, 100) || [];
      entry = history.find((h) => String(h.id) === String(id));
    } else if (!USE_MEMORY_DB) {
      entry = await DashboardNoteHistory.findOne({
        where: { id, user_id: adminId },
        raw: true
      });
    }
    if (!entry) return res.status(404).json({ message: 'Nachricht nicht gefunden' });

    const oldContent = (entry.content ?? '').trim();
    const oldHash = simpleHash(oldContent);
    const newContent = (content ?? '').trim();
    const editorName = (currentUser?.name ?? currentUser?.get?.('name') ?? currentUser?.dataValues?.name ?? 'Administrator').trim();
    if (NewsRead.deleteReadsByContentHash && oldHash) NewsRead.deleteReadsByContentHash(oldHash);
    if (USE_MEMORY_DB && DashboardNote.updateHistoryEntry) {
      DashboardNote.updateHistoryEntry(id, newContent, editorName);
    } else if (!USE_MEMORY_DB) {
      await DashboardNoteHistory.update({ content: newContent }, { where: { id, user_id: adminId } });
    }

    return res.json({ success: true, message: 'Nachricht aktualisiert' });
  } catch (error) {
    next(error);
  }
};

/** Nachricht aus Archiv löschen (nur Admin) */
export const deleteNewsArchiveEntry = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const currentUser = await User.findByPk(userId);
    if (!isAdminUser(currentUser)) {
      return res.status(403).json({ message: 'Nur Administratoren können Nachrichten löschen' });
    }
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'ID erforderlich' });

    const admin = await getAdminUserForNotes();
    const adminId = admin?.id ?? admin?._id ?? null;
    if (!adminId) return res.status(404).json({ message: 'Kein Administrator gefunden' });

    let entry = null;
    if (USE_MEMORY_DB && typeof DashboardNote.getHistory === 'function') {
      const history = DashboardNote.getHistory(adminId, 100) || [];
      entry = history.find((h) => String(h.id) === String(id));
    } else if (!USE_MEMORY_DB) {
      entry = await DashboardNoteHistory.findOne({
        where: { id, user_id: adminId },
        raw: true
      });
    }
    if (!entry) return res.status(404).json({ message: 'Nachricht nicht gefunden' });

    const content = (entry.content ?? '').trim();
    const hash = simpleHash(content);
    if (NewsRead.deleteReadsByContentHash) NewsRead.deleteReadsByContentHash(hash);
    if (USE_MEMORY_DB && DashboardNote.deleteHistoryEntry) {
      DashboardNote.deleteHistoryEntry(id);
    } else if (!USE_MEMORY_DB) {
      await DashboardNoteHistory.destroy({ where: { id, user_id: adminId } });
    }

    return res.json({ success: true, message: 'Nachricht gelöscht' });
  } catch (error) {
    next(error);
  }
};

const PERFORMANCE_FILE = 'dashboard-performance.json';

/** Performance-Kennzahlen (Monatsziel, Quartalsziel) – für alle lesbar */
export const getPerformanceMetrics = async (req, res, next) => {
  try {
    const data = loadJson(PERFORMANCE_FILE);
    return res.json({ success: true, metrics: data?.metrics ?? null });
  } catch (error) {
    next(error);
  }
};

/** Performance-Kennzahlen speichern (nur Admin) */
export const savePerformanceMetrics = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const currentUser = await User.findByPk(userId);
    if (!isAdminUser(currentUser)) {
      return res.status(403).json({ message: 'Nur Administratoren können Kennzahlen bearbeiten' });
    }
    const { metrics } = req.body;
    if (!metrics || typeof metrics !== 'object') {
      return res.status(400).json({ message: 'metrics erforderlich' });
    }
    saveJson(PERFORMANCE_FILE, { metrics, updatedAt: new Date().toISOString() });
    return res.json({ success: true, message: 'Kennzahlen gespeichert' });
  } catch (error) {
    next(error);
  }
};

const SITE_NEWS_FILE = 'dashboard-site-news.json';

/** Vorherige NEWS nur archivieren, wenn sich echter Inhalt (nicht nur leeres Markup) darin befindet. */
function siteNewsHtmlIsMeaningful(html) {
  if (html == null || typeof html !== 'string') return false;
  const s = html.trim();
  if (!s) return false;
  if (/<img\b|<video\b|<iframe\b|<picture\b|<svg\b|<canvas\b|<table\b/i.test(s)) return true;
  const text = s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 0;
}

/** NEWS-Startseiteninhalt (alle eingeloggten Benutzer lesbar, nur Admin schreibt) */
export const getSiteNews = async (req, res, next) => {
  try {
    const data = loadJson(SITE_NEWS_FILE);
    return res.json({
      success: true,
      content: data?.content ?? '',
      updatedAt: data?.updatedAt ?? null
    });
  } catch (error) {
    next(error);
  }
};

export const saveSiteNews = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const currentUser = await User.findByPk(userId);
    if (!isAdminUser(currentUser)) {
      return res.status(403).json({ message: 'Nur Administratoren können NEWS bearbeiten' });
    }
    const { content } = req.body;
    let data = {};
    try {
      data = loadJson(SITE_NEWS_FILE) || {};
    } catch {
      data = {};
    }
    const prevContent = typeof data.content === 'string' ? data.content : '';
    const prevAt = data.updatedAt ?? null;
    const newContent = typeof content === 'string' ? content : '';
    const now = new Date().toISOString();

    /** Archiv-Einträge nur bei echter Änderung; erste Veröffentlichung (vorher leer) landet ebenfalls im Archiv. */
    if (prevContent !== newContent) {
      let history = Array.isArray(data.history) ? [...data.history] : [];
      if (siteNewsHtmlIsMeaningful(prevContent)) {
        // Doppelten Eintrag vermeiden, wenn derselbe Text schon als „erste Veröffentlichung“ oben steht.
        if (history[0] && history[0].content === prevContent) {
          history.shift();
        }
        history.unshift({
          id: `sn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          content: prevContent,
          updatedAt: prevAt || now
        });
        data.history = history.slice(0, 100);
      } else if (siteNewsHtmlIsMeaningful(newContent)) {
        history.unshift({
          id: `sn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          content: newContent,
          updatedAt: now
        });
        data.history = history.slice(0, 100);
      }
    }
    data.content = newContent;
    data.updatedAt = now;
    saveJson(SITE_NEWS_FILE, data);
    const io = req.app?.get?.('io');
    if (io) {
      io.emit('siteNews:updated', { updatedAt: data.updatedAt });
      io.emit('siteNewsHistory:updated', { action: 'prepend' });
    }
    return res.json({ success: true, message: 'NEWS gespeichert', updatedAt: data.updatedAt });
  } catch (error) {
    next(error);
  }
};

/** ältere Startseiten-NEWS (Lesen: alle eingeloggten Benutzer; Bearbeiten/Löschen: nur Admin) */
export const getSiteNewsHistory = async (req, res, next) => {
  try {
    const data = loadJson(SITE_NEWS_FILE) || {};
    return res.json({ success: true, entries: Array.isArray(data.history) ? data.history : [] });
  } catch (error) {
    next(error);
  }
};

export const updateSiteNewsHistoryEntry = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const currentUser = await User.findByPk(userId);
    if (!isAdminUser(currentUser)) {
      return res.status(403).json({ message: 'Nur Administratoren' });
    }
    const { id } = req.params;
    const { content } = req.body;
    const data = loadJson(SITE_NEWS_FILE) || {};
    const history = Array.isArray(data.history) ? [...data.history] : [];
    const idx = history.findIndex((h) => h && h.id === id);
    if (idx === -1) {
      return res.status(404).json({ message: 'Eintrag nicht gefunden' });
    }
    history[idx] = {
      ...history[idx],
      content: typeof content === 'string' ? content : '',
      updatedAt: new Date().toISOString()
    };
    data.history = history;
    saveJson(SITE_NEWS_FILE, data);
    const io = req.app?.get?.('io');
    if (io) {
      io.emit('siteNewsHistory:updated', { id, action: 'update', updatedAt: history[idx].updatedAt });
    }
    return res.json({ success: true, entry: history[idx] });
  } catch (error) {
    next(error);
  }
};

export const deleteSiteNewsHistoryEntry = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const currentUser = await User.findByPk(userId);
    if (!isAdminUser(currentUser)) {
      return res.status(403).json({ message: 'Nur Administratoren' });
    }
    const { id } = req.params;
    const data = loadJson(SITE_NEWS_FILE) || {};
    const history = Array.isArray(data.history) ? data.history : [];
    data.history = history.filter((h) => h && h.id !== id);
    saveJson(SITE_NEWS_FILE, data);
    const io = req.app?.get?.('io');
    if (io) {
      io.emit('siteNewsHistory:updated', { id, action: 'delete' });
    }
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

/** Bild/PDF für NEWS-Editor (nur Admin) */
export const uploadNewsFile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const currentUser = await User.findByPk(userId);
    if (!isAdminUser(currentUser)) {
      return res.status(403).json({ message: 'Nur Administratoren können Dateien hochladen' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Keine Datei' });
    }
    const publicPath = `/uploads/news/${req.file.filename}`;
    const base = `${req.protocol}://${req.get('host')}`;
    const url = `${base}${publicPath}`;
    return res.json({ success: true, url, path: publicPath });
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

    if (USE_MEMORY_DB) {
      const history = DashboardNote.getHistory(userId, limit);
      return res.json({
        success: true,
        history: history.map((h) => ({
          id: h.id,
          content: h.content,
          createdAt: h.created_at
        }))
      });
    }

    const history = await DashboardNoteHistory.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit,
      attributes: ['id', 'content', 'created_at']
    });

    res.json({
      success: true,
      history: history.map((h) => ({
        id: h.id,
        content: h.content,
        createdAt: h.created_at
      }))
    });
  } catch (error) {
    next(error);
  }
};
