/**
 * Muss als erstes geladen werden, damit .env vor allen anderen Modulen verfügbar ist.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

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
