/**
 * Backup: IMEI-Verlauf (copy_history) aller Benutzer + Angenommen-Archiv.
 *
 *   npm run backup-imei-verlauf -- --use-postgres
 *   BACKUP_DIR=/root/backups npm run backup-imei-verlauf -- --use-postgres
 *
 * (--use-postgres = sudo -u postgres psql, wenn App-Passwort in .env nicht passt)
 */
import '../loadEnv.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectDatabase } from '../models/index.js';
import ImeisUserData from '../models/ImeisUserData.js';
import { loadJson, getDataDir } from '../utils/filePersistence.js';
import { loadPm2DbEnv } from './loadPm2DbEnv.js';
import { getPgDatabaseName, runPsql } from './pgLocal.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATHS = [
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', '..', '.env'),
  '/root/az-handy.berlin-Anwendung/server/.env',
  '/root/az-handy.berlin-Anwendung/.env'
];

function bootstrapEnv() {
  for (const p of ENV_PATHS) {
    try {
      if (fs.existsSync(p)) dotenv.config({ path: p, override: false });
    } catch (_) {}
  }
  if (process.argv.includes('--env-from-pm2')) {
    loadPm2DbEnv(process.env.PM2_APP_NAME || 'az-api');
  }
}

function timestampLabel() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function safeParseJson(raw, fallback) {
  if (raw == null || raw === '') return fallback;
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function loadRowsViaPostgresSuperuser() {
  const dbName = getPgDatabaseName();
  console.log(`📡 Lese imeis_user_data via postgres-Superuser (${dbName})…`);
  const out = runPsql(dbName, [
    '-t',
    '-A',
    '-c',
    "SELECT user_id, COALESCE(copy_history_json, '[]'), COALESCE(copy_timestamps_json, '[]') FROM imeis_user_data ORDER BY user_id"
  ]);
  const users = [];
  let totalHistory = 0;
  for (const line of out.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split('|');
    if (parts.length < 3) continue;
    const userId = parseInt(parts[0], 10);
    if (!Number.isFinite(userId)) continue;
    const copyHistory = safeParseJson(parts[1], []);
    const arr = Array.isArray(copyHistory) ? copyHistory : [];
    totalHistory += arr.length;
    users.push({
      userId,
      copyHistory: arr,
      copyTimestamps: safeParseJson(parts[2], [])
    });
  }
  return { users, totalHistory };
}

async function loadRowsViaSequelize() {
  await connectDatabase();
  const rows = await ImeisUserData.findAll();
  const users = [];
  let totalHistory = 0;
  for (const row of rows) {
    const userId = row.user_id ?? row.get?.('user_id');
    const copyHistory = safeParseJson(row.copy_history_json ?? row.get?.('copy_history_json'), []);
    const copyTimestamps = safeParseJson(row.copy_timestamps_json ?? row.get?.('copy_timestamps_json'), []);
    const arr = Array.isArray(copyHistory) ? copyHistory : [];
    totalHistory += arr.length;
    users.push({
      userId,
      copyHistory: arr,
      copyTimestamps: Array.isArray(copyTimestamps) ? copyTimestamps : []
    });
  }
  return { users, totalHistory };
}

async function main() {
  bootstrapEnv();
  let users = [];
  let totalHistory = 0;

  if (process.argv.includes('--use-postgres')) {
    ({ users, totalHistory } = loadRowsViaPostgresSuperuser());
  } else {
    console.log('🔄 Verbinde mit Datenbank…');
    try {
      ({ users, totalHistory } = await loadRowsViaSequelize());
    } catch (err) {
      console.warn(`⚠️  ${err.message}`);
      console.warn('↪️  Fallback: sudo -u postgres psql (--use-postgres)…');
      ({ users, totalHistory } = loadRowsViaPostgresSuperuser());
    }
  }

  let acceptedImeis = { entries: [] };
  const loaded = loadJson('accepted-imeis.json');
  if (loaded && typeof loaded === 'object') acceptedImeis = loaded;

  const backupDir = process.env.BACKUP_DIR || path.join(getDataDir(), 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const label = timestampLabel();
  const outPath = path.join(backupDir, `imei-verlauf-backup-${label}.json`);

  const payload = {
    type: 'imei-verlauf-backup',
    exportedAt: new Date().toISOString(),
    users,
    acceptedImeis,
    stats: {
      userRows: users.length,
      historyEntries: totalHistory,
      acceptedEntries: Array.isArray(acceptedImeis?.entries) ? acceptedImeis.entries.length : 0
    }
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf-8');

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Backup gespeichert: ${outPath}`);
  console.log(`   Benutzer: ${users.length} | Verlauf-Einträge: ${totalHistory}`);
  console.log(`   Angenommen-Archiv: ${payload.stats.acceptedEntries} Einträge`);
  console.log('');
  console.log(`💡 Wiederherstellen:`);
  console.log(`   npm run restore-imei-verlauf -- "${outPath}" --use-postgres --env-from-pm2`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch((err) => {
  console.error('❌ Backup fehlgeschlagen:', err.message);
  process.exit(1);
});
