/**
 * IMEI-Verlauf + Angenommen-Archiv aus Backup wiederherstellen (merge mit aktuellem Stand).
 *
 * Unterstützte Quellen:
 *   npm run restore-imei-verlauf -- server/data/backups/imei-verlauf-backup-....json
 *   npm run restore-imei-verlauf -- /root/backups/heute/az_handy_berlin.sql.gz
 *   npm run restore-imei-verlauf -- /root/backups/heute/server-data.tar.gz
 *   npm run restore-imei-verlauf -- server/data/imeis.json
 *
 * Optionen:
 *   --dry-run          Nur anzeigen, nichts speichern
 *   --days 30          Nur Einträge der letzten N Tage aus Backup übernehmen (Standard: 30)
 */
import '../loadEnv.js';
import fs from 'fs';
import path from 'path';
import { createGunzip } from 'zlib';
import { execSync } from 'child_process';
import readline from 'readline';
import { connectDatabase } from '../models/index.js';
import ImeisUserData from '../models/ImeisUserData.js';
import { updateJsonStore } from '../utils/jsonClusterStore.js';
import { copyHistoryEntryKey } from '../utils/copyHistoryRetention.js';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const dryRun = process.argv.includes('--dry-run');
const daysIdx = process.argv.indexOf('--days');
const retentionDays = daysIdx >= 0 ? Math.max(1, parseInt(process.argv[daysIdx + 1], 10) || 30) : 30;
const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
const sourcePath = args[0] || process.env.IMEI_VERLAUF_BACKUP_PATH;

function safeParseJson(raw, fallback) {
  if (raw == null || raw === '') return fallback;
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function entryInWindow(entry) {
  const ts = Date.parse(entry?.timestamp || '');
  if (Number.isNaN(ts)) return true;
  return ts >= Date.now() - retentionMs;
}

function mergeHistoryRaw(existing, incoming) {
  const byKey = new Map();
  for (const e of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    if (!e || typeof e !== 'object') continue;
    if (!e.imei && !e.timestamp) continue;
    byKey.set(copyHistoryEntryKey(e), e);
  }
  return Array.from(byKey.values()).sort(
    (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
  );
}

function loadFromExportJson(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (raw?.type === 'imei-verlauf-backup' && Array.isArray(raw.users)) {
    return {
      users: raw.users.map((u) => ({
        userId: u.userId,
        copyHistory: (Array.isArray(u.copyHistory) ? u.copyHistory : []).filter(entryInWindow),
        copyTimestamps: Array.isArray(u.copyTimestamps) ? u.copyTimestamps : []
      })),
      acceptedImeis: raw.acceptedImeis ?? { entries: [] }
    };
  }
  throw new Error('Unbekanntes JSON-Format (erwartet: imei-verlauf-backup)');
}

function loadFromImeisJson(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const users = [];
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [key, val] of Object.entries(raw)) {
      if (!val || typeof val !== 'object') continue;
      const userId = val.user_id ?? key;
      const copyHistory = safeParseJson(val.copy_history_json, []);
      users.push({
        userId,
        copyHistory: (Array.isArray(copyHistory) ? copyHistory : []).filter(entryInWindow),
        copyTimestamps: safeParseJson(val.copy_timestamps_json, [])
      });
    }
  }
  return { users, acceptedImeis: null };
}

function extractFromTar(tarPath) {
  const candidates = [
    'server/data/imeis.json',
    './server/data/imeis.json',
    'data/imeis.json',
    'imeis.json'
  ];
  for (const member of candidates) {
    try {
      const json = execSync(`tar -xOf ${JSON.stringify(tarPath)} ${member}`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      const tmp = path.join(process.cwd(), '.restore-imeis-tmp.json');
      fs.writeFileSync(tmp, json, 'utf-8');
      const result = loadFromImeisJson(tmp);
      fs.unlinkSync(tmp);
      let acceptedImeis = null;
      for (const accPath of ['server/data/accepted-imeis.json', 'data/accepted-imeis.json']) {
        try {
          const accRaw = execSync(`tar -xOf ${JSON.stringify(tarPath)} ${accPath}`, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
          });
          acceptedImeis = JSON.parse(accRaw);
          break;
        } catch (_) {}
      }
      return { ...result, acceptedImeis };
    } catch (_) {}
  }
  throw new Error('imeis.json nicht in server-data.tar.gz gefunden');
}

function unescapeCopyField(s) {
  if (s === '\\N') return null;
  return String(s)
    .replace(/\\t/g, '\t')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\\\/g, '\\');
}

async function loadFromSqlDump(filePath) {
  const users = [];
  const isGz = filePath.endsWith('.gz');
  const stream = isGz
    ? fs.createReadStream(filePath).pipe(createGunzip())
    : fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let inCopy = false;
  for await (const line of rl) {
    if (!inCopy) {
      if (/COPY public\.imeis_user_data/i.test(line)) {
        inCopy = true;
      }
      continue;
    }
    if (line === '\\.' || line === '.') break;
    const parts = line.split('\t');
    if (parts.length < 7) continue;
    const userId = parts[1];
    const copyHistoryRaw = unescapeCopyField(parts[5]);
    const copyTimestampsRaw = unescapeCopyField(parts[6]);
    const copyHistory = safeParseJson(copyHistoryRaw, []);
    users.push({
      userId: /^\d+$/.test(userId) ? parseInt(userId, 10) : userId,
      copyHistory: (Array.isArray(copyHistory) ? copyHistory : []).filter(entryInWindow),
      copyTimestamps: safeParseJson(copyTimestampsRaw, [])
    });
  }
  if (users.length === 0) {
    throw new Error('Keine imeis_user_data-Zeilen im SQL-Dump gefunden');
  }
  return { users, acceptedImeis: null };
}

