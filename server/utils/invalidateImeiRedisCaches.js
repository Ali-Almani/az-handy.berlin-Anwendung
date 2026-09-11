import * as redisCache from './redisCache.js';

/** IMEI-Verlauf / User-Data Redis-Keys leeren (nach Restore oder Deploy). */
export async function invalidateImeiRedisCaches() {
  await redisCache.del('imeis:mergedCopyHistory');
  await redisCache.del('imeis:verlaufHiddenKeys');
  const n = await redisCache.delPattern('imeis:userData:*');
  return n;
}
