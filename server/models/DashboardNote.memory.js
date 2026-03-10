import { loadJson, saveJson } from '../utils/filePersistence.js';

const PERSIST = process.env.PERSIST_MEMORY_DATA !== 'false';

const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const notes = [];
const history = [];

const persistDashboard = () => {
  if (!PERSIST) return;
  saveJson('dashboard.json', {
    notes: notes.map(n => ({
      id: n.id,
      user_id: n.user_id,
      content: n.content,
      created_at: n.created_at instanceof Date ? n.created_at.toISOString() : n.created_at,
      updated_at: n.updated_at instanceof Date ? n.updated_at.toISOString() : n.updated_at
    })),
    history: history.map(h => ({
      id: h.id,
      user_id: h.user_id,
      content: h.content,
      created_at: h.created_at instanceof Date ? h.created_at.toISOString() : h.created_at,
      updated_at: h.updated_at instanceof Date ? h.updated_at.toISOString() : h.updated_at,
      updated_by: h.updated_by
    }))
  });
};

const loadDashboard = () => {
  if (!PERSIST) return;
  const data = loadJson('dashboard.json');
  if (data?.notes?.length) {
    notes.length = 0;
    data.notes.forEach(n => {
      notes.push({
        id: n.id,
        user_id: n.user_id,
        content: n.content || '',
        created_at: n.created_at ? new Date(n.created_at) : new Date(),
        updated_at: n.updated_at ? new Date(n.updated_at) : new Date()
      });
    });
    console.log(`✅ ${notes.length} Dashboard-Notizen geladen`);
  }
  if (data?.history?.length) {
    history.length = 0;
    data.history.forEach(h => {
      history.push({
        id: h.id,
        user_id: h.user_id,
        content: h.content || '',
        created_at: h.created_at ? new Date(h.created_at) : new Date(),
        updated_at: h.updated_at ? new Date(h.updated_at) : null,
        updated_by: h.updated_by || null
      });
    });
  }
};

loadDashboard();

const findNoteByUserId = (userId) => notes.find((n) => String(n.user_id) === String(userId));
const findHistoryByUserId = (userId) =>
  history.filter((h) => String(h.user_id) === String(userId)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

class InMemoryDashboardNote {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.user_id = data.user_id;
    this.content = data.content || '';
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
  }

  static async findOne(query) {
    const userId = query?.where?.user_id ?? query?.user_id;
    if (!userId) return null;
    const note = findNoteByUserId(userId);
    return note ? new InMemoryDashboardNote(note) : null;
  }

  static async findByPk(id) {
    const note = notes.find((n) => n.id === id || String(n.id) === String(id));
    return note ? new InMemoryDashboardNote(note) : null;
  }

  static async findOrCreate(options) {
    const { where, defaults } = options;
    const userId = where?.user_id;
    const existing = findNoteByUserId(userId);
    let note = existing;
    if (!note) {
      note = {
        id: uuidv4(),
        user_id: userId,
        content: defaults?.content ?? '',
        created_at: new Date(),
        updated_at: new Date()
      };
      notes.push(note);
      persistDashboard();
    }
    return [new InMemoryDashboardNote(note), !existing];
  }

  async save() {
    const idx = notes.findIndex((n) => String(n.user_id) === String(this.user_id));
    this.updated_at = new Date();
    if (idx >= 0) {
      notes[idx] = { ...this };
    } else {
      notes.push({ ...this });
    }
    persistDashboard();
    return this;
  }

  async update(data) {
    Object.assign(this, data);
    this.updated_at = new Date();
    const idx = notes.findIndex((n) => String(n.user_id) === String(this.user_id));
    if (idx >= 0) notes[idx] = { ...this };
    persistDashboard();
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      content: this.content,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  static addHistory(userId, content) {
    history.push({
      id: uuidv4(),
      user_id: userId,
      content: content || '',
      created_at: new Date(),
      updated_at: null,
      updated_by: null
    });
    persistDashboard();
  }

  static getHistory(userId, limit = 50) {
    return findHistoryByUserId(userId).slice(0, limit);
  }

  static deleteHistoryEntry(entryId) {
    const idx = history.findIndex((h) => String(h.id) === String(entryId));
    if (idx >= 0) {
      history.splice(idx, 1);
      persistDashboard();
      return true;
    }
    return false;
  }

  static updateHistoryEntry(entryId, content, updatedBy = null) {
    const idx = history.findIndex((h) => String(h.id) === String(entryId));
    if (idx >= 0) {
      history[idx].content = content ?? '';
      history[idx].updated_at = new Date();
      history[idx].updated_by = updatedBy || null;
      persistDashboard();
      return true;
    }
    return false;
  }
}

export default InMemoryDashboardNote;
export { notes, history };
