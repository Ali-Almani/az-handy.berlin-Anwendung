import { readJsonStore, updateJsonStore } from '../utils/jsonClusterStore.js';

const FILE = 'news_reads.json';
const DEFAULT = () => ({ reads: [] });

const normalizeState = (state) => {
  if (!state || !Array.isArray(state.reads)) return { reads: [] };
  return { reads: state.reads };
};

export const addRead = (userId, userName, contentHash) =>
  updateJsonStore(FILE, DEFAULT(), (state) => {
    const s = normalizeState(state);
    const existing = s.reads.find(
      (r) => String(r.user_id) === String(userId) && r.content_hash === contentHash
    );
    if (existing) return;
    s.reads.push({
      user_id: userId,
      user_name: userName || 'Unbekannt',
      content_hash: contentHash,
      read_at: new Date().toISOString()
    });
    Object.assign(state, s);
  });

export const getReads = () => {
  const { reads } = normalizeState(readJsonStore(FILE, DEFAULT()));
  return [...reads].sort((a, b) => new Date(b.read_at) - new Date(a.read_at));
};

export const getReadsByContentHash = (contentHash) => {
  const { reads } = normalizeState(readJsonStore(FILE, DEFAULT()));
  return reads
    .filter((r) => r && r.content_hash === contentHash)
    .sort((a, b) => new Date(b.read_at) - new Date(a.read_at));
};

export const hasUserRead = (userId, contentHash) => {
  if (!userId || !contentHash) return false;
  const { reads } = normalizeState(readJsonStore(FILE, DEFAULT()));
  return reads.some(
    (r) => r && String(r.user_id) === String(userId) && r.content_hash === String(contentHash)
  );
};

export const deleteReadsByContentHash = (contentHash) =>
  updateJsonStore(FILE, DEFAULT(), (state) => {
    const s = normalizeState(state);
    const before = s.reads.length;
    s.reads = s.reads.filter((r) => r && r.content_hash !== contentHash);
    if (s.reads.length !== before) Object.assign(state, s);
  });
