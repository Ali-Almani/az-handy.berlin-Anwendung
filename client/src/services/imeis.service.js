import api from './api';
import { loadImeis, saveImeis } from '../utils/storage';

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true' ||
  import.meta.env.VITE_API_URL === 'mock' ||
  !import.meta.env.VITE_API_URL;

export const getImeisDataFromApi = async () => {
  try {
    const res = await api.get('/imeis/data');
    if (res.data?.success && res.data) {
      return {
        imeis: res.data.imeis ?? [],
        cellColors: res.data.cellColors ?? {},
        rowActions: res.data.rowActions ?? {},
        copyHistory: res.data.copyHistory ?? [],
        copyTimestamps: res.data.copyTimestamps ?? []
      };
    }
  } catch (err) {
    console.error('Error fetching IMEIS data from API:', err);
  }
  return null;
};

export const saveImeisDataToApi = async (payload) => {
  if (USE_MOCK_API) return;
  try {
    await api.put('/imeis/data', payload);
  } catch (err) {
    console.error('Error saving IMEIS data to API:', err);
  }
};

export const updateHistoryActionApi = async (imei, userName, newAction) => {
  try {
    const res = await api.patch('/imeis/data/history-action', { imei, userName, newAction });
    return res.data;
  } catch (err) {
    console.error('Error updating history action:', err);
    throw err;
  }
};

export const loadImeisWithApi = async (user) => {
  if (user) {
    const apiData = await getImeisDataFromApi();
    if (apiData) return apiData;
  }
  const localImeis = await loadImeis();
  let copyTimestamps = JSON.parse(localStorage.getItem('imeis-copy-timestamps') || '[]');
  if (copyTimestamps.length === 0 && user?.name) {
    const legacyKey = `imeis-copy-rate-limit-${user.name}`;
    const legacy = JSON.parse(localStorage.getItem(legacyKey) || '[]');
    if (legacy.length > 0) {
      copyTimestamps = legacy;
      localStorage.setItem('imeis-copy-timestamps', JSON.stringify(legacy));
    }
  }
  return {
    imeis: localImeis,
    cellColors: JSON.parse(localStorage.getItem('imeis-cell-text-colors') || '{}'),
    rowActions: JSON.parse(localStorage.getItem('imeis-row-actions') || '{}'),
    copyHistory: JSON.parse(localStorage.getItem('imeis-copy-history') || '[]'),
    copyTimestamps
  };
};

let lastPersistTime = 0;
let lastRemovedImeiTime = 0;
const PERSIST_COOLDOWN_MS = 1500;
const REMOVED_IMEI_COOLDOWN_MS = 5000;

export const persistImeisState = async (user, partial = {}) => {
  const { imeis, cellColors, rowActions, copyHistory, copyTimestamps, removedImei } = partial;
  const willCallApi = user && (imeis !== undefined || cellColors !== undefined || rowActions !== undefined || copyHistory !== undefined || copyTimestamps !== undefined || removedImei !== undefined);
  if (willCallApi) {
    lastPersistTime = Date.now();
    if (removedImei !== undefined) lastRemovedImeiTime = Date.now();
  }
  if (imeis !== undefined) await saveImeis(imeis);
  if (removedImei !== undefined) {
    const current = await loadImeis();
    const filtered = current.filter(item => String(item?.imei || '').trim() !== String(removedImei).trim());
    if (filtered.length !== current.length) await saveImeis(filtered);
  }
  if (cellColors !== undefined) localStorage.setItem('imeis-cell-text-colors', JSON.stringify(cellColors));
  if (rowActions !== undefined) localStorage.setItem('imeis-row-actions', JSON.stringify(rowActions));
  if (copyHistory !== undefined) localStorage.setItem('imeis-copy-history', JSON.stringify(copyHistory));
  if (copyTimestamps !== undefined) localStorage.setItem('imeis-copy-timestamps', JSON.stringify(copyTimestamps));
  if (user) {
    const payload = {};
    if (imeis !== undefined) payload.imeis = imeis;
    if (cellColors !== undefined) payload.cellColors = cellColors;
    if (rowActions !== undefined) payload.rowActions = rowActions;
    if (copyHistory !== undefined) payload.copyHistory = copyHistory;
    if (copyTimestamps !== undefined) payload.copyTimestamps = copyTimestamps;
    if (removedImei !== undefined) payload.removedImei = removedImei;
    if (Object.keys(payload).length > 0) {
      await saveImeisDataToApi(payload);
    }
  }
};

export const shouldSkipSync = () => {
  const sinceRemoved = Date.now() - lastRemovedImeiTime;
  if (sinceRemoved < REMOVED_IMEI_COOLDOWN_MS) return true;
  return Date.now() - lastPersistTime < PERSIST_COOLDOWN_MS;
};

/** Nach IMEI-Entfernung via API aufrufen, damit Sync nicht überschreibt */
export const setRemovedImeiCooldown = () => {
  lastRemovedImeiTime = Date.now();
};
