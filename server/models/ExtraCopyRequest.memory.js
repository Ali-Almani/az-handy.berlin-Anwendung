import { readJsonStore, updateJsonStore } from '../utils/jsonClusterStore.js';

const FILE = 'extra_copy_requests.json';
const DEFAULT = () => ({ requests: [], nextId: 1 });

const normalizeState = (state) => {
  if (!state || !Array.isArray(state.requests)) {
    return { requests: [], nextId: 1 };
  }
  const ids = state.requests.map((r) => Number(r?.id) || 0);
  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  const nextId = Number(state.nextId) || maxId + 1 || 1;
  return { requests: state.requests, nextId };
};

export const addRequest = (requesterUserId, requesterUserName) =>
  updateJsonStore(FILE, DEFAULT(), (state) => {
    const s = normalizeState(state);
    const existing = s.requests.find(
      (r) => String(r.requester_user_id) === String(requesterUserId) && r.status === 'pending'
    );
    if (existing) return { value: null };
    const id = s.nextId++;
    s.requests.push({
      id,
      requester_user_id: requesterUserId,
      requester_user_name: requesterUserName || 'Unbekannt',
      status: 'pending',
      created_at: new Date().toISOString(),
      approved_by: null,
      approved_at: null
    });
    Object.assign(state, s);
    return { value: id };
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

export const approveRequest = (id, approvedByUserId) =>
  updateJsonStore(FILE, DEFAULT(), (state) => {
    const s = normalizeState(state);
    const r = s.requests.find((x) => String(x.id) === String(id));
    if (!r || r.status !== 'pending') return { value: false };
    r.status = 'approved';
    r.approved_by = approvedByUserId;
    r.approved_at = new Date().toISOString();
    Object.assign(state, s);
    return { value: true };
  });

export const rejectRequest = (id) =>
  updateJsonStore(FILE, DEFAULT(), (state) => {
    const s = normalizeState(state);
    const r = s.requests.find((x) => String(x.id) === String(id));
    if (!r || r.status !== 'pending') return { value: false };
    r.status = 'rejected';
    r.approved_at = new Date().toISOString();
    Object.assign(state, s);
    return { value: true };
  });
