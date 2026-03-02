import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const ImeisUserData = sequelize.define('ImeisUserData', {
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
  imeis_json: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON array of IMEI records'
  },
  cell_colors_json: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '{}',
    comment: 'JSON object: cellId -> color'
  },
  row_actions_json: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '{}',
    comment: 'JSON object: rowId -> { action, userName, timestamp }'
  },
  copy_history_json: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '[]',
    comment: 'JSON array of copy history entries'
  },
  copy_timestamps_json: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '[]',
    comment: 'JSON array of copy timestamps for rate limit (synced across browsers)'
  }
}, {
  tableName: 'imeis_user_data',
  timestamps: true,
  underscored: true
});

export default ImeisUserData;
