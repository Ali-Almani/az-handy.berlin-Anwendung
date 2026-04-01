import { loadJson, saveJson } from '../utils/filePersistence.js';
import { getPersist } from '../utils/persistConfig.js';
const FILE = 'extra_copy_requests.json';

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
    const ids = requests.map((r) => Number(r?.id) || 0);
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    nextId = Number(data.nextId) || maxId + 1 || 1;
  }
};

load();

export const addRequest = (requesterUserId, requesterUserName) => {
  if (!Array.isArray(requests)) requests = [];
  const existing = requests.find(
    (r) => String(r.requester_user_id) === String(requesterUserId) && r.status === 'pending'
  );
  if (existing) return null;
  const id = nextId++;
  requests.push({
    id,
    requester_user_id: requesterUserId,
    requester_user_name: requesterUserName || 'Unbekannt',
    status: 'pending',
    created_at: new Date().toISOString(),
    approved_by: null,
    approved_at: null
  });
  persist();
  return id;
};

export const getPendingRequests = () => {
  if (!Array.isArray(requests)) return [];
  return requests
    .filter((r) => r && r.status === 'pending')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

export const getRequestById = (id) => {
  return requests.find((r) => String(r.id) === String(id));
};

export const approveRequest = (id, approvedByUserId) => {
  const r = requests.find((x) => String(x.id) === String(id));
  if (!r || r.status !== 'pending') return false;
  r.status = 'approved';
  r.approved_by = approvedByUserId;
  r.approved_at = new Date().toISOString();
  persist();
  return true;
};

export const rejectRequest = (id) => {
  const r = requests.find((x) => String(x.id) === String(id));
  if (!r || r.status !== 'pending') return false;
  r.status = 'rejected';
  r.approved_at = new Date().toISOString();
  persist();
  return true;
};
