/**
 * IMEI-Verlauf + Angenommen-Archiv aus Backup wiederherstellen (merge mit aktuellem Stand).
 *
 *   npm run restore-imei-verlauf -- /root/backups/heute/az_handy_berlin.sql.gz --dry-run
 *   npm run restore-imei-verlauf -- /root/backups/heute/server-data.tar.gz --days 30
 *
 * Optionen:
 *   --dry-run       Nur anzeigen, nichts speichern (keine DB nötig)
 *   --analyze-only  Nur Backup analysieren, keine DB
 *   --days 30       Nur Einträge der letzten N Tage (Standard: 30)
 *   --all-days      Alle Einträge aus Backup (kein Datumsfilter)
 *   --env-from-pm2  DB-Zugangsdaten aus laufendem PM2-Prozess (az-api)
 *   --database-url=postgresql://…  DB-URL überschreiben
 *   --use-postgres    Direkt via sudo -u postgres psql (empfohlen auf dem Server)
 */
import '../loadEnv.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createGunzip } from 'zlib';
import { execSync, spawnSync } from 'child_process';
import readline from 'readline';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { updateJsonStore } from '../utils/jsonClusterStore.js';
import { copyHistoryEntryKey } from '../utils/copyHistoryRetention.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ENV_PATHS = [
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', '..', '.env'),
  '/root/az-handy.berlin-Anwendung/server/.env',
  '/root/az-handy.berlin-Anwendung/.env'
];

/** Env vor dynamischem DB-Import setzen (ESM importiert database.js sonst zu früh). */
function bootstrapEnv() {
  for (const p of ENV_PATHS) {
    if (fs.existsSync(p)) dotenv.config({ path: p, override: false });
  }

  const dbUrlArg = process.argv.find((a) => a.startsWith('--database-url='));
  if (dbUrlArg) {
    process.env.DATABASE_URL = dbUrlArg.slice('--database-url='.length);
  }

  if (process.argv.includes('--env-from-pm2')) {
    loadEnvFromPm2(process.env.PM2_APP_NAME || 'az-api');
  }
}

function loadEnvFromPm2(appName) {
  const keys = ['DATABASE_URL', 'PG_USER', 'PG_PASSWORD', 'PG_HOST', 'PG_PORT', 'PG_DATABASE'];

  const applyEnv = (envObj, override) => {
    if (!envObj) return 0;
    let n = 0;
    for (const key of keys) {
      const val = envObj[key];
      if (val == null || val === '') continue;
      if (override || !process.env[key]) {
        process.env[key] = String(val);
        n += 1;
      }
    }
    return n;
  };

  try {
    const out = execSync('pm2 jlist', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    const list = JSON.parse(out);
    const app = list.find((a) => a.name === appName);
    if (!app) {
      console.warn(`⚠️  PM2-App "${appName}" nicht gefunden – .env wird verwendet.`);
      return false;
    }

    let loaded = applyEnv(app.pm2_env?.env, true);
    const pid = app.pid;
    if (pid && fs.existsSync(`/proc/${pid}/environ`)) {
      const procEnv = {};
      const buf = fs.readFileSync(`/proc/${pid}/environ`);
      for (const part of buf.toString('utf-8').split('\0')) {
        const i = part.indexOf('=');
        if (i <= 0) continue;
        procEnv[part.slice(0, i)] = part.slice(i + 1);
      }
      loaded += applyEnv(procEnv, true);
    }

    if (loaded === 0) {
      console.warn(`⚠️  Keine DB-Variablen in PM2 (${appName}) – .env wird verwendet.`);
      return false;
    }

    const dbUser = process.env.DATABASE_URL?.match(/\/\/([^:@/]+)/)?.[1] ?? process.env.PG_USER ?? '?';
    console.log(`🔑 DB-Zugang aus PM2 (${appName}, User: ${dbUser}) geladen.`);
    return true;
  } catch (err) {
    console.warn(`⚠️  PM2 env nicht lesbar: ${err.message}`);
    return false;
  }
}

function dbHint(sourcePath, retentionDays, allDays) {
  const daysArg = allDays ? ' --all-days' : ` --days ${retentionDays ?? 30}`;
  console.error('');
  console.error('💡 Auf dem Server (DB wie PM2):');
  console.error('   cd ~/az-handy.berlin-Anwendung/server');
  console.error(`   npm run restore-imei-verlauf -- ${sourcePath}${daysArg} --use-postgres`);
  console.error('');
  console.error('   Alternativ mit App-DB-User:');
  console.error(`   npm run restore-imei-verlauf -- ${sourcePath}${daysArg} --env-from-pm2`);
  console.error('');
  console.error('   Oder .env prüfen: grep -E "DATABASE|PG_" .env ../.env');
}

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const dryRun = process.argv.includes('--dry-run');
const analyzeOnly = process.argv.includes('--analyze-only');
const usePostgres = process.argv.includes('--use-postgres');
const allDays = process.argv.includes('--all-days');
const daysIdx = process.argv.indexOf('--days');
const retentionDays = allDays
  ? null
  : daysIdx >= 0
    ? Math.max(1, parseInt(process.argv[daysIdx + 1], 10) || 30)
    : 30;
const retentionMs = retentionDays != null ? retentionDays * 24 * 60 * 60 * 1000 : null;
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
  if (retentionMs == null) return true;
  const ts = Date.parse(entry?.timestamp || '');
  if (Number.isNaN(ts)) return true;
  return ts >= Date.now() - retentionMs;
}

