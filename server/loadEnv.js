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

// In Produktion: Persistenz immer aktivieren (vor dem Laden der Modelle!)
if (process.env.NODE_ENV === 'production') {
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
