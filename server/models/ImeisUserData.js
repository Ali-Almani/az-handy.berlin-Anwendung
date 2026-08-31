import ImeisUserDataPostgres from './ImeisUserData.model.js';
import ImeisUserDataMemory from './ImeisUserData.memory.js';

function shouldUseMemoryDb() {
  const hasPostgresConfig = process.env.DATABASE_URL || process.env.PG_DATABASE || process.env.PG_USER;
  return process.env.USE_MEMORY_DB === 'true' || !hasPostgresConfig;
}

function getModel() {
  return shouldUseMemoryDb() ? ImeisUserDataMemory : ImeisUserDataPostgres;
}

/** Wie User.js: PostgreSQL ↔ Datei-Speicher zur Laufzeit (nach DB-Ausfall). */
const ImeisUserData = new Proxy(
  {},
  {
    get(_target, prop) {
      const Model = getModel();
      const value = Reflect.get(Model, prop, Model);
      if (typeof value === 'function') {
        return value.bind(Model);
      }
      return value;
    }
  }
);

export default ImeisUserData;