function filterHistory(arr) {
  return (Array.isArray(arr) ? arr : []).filter(entryInWindow);
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
      users: raw.users.map((u) => {
        const full = Array.isArray(u.copyHistory) ? u.copyHistory : [];
        return {
          userId: u.userId,
          copyHistory: filterHistory(full),
          copyHistoryRawCount: full.length,
          copyTimestamps: Array.isArray(u.copyTimestamps) ? u.copyTimestamps : []
        };
      }),
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
      const full = safeParseJson(val.copy_history_json, []);
      const arr = Array.isArray(full) ? full : [];
      users.push({
        userId,
        copyHistory: filterHistory(arr),
        copyHistoryRawCount: arr.length,
        copyTimestamps: safeParseJson(val.copy_timestamps_json, [])
      });
    }
  }
  return { users, acceptedImeis: null };
}

function listTarMembers(tarPath) {
  try {
    const out = execSync(`tar -tzf ${JSON.stringify(tarPath)}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return out.split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function extractTarMemberToTempFile(tarPath, member) {
  const tmp = path.join(os.tmpdir(), `restore-imeis-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  const fd = fs.openSync(tmp, 'w');
  try {
    const result = spawnSync('tar', ['-xOf', tarPath, member], {
      stdio: ['ignore', fd, 'pipe']
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(result.stderr?.toString('utf-8').trim() || `tar exit ${result.status}`);
    }
  } finally {
    fs.closeSync(fd);
  }
  return tmp;
}

function extractFromTar(tarPath) {
  const members = listTarMembers(tarPath);
  if (members.length === 0) {
    throw new Error('server-data.tar.gz konnte nicht gelesen werden');
  }

  const imeisMember = members.find(
    (m) => /imeis\.json$/i.test(m) && !/accepted/i.test(m)
  );
  const acceptedMember = members.find((m) => /accepted-imeis\.json$/i.test(m));

  if (!imeisMember) {
    console.error('   Dateien im Archiv (Auszug):');
    members.slice(0, 25).forEach((m) => console.error(`     - ${m}`));
    if (members.length > 25) console.error(`     … und ${members.length - 25} weitere`);
    throw new Error('imeis.json nicht in server-data.tar.gz gefunden');
  }

  console.log(`   Tar: ${imeisMember}${acceptedMember ? ` + ${acceptedMember}` : ''}`);

  const tmp = extractTarMemberToTempFile(tarPath, imeisMember);
  const result = loadFromImeisJson(tmp);
  try {
    fs.unlinkSync(tmp);
  } catch (_) {}

  let acceptedImeis = null;
  if (acceptedMember) {
    try {
      const accTmp = extractTarMemberToTempFile(tarPath, acceptedMember);
      acceptedImeis = JSON.parse(fs.readFileSync(accTmp, 'utf-8'));
      try {
        fs.unlinkSync(accTmp);
      } catch (_) {}
    } catch (_) {}
  }
  return { ...result, acceptedImeis };
}

function unescapeCopyField(s) {
  if (s == null || s === '\\N') return null;
  return String(s)
    .replace(/\\t/g, '\t')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\\\/g, '\\');
}

/** COPY-Zeile: imeis_json kann Tabs enthalten → Spalten vom Ende lesen */
function parseImeisUserDataCopyLine(line) {
  const parts = line.split('\t');
  if (parts.length < 9) return null;

  const userId = parts[1];
  // id, user_id, imeis_json, cell_colors, row_actions, copy_history, copy_timestamps, created_at, updated_at
  const copyHistoryRaw = unescapeCopyField(parts[parts.length - 4]);
  const copyTimestampsRaw = unescapeCopyField(parts[parts.length - 3]);

  const copyHistory = safeParseJson(copyHistoryRaw, []);
  const arr = Array.isArray(copyHistory) ? copyHistory : [];

  return {
    userId: /^\d+$/.test(String(userId)) ? parseInt(userId, 10) : userId,
    copyHistory: filterHistory(arr),
    copyHistoryRawCount: arr.length,
    copyTimestamps: safeParseJson(copyTimestampsRaw, [])
  };
}

async function loadFromSqlDump(filePath) {
  const users = [];
  let rawHistoryTotal = 0;
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
    const parsed = parseImeisUserDataCopyLine(line);
    if (!parsed) continue;
    rawHistoryTotal += parsed.copyHistoryRawCount ?? 0;
    users.push(parsed);
  }
  if (users.length === 0) {
    throw new Error('Keine imeis_user_data-Zeilen im SQL-Dump gefunden');
  }
  return { users, acceptedImeis: null, rawHistoryTotal };
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
  if (dryRun || analyzeOnly) return acceptedImeis.entries.length;
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

function getPgDatabaseName() {
  if (process.env.PG_DATABASE) return process.env.PG_DATABASE;
  const url = process.env.DATABASE_URL;
  if (url) {
    try {
      const parsed = new URL(url.replace(/^postgresql:/, 'postgres:'));
      const name = parsed.pathname.replace(/^\//, '').split('?')[0];
      if (name) return name;
    } catch (_) {}
  }
  return 'az_handy_berlin';
}

function sqlLiteral(str) {
  return `'${String(str).replace(/'/g, "''")}'`;
}

function runPsql(dbName, psqlArgs, stdinSql) {
  const cmd = ['-u', 'postgres', 'psql', '-d', dbName, '-v', 'ON_ERROR_STOP=1', ...psqlArgs];
  const result = spawnSync('sudo', cmd, {
    encoding: 'utf-8',
    input: stdinSql ?? undefined,
    stdio: stdinSql != null ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe']
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'psql fehlgeschlagen').trim());
  }
  return (result.stdout ?? '').trim();
}

async function restoreUsersViaPostgres(backupUsers) {
  const dbName = getPgDatabaseName();
  console.log(`🔐 Wiederherstellung via sudo -u postgres psql (${dbName})…`);
  runPsql(dbName, ['-t', '-A', '-c', 'SELECT 1']);

  let updatedUsers = 0;
  let addedEntries = 0;

  for (const bu of backupUsers) {
    const uid = bu.userId;
    if (uid == null || !(bu.copyHistory?.length > 0)) continue;
    const uidNum = parseInt(uid, 10);
    if (!Number.isFinite(uidNum)) continue;

    const existing = runPsql(
      dbName,
      ['-t', '-A', '-c', `SELECT COALESCE(copy_history_json, '[]') FROM imeis_user_data WHERE user_id = ${uidNum} LIMIT 1`]
    );

    let currentHistory = [];
    if (existing) {
      currentHistory = safeParseJson(existing, []);
    } else {
      runPsql(dbName, ['-c', `INSERT INTO imeis_user_data (user_id, cell_colors_json, row_actions_json, copy_history_json, copy_timestamps_json, created_at, updated_at)
VALUES (${uidNum}, '{}', '{}', '[]', '[]', NOW(), NOW())
ON CONFLICT (user_id) DO NOTHING`]);
    }

    const merged = mergeHistoryRaw(currentHistory, bu.copyHistory ?? []);
    const delta = merged.length - (Array.isArray(currentHistory) ? currentHistory.length : 0);
    if (delta <= 0) continue;

    let sql = `UPDATE imeis_user_data SET copy_history_json = ${sqlLiteral(JSON.stringify(merged))}, updated_at = NOW() WHERE user_id = ${uidNum};`;
    if (Array.isArray(bu.copyTimestamps) && bu.copyTimestamps.length > 0) {
      sql += `\nUPDATE imeis_user_data SET copy_timestamps_json = ${sqlLiteral(JSON.stringify(bu.copyTimestamps))}, updated_at = NOW() WHERE user_id = ${uidNum};`;
    }
    runPsql(dbName, [], `${sql}\n`);

    addedEntries += delta;
    updatedUsers += 1;
    console.log(`  ✓ User ${uidNum}: ${currentHistory.length} → ${merged.length} (+${delta})`);
  }

  return { updatedUsers, addedEntries };
}

async function restoreUsersViaSequelize(backupUsers) {
  const { connectDatabase } = await import('../models/index.js');
  const { default: ImeisUserData } = await import('../models/ImeisUserData.js');

  await connectDatabase();

  let updatedUsers = 0;
  let addedEntries = 0;

  for (const bu of backupUsers) {
    const uid = bu.userId;
    if (uid == null || !(bu.copyHistory?.length > 0)) continue;
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
    if (delta > 0) {
      addedEntries += delta;
      updatedUsers += 1;
      await ImeisUserData.upsert({
        user_id: uid,
        copy_history_json: JSON.stringify(merged),
        ...(Array.isArray(bu.copyTimestamps) && bu.copyTimestamps.length > 0
          ? { copy_timestamps_json: JSON.stringify(bu.copyTimestamps) }
          : {})
      });
      console.log(`  ✓ User ${uid}: ${currentHistory.length} → ${merged.length} (+${delta})`);
    }
  }

  return { updatedUsers, addedEntries };
}

async function main() {
  bootstrapEnv();

  if (!sourcePath || !fs.existsSync(sourcePath)) {
    console.error('❌ Backup-Datei nicht gefunden.');
    process.exit(1);
  }

  const daysLabel = allDays ? 'alle Tage' : `letzte ${retentionDays} Tage`;
  console.log(`📂 Quelle: ${path.resolve(sourcePath)}`);
  console.log(`📅 Filter: ${daysLabel}${dryRun ? ' (Dry-Run)' : ''}${analyzeOnly ? ' (nur Analyse)' : ''}`);
  console.log('');

  const loaded = await loadSource(sourcePath);
  const backupUsers = loaded.users;
  const acceptedImeis = loaded.acceptedImeis;
  const rawHistoryTotal = loaded.rawHistoryTotal ??
    backupUsers.reduce((n, u) => n + (u.copyHistoryRawCount ?? u.copyHistory?.length ?? 0), 0);
  const backupHistoryTotal = backupUsers.reduce((n, u) => n + (u.copyHistory?.length ?? 0), 0);

  console.log(`📊 Backup: ${backupUsers.length} Benutzer`);
  console.log(`   Verlauf-Einträge gesamt im Backup: ${rawHistoryTotal}`);
  console.log(`   Nach Datumsfilter (${daysLabel}): ${backupHistoryTotal}`);

  const topUsers = [...backupUsers]
    .sort((a, b) => (b.copyHistory?.length ?? 0) - (a.copyHistory?.length ?? 0))
    .slice(0, 5);
  if (topUsers.some((u) => (u.copyHistory?.length ?? 0) > 0)) {
    console.log('   Top Benutzer (gefiltert):');
    for (const u of topUsers) {
      if ((u.copyHistory?.length ?? 0) === 0) continue;
      console.log(`     User ${u.userId}: ${u.copyHistory.length} Einträge`);
    }
  }

  if (backupHistoryTotal === 0 && rawHistoryTotal === 0) {
    console.warn('');
    console.warn('⚠️  Im Backup ist kein Verlauf (copy_history_json) gespeichert.');
    console.warn('   → Backup ist zu alt/leer, oder es gab damals noch keine Einträge.');
    console.warn('   → Für Verlauf der letzten 4 Tage brauchen Sie ein Backup von VOR dem Excel-Vorfall (heute ~16:00).');
  } else if (backupHistoryTotal === 0 && rawHistoryTotal > 0) {
    console.warn('');
    console.warn(`⚠️  ${rawHistoryTotal} Einträge im Backup, aber keiner im Filter "${daysLabel}".`);
    console.warn('   → Erneut mit --all-days versuchen.');
  }

  if (analyzeOnly || dryRun) {
    console.log('');
    console.log('ℹ️  Analyse/Dry-Run – Datenbank wird nicht beschrieben.');
    if (backupHistoryTotal > 0) {
      console.log('   Zum Speichern (ohne --dry-run):');
      const daysArg = allDays ? ' --all-days' : ` --days ${retentionDays}`;
      console.log(`   npm run restore-imei-verlauf -- ${sourcePath}${daysArg} --use-postgres`);
    }
    return;
  }

  if (backupHistoryTotal === 0) {
    process.exit(1);
  }

  console.log('');
  let updatedUsers = 0;
  let addedEntries = 0;

  if (usePostgres) {
    ({ updatedUsers, addedEntries } = await restoreUsersViaPostgres(backupUsers));
  } else {
    console.log('🔄 Verbinde mit Datenbank…');
    try {
      ({ updatedUsers, addedEntries } = await restoreUsersViaSequelize(backupUsers));
    } catch (err) {
      console.error('');
      console.error('❌ App-DB-Verbindung fehlgeschlagen:', err.message);
      console.log('');
      console.log('↪️  Fallback: postgres-Superuser (sudo -u postgres psql)…');
      try {
        ({ updatedUsers, addedEntries } = await restoreUsersViaPostgres(backupUsers));
      } catch (pgErr) {
        console.error('');
        console.error('❌ postgres-Fallback fehlgeschlagen:', pgErr.message);
        dbHint(sourcePath, retentionDays, allDays);
        process.exit(1);
      }
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
  console.log('');
  console.log('💡 pm2 restart all  →  IMEI-Seite Strg+Shift+R');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch((err) => {
  console.error('❌ Wiederherstellung fehlgeschlagen:', err.message);
  process.exit(1);
});
