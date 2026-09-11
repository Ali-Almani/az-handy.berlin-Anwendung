/**
 * Einmalig: IMEIs nach „abgelehnt“ wieder in die Master-Liste, wenn sie dort fehlen.
 *
 * Quellen:
 *   - audit-log.json (action imei.history.abgelehnt)
 *   - optional server-data.tar.gz (Zeilenvorlagen + --include-backup-missing)
 *
 *   cd server
 *   npm run restore-rejected-imeis -- --env-from-pm2 --dry-run
 *   npm run restore-rejected-imeis -- --from=2026-09-11 --env-from-pm2
 *   npm run restore-rejected-imeis -- --backup=/root/backups/heute/server-data.tar.gz --env-from-pm2
 *
 * Optionen:
 *   --dry-run                  Nur anzeigen
 *   --from=YYYY-MM-DD          Ab UTC-Mitternacht (Standard: heute Europe/Berlin als Datum)
 *   --to=YYYY-MM-DD            Bis UTC-Ende des Tages
 *   --env-from-pm2             DB aus PM2 az-api
 *   --backup=PATH              server-data.tar.gz für Excel-Zeilen
 *   --include-backup-missing   Zusätzlich: IMEIs in Backup-Liste, nicht in aktueller Master-Liste
 *                              (ohne Angenommen-Archiv / ohne Audit „angenommen“ im Zeitraum)
 */
import '../loadEnv.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { readJsonStore } from '../utils/jsonClusterStore.js';
import { AUDIT_LOG_FILE } from '../utils/auditLog.js';
import { getAcceptedImeiKeySet } from '../utils/acceptedImeiStore.js';
import { normalizeImeiKey, canonicalImeiString } from '../utils/imeiKey.js';
import { normalizeSonderImeiKey } from '../utils/sonderImeiStore.js';
import {
  getSharedImeiOwnerId,
  getSharedOwnerImeiKeySet,
  clearRowActionsForImeiAllUsers,
  restoreImeiToSharedOwnerList
} from '../utils/imeiSharedListRestore.js';
import { invalidateImeiRedisCaches } from '../utils/invalidateImeiRedisCaches.js';
import { loadPm2DbEnv } from './loadPm2DbEnv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATHS = [
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', '..', '.env'),
  '/root/az-handy.berlin-Anwendung/server/.env'
];

const dryRun = process.argv.includes('--dry-run');
const includeBackupMissing = process.argv.includes('--include-backup-missing');

function bootstrapEnv() {
  for (const p of ENV_PATHS) {
    if (fs.existsSync(p)) dotenv.config({ path: p, override: false });
  }
  if (process.argv.includes('--env-from-pm2')) {
    loadPm2DbEnv(process.env.PM2_APP_NAME || 'az-api');
  }
}

function berlinTodayYmd() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' });
}

function parseDateStartUtc(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const d = new Date(`${raw}T00:00:00.000Z`);
  return Number.isFinite(d.getTime()) ? d.getTime() : null;
}

function parseDateEndUtc(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const d = new Date(`${raw}T23:59:59.999Z`);
  return Number.isFinite(d.getTime()) ? d.getTime() : null;
}

function parseArgValue(prefix) {
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function safeParseJson(raw, fallback) {
  try {
    if (raw == null || raw === '') return fallback;
    if (typeof raw === 'object') return raw;
    return JSON.parse(String(raw));
  } catch (_) {
    return fallback;
  }
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
  const tmp = path.join(os.tmpdir(), `restore-rejected-${Date.now()}.json`);
  const fd = fs.openSync(tmp, 'w');
  try {
    const result = spawnSync('tar', ['-xOf', tarPath, member], { stdio: ['ignore', fd, 'pipe'] });
    if (result.status !== 0) {
      throw new Error(result.stderr?.toString('utf-8').trim() || `tar exit ${result.status}`);
    }
  } finally {
    fs.closeSync(fd);
  }
  return tmp;
}

/** imeiKey → beste Zeile aus server-data imeis.json */
function buildBackupImeiRowMap(tarPath) {
  const members = listTarMembers(tarPath);
  const imeisMember = members.find((m) => /imeis\.json$/i.test(m) && !/accepted/i.test(m));
  if (!imeisMember) {
    throw new Error('imeis.json nicht in Backup gefunden');
  }
  const tmp = extractTarMemberToTempFile(tarPath, imeisMember);
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(tmp, 'utf-8'));
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch (_) {}
  }
  const map = new Map();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return map;
  for (const val of Object.values(raw)) {
    if (!val || typeof val !== 'object') continue;
    const arr = safeParseJson(val.imeis_json, []);
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      const key = normalizeImeiKey(item?.imei);
      if (!key) continue;
      const score = item?.rowData && typeof item.rowData === 'object' ? Object.keys(item.rowData).length : 0;
      const prev = map.get(key);
      const prevScore =
        prev?.rowData && typeof prev.rowData === 'object' ? Object.keys(prev.rowData).length : 0;
      if (!prev || score > prevScore) map.set(key, item);
    }
  }
  return map;
}

function backupOwnerImeiKeys(backupMap) {
  return new Set(backupMap.keys());
}

