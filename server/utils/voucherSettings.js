import { loadJson, saveJson } from './filePersistence.js';

const FILE = 'dashboard-voucher-settings.json';

/** Standard: „Alle löschen“ deaktiviert (Schutz vor Datenverlust). */
export function getVoucherDeleteAllEnabled() {
  const data = loadJson(FILE);
  return data?.deleteAllEnabled === true;
}

export function saveVoucherDeleteAllEnabled(enabled) {
  saveJson(FILE, {
    deleteAllEnabled: enabled === true,
    updatedAt: new Date().toISOString()
  });
}
