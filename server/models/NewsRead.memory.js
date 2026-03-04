import { loadJson, saveJson } from '../utils/filePersistence.js';

const PERSIST = process.env.PERSIST_MEMORY_DATA !== 'false';
const FILE = 'news_reads.json';

let reads = [];

const persist = () => {
  if (!PERSIST) return;
  saveJson(FILE, { reads });
};

const load = () => {
  if (!PERSIST) return;
  const data = loadJson(FILE);
  if (data?.reads?.length) {
    reads = data.reads;
  }
};

load();

export const addRead = (userId, userName, contentHash) => {
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
  return [...reads].sort((a, b) => new Date(b.read_at) - new Date(a.read_at));
};
