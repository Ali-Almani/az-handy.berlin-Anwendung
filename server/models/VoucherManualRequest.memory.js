import { loadJson, saveJson } from '../utils/filePersistence.js';
import { getPersist } from '../utils/persistConfig.js';

const FILE = 'voucher_manual_requests.json';

const VALID_TAB_IDS = new Set(['o2_ff', 'ay_ag0', 'ay_5eur']);

let requests = [];
let nextId = 1;

const persist = () => {
  if (!getPersist()) return;
  saveJson(FILE, { requests, nextId });
};

const load = () => {
  if (!getPersist()) return;
  const data = loadJson(FILE);
  if (data && Array.isArray(data.requests)) {
    requests = data.requests;
    const maxId = requests.reduce((m, r) => Math.max(m, Number(r?.id) || 0), 0);
    nextId = Number(data.nextId) || maxId + 1 || 1;
  } else {
    requests = [];
  }
};

load();

export const isValidTabId = (id) => VALID_TAB_IDS.has(String(id || '').trim());

export const addRequest = ({ requesterUserId, requesterUserName, voucherTabId, voucherArtLabel, nummer }) => {
  if (!Array.isArray(requests)) requests = [];
  const tab = String(voucherTabId || '').trim();
  if (!isValidTabId(tab)) return { error: 'Ungültige Voucher-Art' };
  const n = String(nummer ?? '').trim();
  if (!n) return { error: 'Nummer ist erforderlich' };
  const existing = requests.find(
    (r) =>
      String(r.requester_user_id) === String(requesterUserId) &&
      r.status === 'pending' &&
      String(r.nummer).trim() === n &&
      r.voucher_tab_id === tab
  );
  if (existing) return { error: 'Diese Anfrage liegt bereits vor.' };
  const id = nextId++;
  requests.push({
    id,
    requester_user_id: requesterUserId,
    requester_user_name: requesterUserName || 'Unbekannt',
    voucher_tab_id: tab,
    voucher_art_label: voucherArtLabel || tab,
    nummer: n,
    status: 'pending',
    created_at: new Date().toISOString(),
    processed_by_user_id: null,
    processed_at: null
  });
  persist();
  return { id };
};

/** Admin/Büro: alle Anfragen zurücksetzen (z. B. bei kompletter Voucher-Liste neu aufsetzen) */
export const clearAllRequests = () => {
  requests = [];
  nextId = 1;
  persist();
};

export const getPendingRequests = () => {
  if (!Array.isArray(requests)) return [];
  return requests
    .filter((r) => r && r.status === 'pending')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

export const getRequestById = (id) => requests.find((r) => String(r.id) === String(id));

export const markApproved = (id, processedByUserId) => {
  const r = requests.find((x) => String(x.id) === String(id));
  if (!r || r.status !== 'pending') return false;
  r.status = 'approved';
  r.processed_by_user_id = processedByUserId;
  r.processed_at = new Date().toISOString();
  persist();
  return true;
};

export const markRejected = (id, processedByUserId) => {
  const r = requests.find((x) => String(x.id) === String(id));
  if (!r || r.status !== 'pending') return false;
  r.status = 'rejected';
  r.processed_by_user_id = processedByUserId;
  r.processed_at = new Date().toISOString();
  persist();
  return true;
};
