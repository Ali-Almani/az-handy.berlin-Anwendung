import { readJsonStore, updateJsonStore } from '../utils/jsonClusterStore.js';

const FILE = 'voucher_manual_requests.json';
const VALID_TAB_IDS = new Set(['o2_ff', 'ay_ag0', 'ay_5eur']);
const DEFAULT = () => ({ requests: [], nextId: 1 });

const normalizeState = (state) => {
  if (!state || !Array.isArray(state.requests)) {
    return { requests: [], nextId: 1 };
  }
  const maxId = state.requests.reduce((m, r) => Math.max(m, Number(r?.id) || 0), 0);
  const nextId = Number(state.nextId) || maxId + 1 || 1;
  return { requests: state.requests, nextId };
};

export const isValidTabId = (id) => VALID_TAB_IDS.has(String(id || '').trim());

export const addRequest = ({ requesterUserId, requesterUserName, voucherTabId, voucherArtLabel, nummer }) =>
  updateJsonStore(FILE, DEFAULT(), (state) => {
    const s = normalizeState(state);
    const tab = String(voucherTabId || '').trim();
    if (!isValidTabId(tab)) return { value: { error: 'Ungültige Voucher-Art' } };
    const n = String(nummer ?? '').trim();
    if (!n) return { value: { error: 'Nummer ist erforderlich' } };
    const existing = s.requests.find(
      (r) =>
        String(r.requester_user_id) === String(requesterUserId) &&
        r.status === 'pending' &&
        String(r.nummer).trim() === n &&
        r.voucher_tab_id === tab
    );
    if (existing) return { value: { error: 'Diese Anfrage liegt bereits vor.' } };
    const id = s.nextId++;
    s.requests.push({
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
    Object.assign(state, s);
    return { value: { id } };
  });

export const clearAllRequests = () =>
  updateJsonStore(FILE, DEFAULT(), (state) => {
    Object.assign(state, { requests: [], nextId: 1 });
  });

export const getPendingRequests = () => {
  const { requests } = normalizeState(readJsonStore(FILE, DEFAULT()));
  return requests
    .filter((r) => r && r.status === 'pending')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

export const getRequestById = (id) => {
  const { requests } = normalizeState(readJsonStore(FILE, DEFAULT()));
  return requests.find((r) => String(r.id) === String(id));
};

export const markApproved = (id, processedByUserId) =>
  updateJsonStore(FILE, DEFAULT(), (state) => {
    const s = normalizeState(state);
    const r = s.requests.find((x) => String(x.id) === String(id));
    if (!r || r.status !== 'pending') return { value: false };
    r.status = 'approved';
    r.processed_by_user_id = processedByUserId;
    r.processed_at = new Date().toISOString();
    Object.assign(state, s);
    return { value: true };
  });

export const markRejected = (id, processedByUserId) =>
  updateJsonStore(FILE, DEFAULT(), (state) => {
    const s = normalizeState(state);
    const r = s.requests.find((x) => String(x.id) === String(id));
    if (!r || r.status !== 'pending') return { value: false };
    r.status = 'rejected';
    r.processed_by_user_id = processedByUserId;
    r.processed_at = new Date().toISOString();
    Object.assign(state, s);
    return { value: true };
  });
