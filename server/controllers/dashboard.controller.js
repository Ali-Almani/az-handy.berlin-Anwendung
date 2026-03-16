import DashboardNote from '../models/DashboardNote.js';
import DashboardNoteHistory from '../models/DashboardNoteHistory.model.js';
import User from '../models/User.js';
import * as NewsRead from '../models/NewsRead.memory.js';

const USE_MEMORY_DB = process.env.USE_MEMORY_DB === 'true' ||
  (!process.env.DATABASE_URL && !process.env.PG_DATABASE && !process.env.PG_USER);

const isAdminUser = (user) => {
  if (!user) return false;
  const role = String(user.role ?? user.get?.('role') ?? '').trim();
  const email = String(user.email ?? user.get?.('email') ?? '').toLowerCase();
  if (role.toLowerCase().includes('admin')) return true;
  if (email === 'admin@az-handy.berlin') return true;
  return false;
};

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
    const admin = await User.findOne({ where: { email: 'admin@az-handy.berlin' } });
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
    if (!content.trim() && typeof DashboardNote.getHistory === 'function') {
      const history = DashboardNote.getHistory(adminId, 1);
      const latest = history[0];
      if (latest && (latest.content ?? '').trim()) {
        content = (latest.content ?? '').trim();
        updatedAt = latest.created_at ?? latest.createdAt ?? null;
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
    const userId = req.user.userId;

    if (USE_MEMORY_DB) {
      const [note] = await DashboardNote.findOrCreate({
        where: { user_id: userId },
        defaults: { content: '' }
      });
      return res.json({
        success: true,
        content: note?.content ?? '',
        updatedAt: note?.updated_at ?? null
      });
    }

    const [note] = await DashboardNote.findOrCreate({
      where: { user_id: userId },
      defaults: { content: '' }
    });

    res.json({
      success: true,
      content: note.content ?? '',
      updatedAt: note.updated_at ?? null
    });
  } catch (error) {
    next(error);
  }
};

export const saveNote = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { content } = req.body;

    if (USE_MEMORY_DB) {
      const [note, created] = await DashboardNote.findOrCreate({
        where: { user_id: userId },
        defaults: { content: '' }
      });
      if (content && String(content).trim()) {
        DashboardNote.addHistory(userId, content ?? '');
      }
      await note.update({ content: '' });
      broadcastNewsIfAdmin(req, content, userId);
      return res.json({
        success: true,
        message: 'Notiz gespeichert',
        updatedAt: note.updated_at
      });
    }

    const [note, created] = await DashboardNote.findOrCreate({
      where: { user_id: userId },
      defaults: { content: '' }
    });

    if (content && String(content).trim()) {
      await DashboardNoteHistory.create({
        user_id: userId,
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
    const admin = await User.findOne({ where: { email: 'admin@az-handy.berlin' } });
    const adminId = admin?.id ?? admin?._id ?? null;
    if (!adminId) return res.json({ success: true, messages: [] });

    const [note] = await DashboardNote.findOrCreate({
      where: { user_id: adminId },
      defaults: { content: '' }
    });
    const currentContent = (note?.content ?? note?.get?.('content') ?? '') || '';
    const currentHash = simpleHash(currentContent);

    let history = [];
    if (USE_MEMORY_DB && typeof DashboardNote.getHistory === 'function') {
      history = DashboardNote.getHistory(adminId, 100) || [];
    } else if (!USE_MEMORY_DB) {
      const rows = await DashboardNoteHistory.findAll({
        where: { user_id: adminId },
        order: [['created_at', 'DESC']],
        limit: 100,
        raw: true
      });
      history = rows.map((r) => ({ id: r.id, content: r.content, created_at: r.created_at }));
    }

    const messages = history
      .filter((h) => {
        const c = (h.content ?? '').trim();
        return c && simpleHash(c) !== currentHash;
      })
      .map((h) => {
        const content = (h.content ?? '').trim();
        const hash = simpleHash(content);
        const readers = NewsRead.getReadsByContentHash ? NewsRead.getReadsByContentHash(hash) : [];
        return {
          id: h.id,
          content,
          createdAt: h.created_at ?? h.createdAt,
          updatedAt: h.updated_at ?? h.updatedAt ?? null,
          updatedBy: h.updated_by ?? null,
          readers: readers.map((r) => ({ userName: r.user_name, readAt: r.read_at }))
        };
      });

    return res.json({ success: true, messages });
  } catch (error) {
    next(error);
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

    const admin = await User.findOne({ where: { email: 'admin@az-handy.berlin' } });
    const adminId = admin?.id ?? admin?._id ?? null;
    if (!adminId) return res.status(404).json({ message: 'Admin nicht gefunden' });

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

    const admin = await User.findOne({ where: { email: 'admin@az-handy.berlin' } });
    const adminId = admin?.id ?? admin?._id ?? null;
    if (!adminId) return res.status(404).json({ message: 'Admin nicht gefunden' });

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
