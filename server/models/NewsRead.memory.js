import { loadJson, saveJson } from '../utils/filePersistence.js';
import { getPersist } from '../utils/persistConfig.js';
const FILE = 'news_reads.json';

let reads = [];

const persist = () => {
  if (!getPersist()) return;
  saveJson(FILE, { reads });
};

const load = () => {
  if (!getPersist()) return;
  const data = loadJson(FILE);
  if (data && Array.isArray(data.reads)) {
    reads = data.reads;
  } else {
    reads = [];
  }
};

load();

export const addRead = (userId, userName, contentHash) => {
  if (!Array.isArray(reads)) reads = [];
  const existing = reads.find(
    (r) => String(r.user_id) === String(userId) && r.content_hash === contentHash
  );
  if (existing) return;
  reads.push({
    user_id: userId,
    user_name: userName || 'Unbekannt',
    content_hash: contentHash,
    read_at: new Date().toISOString()
  });
  persist();
};

export const getReads = () => {
  if (!Array.isArray(reads)) return [];
  return [...reads].sort((a, b) => new Date(b.read_at) - new Date(a.read_at));
};

const simpleHash = (str) => {
  if (!str || !str.trim()) return '';
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i) | 0;
  }
  return String(h);
};

export const getReadsByContentHash = (contentHash) => {
  if (!Array.isArray(reads)) return [];
  return reads
    .filter((r) => r && r.content_hash === contentHash)
    .sort((a, b) => new Date(b.read_at) - new Date(a.read_at));
};

/** Prüft, ob ein Benutzer diese Anweisung bereits gelesen hat (für Popup: nur einmal anzeigen) */
export const hasUserRead = (userId, contentHash) => {
  if (!userId || !contentHash || !Array.isArray(reads)) return false;
  return reads.some(
    (r) => r && String(r.user_id) === String(userId) && r.content_hash === String(contentHash)
  );
};

export const deleteReadsByContentHash = (contentHash) => {
  if (!Array.isArray(reads)) reads = [];
  const before = reads.length;
  reads = reads.filter((r) => r && r.content_hash !== contentHash);
  if (reads.length !== before) persist();
};
