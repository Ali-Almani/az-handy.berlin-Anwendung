/**
 * Cluster-sicherer JSON-Speicher für PM2 Multi-Worker.
 * Liest bei jedem Zugriff von der Platte; Schreibvorgänge unter Datei-Lock (read-modify-write).
 */
import fs from 'fs';
import path from 'path';
import { loadJson, saveJson, getDataDir, ensureDataDir } from './filePersistence.js';
import { getPersist } from './persistConfig.js';

/** Prozess-lokaler Cache nur wenn PERSIST_MEMORY_DATA=false (Dev ohne Dateien). */
const processCache = new Map();

const clone = (value) => {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
};

const sleepMs = (ms) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* busy wait – kurze Locks, kein setInterval */
  }
};

const LOCK_STALE_MS = 30_000;
const LOCK_MAX_ATTEMPTS = 100;

const acquireLock = (filename) => {
  ensureDataDir();
  const lockPath = path.join(getDataDir(), `${filename}.lock`);
  for (let attempt = 0; attempt < LOCK_MAX_ATTEMPTS; attempt++) {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      fs.writeFileSync(fd, String(process.pid), 'utf-8');
      return { fd, lockPath };
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      try {
        const stat = fs.statSync(lockPath);
        if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
          fs.unlinkSync(lockPath);
          continue;
        }
      } catch {
        /* Lock von anderem Worker entfernt */
      }
      sleepMs(15 + Math.floor(Math.random() * 25));
    }
  }
  throw new Error(`Could not acquire lock for ${filename} after ${LOCK_MAX_ATTEMPTS} attempts`);
};

const releaseLock = ({ fd, lockPath }) => {
  try {
    fs.closeSync(fd);
  } catch {
    /* ignore */
  }
  try {
    fs.unlinkSync(lockPath);
  } catch {
    /* ignore */
  }
};

/** Aktuellen Stand lesen (immer von Disk wenn persist aktiv). */
export const readJsonStore = (filename, defaultData) => {
  if (!getPersist()) {
    if (!processCache.has(filename)) {
      processCache.set(filename, clone(defaultData));
    }
    return clone(processCache.get(filename));
  }
  const data = loadJson(filename);
  if (data == null) return clone(defaultData);
  return data;
};

/**
 * Atomisches Read-Modify-Write unter Lock.
 * updater(state) mutiert state und kann optional einen Rückgabewert liefern:
 *   return { value: myResult };  // oder nur return ohne value
 */
export const updateJsonStore = (filename, defaultData, updater) => {
  if (!getPersist()) {
    if (!processCache.has(filename)) {
      processCache.set(filename, clone(defaultData));
    }
    const state = processCache.get(filename);
    const result = updater(state);
    processCache.set(filename, state);
    if (result != null && typeof result === 'object' && Object.prototype.hasOwnProperty.call(result, 'value')) {
      return result.value;
    }
    return result;
  }

  const lock = acquireLock(filename);
  try {
    const raw = loadJson(filename);
    const state = raw == null ? clone(defaultData) : raw;
    const result = updater(state);
    saveJson(filename, state);
    if (result != null && typeof result === 'object' && Object.prototype.hasOwnProperty.call(result, 'value')) {
      return result.value;
    }
    return result;
  } finally {
    releaseLock(lock);
  }
};
