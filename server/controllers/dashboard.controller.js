import DashboardNote from '../models/DashboardNote.js';
import DashboardNoteHistory from '../models/DashboardNoteHistory.model.js';

const USE_MEMORY_DB = process.env.USE_MEMORY_DB === 'true' ||
  (!process.env.DATABASE_URL && !process.env.PG_DATABASE && !process.env.PG_USER);

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
