import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const DashboardNote = sequelize.define('DashboardNote', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: ''
  }
}, {
  tableName: 'dashboard_notes',
  timestamps: true,
  underscored: true
});

export default DashboardNote;
