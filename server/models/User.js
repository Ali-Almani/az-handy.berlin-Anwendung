import UserMemory from './User.memory.js';
import UserPostgres from './User.model.js';

function shouldUseMemoryDb() {
  const hasPostgresConfig = process.env.DATABASE_URL || process.env.PG_DATABASE || process.env.PG_USER;
  return process.env.USE_MEMORY_DB === 'true' || !hasPostgresConfig;
}

function getUserModel() {
  return shouldUseMemoryDb() ? UserMemory : UserPostgres;
}

/** Wechsel PostgreSQL ↔ Datei-Speicher zur Laufzeit (z. B. nach DB-Ausfall). */
const User = new Proxy(
  {},
  {
    get(_target, prop) {
      const Model = getUserModel();
      const value = Reflect.get(Model, prop, Model);
      if (typeof value === 'function') {
        return value.bind(Model);
      }
      return value;
    }
  }
);

export default User;
