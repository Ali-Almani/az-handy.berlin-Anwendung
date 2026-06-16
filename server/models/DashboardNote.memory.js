import { readJsonStore, updateJsonStore } from '../utils/jsonClusterStore.js';

const FILE = 'dashboard.json';
const DEFAULT = () => ({ notes: [], history: [] });

const uuidv4 = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const normalizeState = (state) => {
  if (!state || typeof state !== 'object') return { notes: [], history: [] };
  return {
    notes: Array.isArray(state.notes) ? state.notes : [],
    history: Array.isArray(state.history) ? state.history : []
  };
};

const readState = () => normalizeState(readJsonStore(FILE, DEFAULT()));

const serializeNote = (n) => ({
  id: n.id,
  user_id: n.user_id,
  content: n.content,
  created_at: n.created_at instanceof Date ? n.created_at.toISOString() : n.created_at,
  updated_at: n.updated_at instanceof Date ? n.updated_at.toISOString() : n.updated_at
});

const serializeHistory = (h) => ({
  id: h.id,
  user_id: h.user_id,
  content: h.content,
  created_at: h.created_at instanceof Date ? h.created_at.toISOString() : h.created_at,
  updated_at: h.updated_at instanceof Date ? h.updated_at.toISOString() : h.updated_at,
  updated_by: h.updated_by
});

const parseNote = (n) => ({
  id: n.id,
  user_id: n.user_id,
  content: n.content || '',
  created_at: n.created_at ? new Date(n.created_at) : new Date(),
  updated_at: n.updated_at ? new Date(n.updated_at) : new Date()
});

const parseHistory = (h) => ({
  id: h.id,
  user_id: h.user_id,
  content: h.content || '',
  created_at: h.created_at ? new Date(h.created_at) : new Date(),
  updated_at: h.updated_at ? new Date(h.updated_at) : null,
  updated_by: h.updated_by || null
});

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
    const { notes } = readState();
    const note = notes.map(parseNote).find((n) => String(n.user_id) === String(userId));
    return note ? new InMemoryDashboardNote(note) : null;
  }

  static async findByPk(id) {
    const { notes } = readState();
    const note = notes.map(parseNote).find((n) => n.id === id || String(n.id) === String(id));
    return note ? new InMemoryDashboardNote(note) : null;
  }

  static async findOrCreate(options) {
    const { where, defaults } = options;
    const userId = where?.user_id;
    let created = false;
    let note = null;

    updateJsonStore(FILE, DEFAULT(), (state) => {
      const s = normalizeState(state);
      const parsed = s.notes.map(parseNote);
      const existing = parsed.find((n) => String(n.user_id) === String(userId));
      if (existing) {
        note = existing;
        return;
      }
      created = true;
      note = {
        id: uuidv4(),
        user_id: userId,
        content: defaults?.content ?? '',
        created_at: new Date(),
        updated_at: new Date()
      };
      s.notes.push(serializeNote(note));
      Object.assign(state, s);
    });

    return [new InMemoryDashboardNote(note), created];
  }

  async save() {
    this.updated_at = new Date();
    updateJsonStore(FILE, DEFAULT(), (state) => {
      const s = normalizeState(state);
      const idx = s.notes.findIndex((n) => String(n.user_id) === String(this.user_id));
      const serialized = serializeNote(this);
      if (idx >= 0) s.notes[idx] = serialized;
      else s.notes.push(serialized);
      Object.assign(state, s);
    });
    return this;
  }

  async update(data) {
    Object.assign(this, data);
    return this.save();
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
    updateJsonStore(FILE, DEFAULT(), (state) => {
      const s = normalizeState(state);
      s.history.push(
        serializeHistory({
          id: uuidv4(),
          user_id: userId,
          content: content || '',
          created_at: new Date(),
          updated_at: null,
          updated_by: null
        })
      );
      Object.assign(state, s);
    });
  }

  static getHistory(userId, limit = 50) {
    const { history } = readState();
    return history
      .map(parseHistory)
      .filter((h) => String(h.user_id) === String(userId))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  }

  static deleteHistoryEntry(entryId) {
    let deleted = false;
    updateJsonStore(FILE, DEFAULT(), (state) => {
      const s = normalizeState(state);
      const idx = s.history.findIndex((h) => String(h.id) === String(entryId));
      if (idx >= 0) {
        s.history.splice(idx, 1);
        deleted = true;
        Object.assign(state, s);
      }
    });
    return deleted;
  }

  static updateHistoryEntry(entryId, content, updatedBy = null) {
    let updated = false;
    updateJsonStore(FILE, DEFAULT(), (state) => {
      const s = normalizeState(state);
      const idx = s.history.findIndex((h) => String(h.id) === String(entryId));
      if (idx >= 0) {
        s.history[idx].content = content ?? '';
        s.history[idx].updated_at = new Date().toISOString();
        s.history[idx].updated_by = updatedBy || null;
        updated = true;
        Object.assign(state, s);
      }
    });
    return updated;
  }
}

export default InMemoryDashboardNote;
