import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database.js';

const ROLES = [
  'admin',
  'Administrator',
  'Büro Mitarbeiter',
  'Marketing',
  'Callcenter',
  'Shops',
  'Buchhaltung',
  'Einkauf',
  'Partner',
  'Teamleiter shop',
  'Mitarbeiter shop'
];

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Name is required' }
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: { msg: 'Please provide a valid email' },
      notEmpty: { msg: 'Email is required' }
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: { args: [6, 255], msg: 'Password must be at least 6 characters' }
    }
  },
  role: {
    type: DataTypes.ENUM(...ROLES),
    defaultValue: 'Marketing'
  },
  avatar: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  einsatz_ort: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: 'Einsatzort-Kategorie: Zentrale, Sonne, KM127, KM169, KM50, Turm, Bad, Haupt'
  },
  telefon: {
    type: DataTypes.STRING(40),
    allowNull: true
  },
  tshirt_groesse: {
    type: DataTypes.STRING(8),
    allowNull: true,
    comment: 'Uniform-Größe (nur Mitarbeiter shop): S, M, L, XL, 2XL–5XL'
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    }
  }
});

User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

export default User;
