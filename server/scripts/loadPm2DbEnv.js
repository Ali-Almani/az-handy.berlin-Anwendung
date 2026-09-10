import fs from 'fs';
import { execSync } from 'child_process';

const DB_ENV_KEYS = ['DATABASE_URL', 'PG_USER', 'PG_PASSWORD', 'PG_HOST', 'PG_PORT', 'PG_DATABASE'];

function applyEnv(envObj, override) {
  if (!envObj) return 0;
  let n = 0;
  for (const key of DB_ENV_KEYS) {
    const val = envObj[key];
    if (val == null || val === '') continue;
    if (override || !process.env[key]) {
      process.env[key] = String(val);
      n += 1;
    }
  }
  return n;
}

/** DB-Zugangsdaten aus laufendem PM2-Prozess (z. B. az-api) laden. */
export function loadPm2DbEnv(appName = 'az-api') {
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
