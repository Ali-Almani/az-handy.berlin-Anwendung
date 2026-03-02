import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const DashboardNoteHistory = sequelize.define('DashboardNoteHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'dashboard_note_history',
  timestamps: true,
  underscored: true,
  updatedAt: false
});

export default DashboardNoteHistory;
