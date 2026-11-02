/**
 * Muss als erstes geladen werden, damit .env vor allen anderen Modulen verfügbar ist.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
const rootEnv = dotenv.config({ path: path.join(__dirname, '..', '.env') });
if (!String(process.env.GEMINI_API_KEY || '').trim()) {
  const fromRoot = String(rootEnv.parsed?.GEMINI_API_KEY || '').trim();
  if (fromRoot) process.env.GEMINI_API_KEY = fromRoot;
}
for (const key of [
  'WHATSAPP_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_BUSINESS_ACCOUNT_ID',
  'WHATSAPP_APP_SECRET',
  'WHATSAPP_VERIFY_TOKEN'
]) {
  if (!String(process.env[key] || '').trim()) {
    const fromRoot = String(rootEnv.parsed?.[key] || '').trim();
    if (fromRoot) process.env[key] = fromRoot;
  }
}

// Persistenz immer aktivieren (Daten bleiben nach Neustart) – außer explizit 'false' in .env
if (process.env.PERSIST_MEMORY_DATA !== 'false') {
  process.env.PERSIST_MEMORY_DATA = 'true';
}

// Datenverzeichnis sofort erstellen (damit Modelle beim Laden schreiben können)
try {
  const dataDir = path.resolve(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`📁 server/data erstellt: ${dataDir}`);
  }
} catch (_) {}
