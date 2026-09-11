/**
 * Verlauf in PostgreSQL prüfen (Anzahl, ältester/neuester Timestamp pro User).
 *   npm run check-imei-verlauf-pg -- --use-postgres
 */
import '../loadEnv.js';
import { getPgDatabaseName, runPsql } from './pgLocal.js';
import {
  COPY_HISTORY_RETENTION_DAYS,
  parseCopyHistoryTimestamp
} from '../utils/copyHistoryRetention.js';

const usePostgres = process.argv.includes('--use-postgres');
if (!usePostgres) {
  console.error('❌ Bitte --use-postgres angeben.');
  process.exit(1);
}

const dbName = getPgDatabaseName();
const out = runPsql(dbName, [
  '-t',
  '-A',
  '-c',
  "SELECT user_id, COALESCE(copy_history_json, '[]') FROM imeis_user_data ORDER BY user_id"
]);

let total = 0;
let globalMin = Infinity;
let globalMax = -Infinity;
const sinceMs = Date.now() - COPY_HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
let inWindow = 0;

console.log(`📊 DB: ${dbName} | Anzeige-Fenster: ${COPY_HISTORY_RETENTION_DAYS} Tage\n`);

for (const line of out.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  const pipe = trimmed.indexOf('|');
  if (pipe < 0) continue;
  const uid = trimmed.slice(0, pipe);
  const json = trimmed.slice(pipe + 1);
  let arr = [];
  try {
    arr = JSON.parse(json);
  } catch {
    arr = [];
  }
  if (!Array.isArray(arr) || arr.length === 0) continue;

  let minTs = Infinity;
  let maxTs = -Infinity;
  let win = 0;
  for (const e of arr) {
    total += 1;
    const ts = parseCopyHistoryTimestamp(e);
    if (Number.isNaN(ts)) continue;
    if (ts < minTs) minTs = ts;
    if (ts > maxTs) maxTs = ts;
    if (ts >= sinceMs) win += 1;
    if (ts < globalMin) globalMin = ts;
    if (ts > globalMax) globalMax = ts;
  }
  inWindow += win;
  if (Number.isFinite(minTs)) {
    console.log(
      `  User ${uid}: ${arr.length} Einträge | ${fmt(minTs)} … ${fmt(maxTs)} | im Fenster: ${win}`
    );
  } else {
    console.log(`  User ${uid}: ${arr.length} Einträge (ohne parsebare Zeit)`);
  }
}

console.log('');
console.log(`  Gesamt Einträge in PG: ${total}`);
console.log(`  Im Retention-Fenster: ${inWindow}`);
if (Number.isFinite(globalMin)) {
  console.log(`  Ältester Timestamp (PG): ${fmt(globalMin)}`);
  console.log(`  Neuester Timestamp (PG): ${fmt(globalMax)}`);
} else {
  console.log('  Keine parsebaren Timestamps.');
}

function fmt(ms) {
  return new Date(ms).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
}