async function loadSource(filePath) {
  const base = path.basename(filePath).toLowerCase();
  if (base.includes('imei-verlauf-backup')) {
    return loadFromExportJson(filePath);
  }
  if (base === 'imeis.json') {
    return loadFromImeisJson(filePath);
  }
  if (base.includes('server-data') && (filePath.endsWith('.tar.gz') || filePath.endsWith('.tgz'))) {
    return extractFromTar(filePath);
  }
  if (filePath.endsWith('.sql.gz') || filePath.endsWith('.sql') || base.includes('az_handy')) {
    return await loadFromSqlDump(filePath);
  }
  try {
    return loadFromExportJson(filePath);
  } catch (_) {
    return loadFromImeisJson(filePath);
  }
}

async function restoreAcceptedArchive(acceptedImeis) {
  if (!acceptedImeis || !Array.isArray(acceptedImeis.entries) || acceptedImeis.entries.length === 0) {
    return 0;
  }
  let added = 0;
  if (dryRun) return acceptedImeis.entries.length;
  updateJsonStore('accepted-imeis.json', { entries: [] }, (state) => {
    if (!Array.isArray(state.entries)) state.entries = [];
    const ids = new Set(state.entries.map((e) => String(e?.id)));
    for (const entry of acceptedImeis.entries) {
      if (!entry || typeof entry !== 'object') continue;
      const id = String(entry.id ?? '');
      if (id && ids.has(id)) continue;
      state.entries.push(entry);
      if (id) ids.add(id);
      added += 1;
    }
  });
  return added;
}

async function main() {
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    console.error('❌ Backup-Datei nicht gefunden.');
    console.error('');
    console.error('Beispiele:');
    console.error('  npm run restore-imei-verlauf -- /root/backups/heute/az_handy_berlin.sql.gz');
    console.error('  npm run restore-imei-verlauf -- /root/backups/heute/server-data.tar.gz');
    console.error('  npm run restore-imei-verlauf -- server/data/backups/imei-verlauf-backup-....json');
    process.exit(1);
  }

  console.log(`📂 Quelle: ${path.resolve(sourcePath)}`);
  console.log(`📅 Einträge aus Backup: letzte ${retentionDays} Tage${dryRun ? ' (Dry-Run)' : ''}`);
  console.log('');

  const { users: backupUsers, acceptedImeis } = await loadSource(sourcePath);
  const backupHistoryTotal = backupUsers.reduce((n, u) => n + (u.copyHistory?.length ?? 0), 0);
  console.log(`📊 Backup: ${backupUsers.length} Benutzer, ${backupHistoryTotal} Verlauf-Einträge`);

  if (backupHistoryTotal === 0) {
    console.warn('⚠️  Keine Verlauf-Einträge im Backup für den gewählten Zeitraum.');
  }

  console.log('🔄 Verbinde mit Datenbank…');
  await connectDatabase();

  let updatedUsers = 0;
  let addedEntries = 0;

  for (const bu of backupUsers) {
    const uid = bu.userId;
    if (uid == null) continue;
    const [row] = await ImeisUserData.findOrCreate({
      where: { user_id: uid },
      defaults: {
        cell_colors_json: '{}',
        row_actions_json: '{}',
        copy_history_json: '[]',
        copy_timestamps_json: '[]'
      }
    });
    const currentHistory = safeParseJson(row.copy_history_json ?? row.get?.('copy_history_json'), []);
    const merged = mergeHistoryRaw(currentHistory, bu.copyHistory ?? []);
    const delta = merged.length - (Array.isArray(currentHistory) ? currentHistory.length : 0);
    if (delta > 0 || (bu.copyHistory?.length ?? 0) > 0) {
      addedEntries += Math.max(0, delta);
      updatedUsers += 1;
      if (!dryRun) {
        await ImeisUserData.upsert({
          user_id: uid,
          copy_history_json: JSON.stringify(merged),
          ...(Array.isArray(bu.copyTimestamps) && bu.copyTimestamps.length > 0
            ? { copy_timestamps_json: JSON.stringify(bu.copyTimestamps) }
            : {})
        });
      }
      console.log(`  ✓ User ${uid}: ${Array.isArray(currentHistory) ? currentHistory.length : 0} → ${merged.length} Einträge (+${Math.max(0, delta)})`);
    }
  }

  let acceptedAdded = 0;
  if (acceptedImeis) {
    acceptedAdded = await restoreAcceptedArchive(acceptedImeis);
    if (acceptedAdded > 0) {
      console.log(`  ✓ Angenommen-Archiv: ${acceptedAdded} Einträge ergänzt`);
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Benutzer aktualisiert: ${updatedUsers}`);
  console.log(`✅ Verlauf-Einträge ergänzt: ~${addedEntries}`);
  if (acceptedImeis) console.log(`✅ Angenommen-Archiv ergänzt: ${acceptedAdded}`);
  if (dryRun) console.log('ℹ️  Dry-Run – nichts gespeichert.');
  else {
    console.log('');
    console.log('💡 Server neu laden oder kurz warten, dann IMEI-Seite mit Strg+Shift+R öffnen.');
    console.log('   Bei PM2: pm2 restart all');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch((err) => {
  console.error('❌ Wiederherstellung fehlgeschlagen:', err.message);
  process.exit(1);
});
