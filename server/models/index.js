import { sequelize } from '../config/database.js';
import User from './User.model.js';

const initDatabase = async () => {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
};

export { sequelize, User, initDatabase };