function collectAuditImeisByAction(fromMs, toMs) {
  const data = readJsonStore(AUDIT_LOG_FILE, { entries: [] });
  const entries = Array.isArray(data.entries) ? data.entries : [];
  const rejected = new Map();
  const accepted = new Set();
  for (const e of entries) {
    const ts = Date.parse(e?.timestamp ?? '');
    if (!Number.isFinite(ts)) continue;
    if (fromMs != null && ts < fromMs) continue;
    if (toMs != null && ts > toMs) continue;
    const action = String(e?.action ?? '').trim();
    const imeiRaw = e?.meta?.imei ?? parseImeiFromSummary(e?.summary);
    const key = normalizeImeiKey(imeiRaw);
    if (!key) continue;
    if (action === 'imei.history.abgelehnt') {
      if (!rejected.has(key) || ts > rejected.get(key).ts) {
        rejected.set(key, { imei: canonicalImeiString(imeiRaw), ts, logId: e.id });
      }
    }
    if (action === 'imei.history.angenommen') {
      accepted.add(key);
    }
  }
  return { rejected, acceptedInWindow: accepted };
}

function parseImeiFromSummary(summary) {
  const s = String(summary ?? '');
  const m = s.match(/IMEI\s+(\d{14,17})/i);
  return m ? m[1] : '';
}

async function main() {
  bootstrapEnv();

  const fromYmd = parseArgValue('--from=') || berlinTodayYmd();
  const toYmd = parseArgValue('--to=') || null;
  const fromMs = parseDateStartUtc(fromYmd);
  const toMs = toYmd ? parseDateEndUtc(toYmd) : null;
  const backupPath = parseArgValue('--backup=');

  if (fromMs == null) {
    console.error('❌ Ungültiges --from-Datum');
    process.exit(1);
  }

  console.log(`🔧 Abgelehnt → Master-Liste | von ${fromYmd}${toYmd ? ` bis ${toYmd}` : ''}${dryRun ? ' | DRY-RUN' : ''}`);

  const { sequelize } = await import('../config/database.js');
  await sequelize.authenticate();

  const acceptedKeys = getAcceptedImeiKeySet();
  const { rejected, acceptedInWindow } = collectAuditImeisByAction(fromMs, toMs);
  console.log(`📋 Audit: ${rejected.size} abgelehnt, ${acceptedInWindow.size} angenommen (im Zeitraum)`);

  let backupMap = new Map();
  if (backupPath) {
    if (!fs.existsSync(backupPath)) {
      console.error(`❌ Backup nicht gefunden: ${backupPath}`);
      process.exit(1);
    }
    backupMap = buildBackupImeiRowMap(backupPath);
    console.log(`📦 Backup-Zeilen: ${backupMap.size} IMEIs`);
  }

  const currentKeys = await getSharedOwnerImeiKeySet();
  const ownerId = await getSharedImeiOwnerId();
  console.log(`📊 Master-Liste (Owner ${ownerId ?? '?'}): ${currentKeys.size} IMEIs`);

  const candidates = new Map();
  for (const [key, info] of rejected) {
    if (acceptedKeys.has(key) || acceptedKeys.has(normalizeSonderImeiKey(info.imei))) continue;
    if (acceptedInWindow.has(key)) continue;
    if (currentKeys.has(key)) continue;
    candidates.set(key, { imei: info.imei, source: 'audit', logId: info.logId });
  }

  if (includeBackupMissing && backupMap.size > 0) {
    const backupKeys = backupOwnerImeiKeys(backupMap);
    for (const key of backupKeys) {
      if (currentKeys.has(key)) continue;
      if (acceptedKeys.has(key)) continue;
      if (acceptedInWindow.has(key)) continue;
      if (candidates.has(key)) continue;
      const row = backupMap.get(key);
      candidates.set(key, {
        imei: canonicalImeiString(row?.imei ?? key),
        source: 'backup-missing'
      });
    }
  }

  if (candidates.size === 0) {
    console.log('✅ Keine fehlenden IMEIs zum Wiederherstellen.');
    await sequelize.close();
    return;
  }

  console.log(`\n➡️  ${candidates.size} Kandidat(en):\n`);
  let restored = 0;
  let skipped = 0;
  for (const [key, info] of candidates) {
    const rowTemplate = backupMap.get(key) ?? null;
    console.log(`  • ${info.imei} (${info.source}${info.logId ? `, ${info.logId}` : ''})`);
    if (dryRun) {
      restored += 1;
      continue;
    }
    await clearRowActionsForImeiAllUsers(info.imei);
    const result = await restoreImeiToSharedOwnerList(info.imei, { rowTemplate });
    if (result.ok && result.reason === 'restored') {
      restored += 1;
      console.log('    ✓ wiederhergestellt');
    } else if (result.ok && result.reason === 'already_present') {
      skipped += 1;
      console.log('    ○ bereits in Liste');
    } else {
      console.log(`    ✗ fehlgeschlagen (${result.reason ?? 'unknown'})`);
    }
  }

  if (!dryRun && restored > 0) {
    await invalidateImeiRedisCaches();
  }

  console.log('');
  console.log(
    dryRun
      ? `DRY-RUN: ${restored} würden wiederhergestellt.`
      : `Fertig: ${restored} wiederhergestellt, ${skipped} bereits vorhanden.`
  );

  await sequelize.close();
}

main().catch((err) => {
  console.error('❌', err?.message || err);
  process.exit(1);
});
