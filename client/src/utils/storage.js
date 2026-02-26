// IndexedDB Utility für große Datenmengen
const DB_NAME = 'az-handy-berlin-db';
const DB_VERSION = 1;
const STORE_NAME = 'imeis';

let db = null;

// Öffne IndexedDB
const openDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('imei', 'imei', { unique: false });
        objectStore.createIndex('sheet', 'sheet', { unique: false });
      }
    };
  });
};

// Speichere IMEIs in IndexedDB
export const saveImeis = async (imeis) => {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Lösche alle alten Daten
    await store.clear();

    // Füge neue Daten hinzu - in Batches um Memory-Probleme zu vermeiden
    const batchSize = 1000;
    for (let i = 0; i < imeis.length; i += batchSize) {
      const batch = imeis.slice(i, i + batchSize);
      const promises = batch.map((imei, batchIndex) => {
        // Optimiere Datenstruktur - entferne leere Arrays
        const optimizedImei = { ...imei };
        if (optimizedImei.data && Array.isArray(optimizedImei.data) && optimizedImei.data.length === 0) {
          delete optimizedImei.data;
        }
        return store.add({
          ...optimizedImei,
          id: i + batchIndex + 1
        });
      });
      await Promise.all(promises);
    }
    return true;
  } catch (error) {
    console.error('Error saving IMEIs to IndexedDB:', error);
    // Fallback zu localStorage wenn IndexedDB nicht verfügbar
    try {
      localStorage.setItem('imeis', JSON.stringify(imeis));
      return true;
    } catch (localStorageError) {
      console.error('Error saving to localStorage:', localStorageError);
      throw new Error('Speicher fehlgeschlagen. Bitte reduzieren Sie die Datenmenge.');
    }
  }
};

// Lade IMEIs aus IndexedDB
export const loadImeis = async () => {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        try {
          // Entferne id-Feld und optimiere Datenstruktur
          const imeis = request.result.map(item => {
            const { id, ...rest } = item;
            // Entferne leere Datenfelder um Speicher zu sparen
            if (rest.data && Array.isArray(rest.data) && rest.data.length === 0) {
              delete rest.data;
            }
            return rest;
          });
          resolve(imeis);
        } catch (error) {
          console.error('Error processing IMEIs:', error);
          resolve([]);
        }
      };
      request.onerror = () => {
        // Fallback zu localStorage
        try {
          const stored = localStorage.getItem('imeis');
          resolve(stored ? JSON.parse(stored) : []);
        } catch (error) {
          reject(error);
        }
      };
    });
  } catch (error) {
    console.error('Error loading IMEIs from IndexedDB:', error);
    // Fallback zu localStorage
    try {
      const stored = localStorage.getItem('imeis');
      return stored ? JSON.parse(stored) : [];
    } catch (localStorageError) {
      console.error('Error loading from localStorage:', localStorageError);
      return [];
    }
  }
};

// Lösche alle IMEIs
export const deleteAllImeis = async () => {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await store.clear();
    
    // Lösche auch aus localStorage falls vorhanden
    localStorage.removeItem('imeis');
    return true;
  } catch (error) {
    console.error('Error deleting IMEIs:', error);
    localStorage.removeItem('imeis');
    return true;
  }
};

// Lösche einen einzelnen IMEI
export const deleteImei = async (index) => {
  try {
    const imeis = await loadImeis();
    const updatedImeis = imeis.filter((_, i) => i !== index);
    await saveImeis(updatedImeis);
    return true;
  } catch (error) {
    console.error('Error deleting IMEI:', error);
    throw error;
  }
};
