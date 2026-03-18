import { loadJson, saveJson } from '../utils/filePersistence.js';
import { getPersist } from '../utils/persistConfig.js';

const dataByUserId = new Map();

const persistImeis = () => {
  if (!getPersist()) return;
  const data = {};
  dataByUserId.forEach((v, k) => {
    data[k] = {
      user_id: v.user_id,
      imeis_json: v.imeis_json,
      cell_colors_json: v.cell_colors_json,
      row_actions_json: v.row_actions_json,
      copy_history_json: v.copy_history_json,
      copy_timestamps_json: v.copy_timestamps_json,
      created_at: v.created_at instanceof Date ? v.created_at.toISOString() : v.created_at,
      updated_at: v.updated_at instanceof Date ? v.updated_at.toISOString() : v.updated_at
    };
  });
  saveJson('imeis.json', data);
};

const loadImeis = () => {
  if (!getPersist()) return;
  const data = loadJson('imeis.json');
  if (data && typeof data === 'object') {
    Object.entries(data).forEach(([k, v]) => {
      dataByUserId.set(k, {
        user_id: v.user_id,
        imeis_json: v.imeis_json,
        cell_colors_json: v.cell_colors_json ?? '{}',
        row_actions_json: v.row_actions_json ?? '{}',
        copy_history_json: v.copy_history_json ?? '[]',
        copy_timestamps_json: v.copy_timestamps_json ?? '[]',
        created_at: v.created_at ? new Date(v.created_at) : new Date(),
        updated_at: v.updated_at ? new Date(v.updated_at) : new Date()
      });
    });
    if (dataByUserId.size > 0) {
      console.log(`✅ IMEI-Daten für ${dataByUserId.size} Benutzer geladen`);
    }
  }
};

loadImeis();

const getOrCreate = (userId) => {
  const key = String(userId);
  if (!dataByUserId.has(key)) {
    dataByUserId.set(key, {
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
  return dataByUserId.get(key);
};

class InMemoryImeisUserData {
  static async findOne(query) {
    const userId = query?.where?.user_id ?? query?.user_id;
    if (!userId) return null;
    const data = getOrCreate(userId);
    return { ...data, id: data.user_id };
  }

  static async findOrCreate(options) {
    const { where, defaults } = options;
    const userId = where?.user_id;
    const key = String(userId);
    const created = !dataByUserId.has(key);
    const data = getOrCreate(userId);
    if (created && defaults) {
      if (defaults.imeis_json !== undefined) data.imeis_json = defaults.imeis_json;
      if (defaults.cell_colors_json !== undefined) data.cell_colors_json = defaults.cell_colors_json;
      if (defaults.row_actions_json !== undefined) data.row_actions_json = defaults.row_actions_json;
      if (defaults.copy_history_json !== undefined) data.copy_history_json = defaults.copy_history_json;
      if (defaults.copy_timestamps_json !== undefined) data.copy_timestamps_json = defaults.copy_timestamps_json;
      persistImeis();
    }
    return [{ ...data, id: data.user_id }, created];
  }

  static async findAll(options = {}) {
    let rows = Array.from(dataByUserId.values()).map((d) => ({ ...d, id: d.user_id }));
    const where = options?.where || {};
    let userIds = where?.user_id;
    if (userIds && typeof userIds === 'object' && !Array.isArray(userIds)) {
      const vals = Object.values(userIds);
      if (vals.length === 1 && Array.isArray(vals[0])) userIds = vals[0];
    }
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      const idSet = new Set(userIds.map((id) => String(id)));
      rows = rows.filter((r) => idSet.has(String(r.user_id)));
    }
    return rows;
  }

  static async upsert(values) {
    const userId = values.user_id;
    const data = getOrCreate(userId);
    if (values.imeis_json !== undefined) data.imeis_json = values.imeis_json;
    if (values.cell_colors_json !== undefined) data.cell_colors_json = values.cell_colors_json;
    if (values.row_actions_json !== undefined) data.row_actions_json = values.row_actions_json;
    if (values.copy_history_json !== undefined) data.copy_history_json = values.copy_history_json;
    if (values.copy_timestamps_json !== undefined) data.copy_timestamps_json = values.copy_timestamps_json;
    data.updated_at = new Date();
    persistImeis();
    return { ...data, id: data.user_id };
  }
}

export default InMemoryImeisUserData;
