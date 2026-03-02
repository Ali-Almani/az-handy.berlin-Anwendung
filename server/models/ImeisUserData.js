import ImeisUserDataPostgres from './ImeisUserData.model.js';
import ImeisUserDataMemory from './ImeisUserData.memory.js';

const hasPostgresConfig = process.env.DATABASE_URL || process.env.PG_DATABASE || process.env.PG_USER;
const USE_MEMORY_DB = process.env.USE_MEMORY_DB === 'true' || !hasPostgresConfig;

export default USE_MEMORY_DB ? ImeisUserDataMemory : ImeisUserDataPostgres;
