import DashboardNotePostgres from './DashboardNote.model.js';
import DashboardNoteMemory from './DashboardNote.memory.js';

const hasPostgresConfig = process.env.DATABASE_URL || process.env.PG_DATABASE || process.env.PG_USER;
const USE_MEMORY_DB = process.env.USE_MEMORY_DB === 'true' || !hasPostgresConfig;

const DashboardNote = USE_MEMORY_DB ? DashboardNoteMemory : DashboardNotePostgres;

export default DashboardNote;
