/**
 * Redis-Cache für Lesezugriffe (optional – bei Ausfall: Cache-Miss, App läuft weiter).
 */
import { createClient } from 'redis';

let client = null;
let connectPromise = null;
let unavailable = false;

const isDebug = () =>
  process.env.REDIS_CACHE_DEBUG === 'true' ||
  process.env.REDIS_CACHE_DEBUG === '1' ||
  (process.env.NODE_ENV !== 'production' && process.env.REDIS_CACHE_DEBUG !== 'false');

const logDebug = (event, key) => {
  if (isDebug()) console.log(`[redis-cache] ${event} ${key}`);
};

const getRedisUrl = () => {
  const url = process.env.REDIS_URL?.trim();
  if (url) return url;
  const host = process.env.REDIS_HOST?.trim();
  if (host) return `redis://${host}:${process.env.REDIS_PORT || 6379}`;
  return null;
};

async function getClient() {
  if (unavailable) return null;
  const url = getRedisUrl();
  if (!url) return null;
  if (client?.isOpen) return client;
  if (!connectPromise) {
    connectPromise = (async () => {
      try {
        const c = createClient({ url });
        c.on('error', (err) => console.error('[redis-cache] client error:', err.message));
        await c.connect();
        client = c;
        return c;
      } catch (err) {
        unavailable = true;
        console.warn('[redis-cache] unavailable, caching disabled:', err.message);
        return null;
      }
    })();
  }
  return connectPromise;
}

export async function get(key) {
  try {
    const c = await getClient();
    if (!c) return null;
    const raw = await c.get(String(key));
    if (raw == null) {
      logDebug('MISS', key);
      return null;
    }
    logDebug('HIT', key);
    return JSON.parse(raw);
  } catch (err) {
    logDebug('MISS (error)', `${key}: ${err.message}`);
    return null;
  }
}

export async function set(key, value, ttlSeconds) {
  try {
    const c = await getClient();
    if (!c) return false;
    const ttl = Number(ttlSeconds);
    await c.set(String(key), JSON.stringify(value), {
      EX: Number.isFinite(ttl) && ttl > 0 ? ttl : 60
    });
    logDebug('SET', key);
    return true;
  } catch (err) {
    logDebug('SET failed', `${key}: ${err.message}`);
    return false;
  }
}

export async function del(key) {
  try {
    const c = await getClient();
    if (!c) return false;
    await c.del(String(key));
    logDebug('DEL', key);
    return true;
  } catch (err) {
    logDebug('DEL failed', `${key}: ${err.message}`);
    return false;
  }
}

export async function delPattern(pattern) {
  try {
    const c = await getClient();
    if (!c) return 0;
    let deleted = 0;
    for await (const key of c.scanIterator({ MATCH: String(pattern), COUNT: 100 })) {
      await c.del(key);
      deleted += 1;
    }
    if (deleted > 0) logDebug('DEL_PATTERN', `${pattern} (${deleted})`);
    return deleted;
  } catch (err) {
    logDebug('DEL_PATTERN failed', `${pattern}: ${err.message}`);
    return 0;
  }
}
