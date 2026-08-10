import { loadJson, saveJson } from './filePersistence.js';

const FILE = 'dashboard-imei-settings.json';

/** Standard: „Alle löschen“ deaktiviert (Schutz vor Datenverlust). */
export function getImeiDeleteAllEnabled() {
  const data = loadJson(FILE);
  return data?.deleteAllEnabled === true;
}

export function saveImeiDeleteAllEnabled(enabled) {
  saveJson(FILE, {
    deleteAllEnabled: enabled === true,
    updatedAt: new Date().toISOString()
  });
}
