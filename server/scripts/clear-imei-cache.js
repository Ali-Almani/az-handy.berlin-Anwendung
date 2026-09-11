import { invalidateImeiRedisCaches } from '../utils/invalidateImeiRedisCaches.js';

const n = await invalidateImeiRedisCaches();
console.log(`♻️  IMEI-Redis-Cache geleert (userData-Keys: ${n}).`);
