import UserMemory, { users } from './User.memory.js';
import UserPostgres from './User.model.js';

const hasPostgresConfig = process.env.DATABASE_URL || process.env.PG_DATABASE || process.env.PG_USER;
const USE_MEMORY_DB = process.env.USE_MEMORY_DB === 'true' || !hasPostgresConfig;

const UserModel = USE_MEMORY_DB ? UserMemory : UserPostgres;

export default UserModel;
export { users };
