import { sequelize } from '../config/database.js';
import User from './User.model.js';
import './DashboardNote.model.js';
import './DashboardNoteHistory.model.js';
import './ImeisUserData.model.js';

/** Nur Verbindung – für Skripte und schnellen Server-Start (kein Tabellen-Lock). */
const connectDatabase = async () => {
  await sequelize.authenticate();
};

/**
 * Vollständiger DB-Start. alter:true nur wenn DB_SYNC_ALTER=true (Migration),
 * sonst in Development – in Production nie automatisch (verhindert Hänger/502).
 */
const initDatabase = async () => {
  await connectDatabase();
  const runAlterSync =
    process.env.DB_SYNC_ALTER === 'true' ||
    (process.env.NODE_ENV !== 'production' && process.env.DB_SYNC_ALTER !== 'false');
  if (runAlterSync) {
    await sequelize.sync({ alter: true });
  }
};

export { sequelize, User, connectDatabase, initDatabase };
