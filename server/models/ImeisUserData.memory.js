import { readJsonStore, updateJsonStore } from '../utils/jsonClusterStore.js';

const FILE = 'imeis.json';
const DEFAULT = () => ({});

const parseRow = (v) => ({
  user_id: v.user_id,
  imeis_json: v.imeis_json,
  cell_colors_json: v.cell_colors_json ?? '{}',
  row_actions_json: v.row_actions_json ?? '{}',
  copy_history_json: v.copy_history_json ?? '[]',
  copy_timestamps_json: v.copy_timestamps_json ?? '[]',
  created_at: v.created_at ? new Date(v.created_at) : new Date(),
  updated_at: v.updated_at ? new Date(v.updated_at) : new Date()
});

const serializeRow = (v) => ({
  user_id: v.user_id,
  imeis_json: v.imeis_json,
  cell_colors_json: v.cell_colors_json ?? '{}',
  row_actions_json: v.row_actions_json ?? '{}',
  copy_history_json: v.copy_history_json ?? '[]',
  copy_timestamps_json: v.copy_timestamps_json ?? '[]',
  created_at: v.created_at instanceof Date ? v.created_at.toISOString() : v.created_at,
  updated_at: v.updated_at instanceof Date ? v.updated_at.toISOString() : v.updated_at
});

const readAllRows = () => {
  const data = readJsonStore(FILE, DEFAULT());
  if (!data || typeof data !== 'object') return new Map();
  const map = new Map();
  Object.entries(data).forEach(([k, v]) => map.set(k, parseRow(v)));
  return map;
};

const getOrCreateInMap = (map, userId) => {
  const key = String(userId);
  if (!map.has(key)) {
    map.set(key, {
      user_id: userId,
      imeis_json: null,
      cell_colors_json: '{}',
      row_actions_json: '{}',
      copy_history_json: '[]',
      copy_timestamps_json: '[]',
      created_at: new Date(),
      updated_at: new Date()
    });
  }
  return map.get(key);
};

const mapToObject = (map) => {
  const obj = {};
  map.forEach((v, k) => {
    obj[k] = serializeRow(v);
  });
  return obj;
};

class InMemoryImeisUserData {
  static async findOne(query) {
    const userId = query?.where?.user_id ?? query?.user_id;
    if (!userId) return null;
    const map = readAllRows();
    const data = getOrCreateInMap(map, userId);
    return { ...data, id: data.user_id };
  }

  static async findOrCreate(options) {
    const { where, defaults } = options;
    const userId = where?.user_id;
    const key = String(userId);
    let created = false;
    let row = null;

    updateJsonStore(FILE, DEFAULT(), (state) => {
      if (typeof state !== 'object' || state == null) state = {};
      const map = new Map(Object.entries(state).map(([k, v]) => [k, parseRow(v)]));
      if (!map.has(key)) {
        created = true;
        row = getOrCreateInMap(map, userId);
        if (defaults) {
          if (defaults.imeis_json !== undefined) row.imeis_json = defaults.imeis_json;
          if (defaults.cell_colors_json !== undefined) row.cell_colors_json = defaults.cell_colors_json;
          if (defaults.row_actions_json !== undefined) row.row_actions_json = defaults.row_actions_json;
          if (defaults.copy_history_json !== undefined) row.copy_history_json = defaults.copy_history_json;
          if (defaults.copy_timestamps_json !== undefined) row.copy_timestamps_json = defaults.copy_timestamps_json;
        }
      } else {
        row = map.get(key);
      }
      Object.assign(state, mapToObject(map));
    });

    return [{ ...row, id: row.user_id }, created];
  }

  static async findAll(options = {}) {
    let rows = Array.from(readAllRows().values()).map((d) => ({ ...d, id: d.user_id }));
    const where = options?.where || {};
    let userIds = where?.user_id;
    if (userIds && typeof userIds === 'object' && !Array.isArray(userIds)) {
      const vals = Object.values(userIds);
      if (vals.length === 1 && Array.isArray(vals[0])) userIds = vals[0];
    }
    if (userIds && Array.isArray(userIds)) {
      if (userIds.length === 0) return [];
      const idSet = new Set(userIds.map((id) => String(id)));
      rows = rows.filter((r) => idSet.has(String(r.user_id)));
    }
    return rows;
  }

  static async upsert(values) {
    let result = null;
    updateJsonStore(FILE, DEFAULT(), (state) => {
      if (typeof state !== 'object' || state == null) state = {};
      const map = new Map(Object.entries(state).map(([k, v]) => [k, parseRow(v)]));
      const data = getOrCreateInMap(map, values.user_id);
      if (values.imeis_json !== undefined) data.imeis_json = values.imeis_json;
      if (values.cell_colors_json !== undefined) data.cell_colors_json = values.cell_colors_json;
      if (values.row_actions_json !== undefined) data.row_actions_json = values.row_actions_json;
      if (values.copy_history_json !== undefined) data.copy_history_json = values.copy_history_json;
      if (values.copy_timestamps_json !== undefined) data.copy_timestamps_json = values.copy_timestamps_json;
      data.updated_at = new Date();
      result = { ...data, id: data.user_id };
      Object.assign(state, mapToObject(map));
    });
    return result;
  }
}

export default InMemoryImeisUserData;
