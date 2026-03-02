import { sequelize } from '../config/database.js';
import User from './User.model.js';
import './DashboardNote.model.js';
import './DashboardNoteHistory.model.js';
import './ImeisUserData.model.js';

const initDatabase = async () => {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
};

export { sequelize, User, initDatabase };
