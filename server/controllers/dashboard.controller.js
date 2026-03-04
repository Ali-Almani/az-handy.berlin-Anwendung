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

/** News für alle: Admin-Notiz (Dashboard) als globale Nachricht */
export const getNews = async (req, res, next) => {
  try {
    const admin = await User.findOne({ where: { email: 'admin@az-handy.berlin' } });
    const adminId = admin?.id ?? null;
    if (!adminId) {
      return res.json({ success: true, content: '', updatedAt: null });
    }
    const [note] = await DashboardNote.findOrCreate({
      where: { user_id: adminId },
      defaults: { content: '' }
    });
    const content = (note?.content ?? note?.get?.('content') ?? '') || '';
    const updatedAt = note?.updated_at ?? note?.get?.('updated_at') ?? null;
    return res.json({ success: true, content, updatedAt });
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
        defaults: { content: content ?? '' }
      });
      if (!created) {
        await note.update({ content: content ?? '' });
      }
      DashboardNote.addHistory(userId, content ?? '');
      return res.json({
        success: true,
        message: 'Notiz gespeichert',
        updatedAt: note.updated_at
      });
    }

    const [note, created] = await DashboardNote.findOrCreate({
      where: { user_id: userId },
      defaults: { content: content ?? '' }
    });

    if (!created) {
      note.content = content ?? '';
      await note.save();
    }

    await DashboardNoteHistory.create({
      user_id: userId,
      content: content ?? ''
    });

    res.json({
      success: true,
      message: 'Notiz gespeichert',
      updatedAt: note.updated_at
    });
  } catch (error) {
    next(error);
  }
};

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
