import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Absoluter Pfad – funktioniert auch bei PM2/verschiedenen Arbeitsverzeichnissen
const DATA_DIR = path.resolve(__dirname, '..', 'data');

export const ensureDataDir = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log(`📁 Datenverzeichnis erstellt: ${DATA_DIR}`);
    }
  } catch (err) {
    console.error(`❌ Datenverzeichnis konnte nicht erstellt werden (${DATA_DIR}):`, err.message);
  }
};

export const getDataDir = () => DATA_DIR;

export const loadJson = (filename) => {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(filepath)) {
      const content = fs.readFileSync(filepath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn(`Could not load ${filename}:`, err.message);
  }
  return null;
};

export const saveJson = (filename, data) => {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  try {
    const fd = fs.openSync(filepath, 'w');
    fs.writeFileSync(fd, JSON.stringify(data, null, 2), 'utf-8');
    fs.fsyncSync(fd); // Daten sofort auf Disk schreiben
    fs.closeSync(fd);
  } catch (err) {
    console.error(`❌ Could not save ${filename} (${filepath}):`, err.message);
  }
};
