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
      const value = Model[prop];
      if (typeof value === 'function') {
        return (...args) => value.apply(Model, args);
      }
      return value;
    }
  }
);

export default User;
