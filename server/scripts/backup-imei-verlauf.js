/**
 * Backup: IMEI-Verlauf (copy_history) aller Benutzer + Angenommen-Archiv.
 *
 *   npm run backup-imei-verlauf
 *   BACKUP_DIR=/root/backups npm run backup-imei-verlauf
 */
import '../loadEnv.js';
import fs from 'fs';
import path from 'path';
import { connectDatabase, User } from '../models/index.js';
import ImeisUserData from '../models/ImeisUserData.js';
import { loadJson, getDataDir } from '../utils/filePersistence.js';

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

async function main() {
  console.log('🔄 Verbinde mit Datenbank…');
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
  console.log(`   npm run restore-imei-verlauf -- "${outPath}"`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch((err) => {
  console.error('❌ Backup fehlgeschlagen:', err.message);
  process.exit(1);
});
