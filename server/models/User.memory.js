import bcrypt from 'bcryptjs';
import { loadJson, saveJson } from '../utils/filePersistence.js';

const getPersist = () => process.env.PERSIST_MEMORY_DATA !== 'false';

const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const users = [];

const toPlainUser = (u) => ({
  _id: u._id ?? u.id,
  name: u.name,
  email: u.email,
  password: u.password,
  role: u.role,
  avatar: u.avatar ?? null,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt
});

const persistUsers = () => {
  if (!getPersist()) return;
  const data = users.map(u => {
    const p = toPlainUser(u);
    p.createdAt = p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt;
    p.updatedAt = p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt;
    return p;
  });
  saveJson('users.json', data);
};

const loadUsers = () => {
  if (!getPersist()) return;
  const data = loadJson('users.json');
  if (Array.isArray(data) && data.length > 0) {
    users.length = 0;
    data.forEach(u => {
      users.push({
        _id: u._id,
        name: u.name,
        email: u.email,
        password: u.password,
        role: u.role,
        avatar: u.avatar ?? null,
        createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
        updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date()
      });
    });
    console.log(`✅ ${users.length} Benutzer aus Datei geladen`);
    return;
  }
};

const createDefaultAdmin = async () => {
  loadUsers();
  if (users.length > 0) return;
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const adminUser = {
    _id: 'admin-' + uuidv4(),
    name: 'Ali Almani',
    email: 'admin@az-handy.berlin',
    password: adminPassword,
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  users.push(adminUser);
  persistUsers();
  console.log('✅ Default admin user created (In-Memory Mode)');
  console.log('   Email: admin@az-handy.berlin');
  console.log('   Password: Admin123!');
  return adminUser;
};

createDefaultAdmin();

class InMemoryUser {
  constructor(data) {
    this._id = data._id || uuidv4();
    this.id = this._id;
    this.name = data.name;
    this.email = data.email.toLowerCase().trim();
    this.password = data.password;
    this.role = data.role || 'user';
    this.avatar = data.avatar ?? null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  async save() {
    if (this.password && !this.password.startsWith('$2')) {
      this.password = await bcrypt.hash(this.password, 12);
    }
    const existingIndex = users.findIndex(u => u._id === this._id);
    if (existingIndex >= 0) {
      this.updatedAt = new Date();
      users[existingIndex] = this;
    } else {
      users.push(this);
    }
    persistUsers();
    return this;
  }

  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  toJSON() {
    const obj = { ...this };
    delete obj.password;
    return obj;
  }

  toObject() {
    return this.toJSON();
  }

  static async findOne(query) {
    if (!query || Object.keys(query).length === 0) {
      return null;
    }
    const email = query.email || query.where?.email;
    if (email) {
      const user = users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
      return user ? new InMemoryUser(user) : null;
    }
    const name = query.name || query.where?.name;
    if (name) {
      const user = users.find(u => String(u.name || '').trim() === String(name).trim());
      return user ? new InMemoryUser(user) : null;
    }
    const key = Object.keys(query)[0];
    const value = query[key];
    const user = users.find(u => {
      if (key === 'email') {
        return u[key].toLowerCase() === value.toLowerCase();
      }
      return u[key] === value;
    });
    return user ? new InMemoryUser(user) : null;
  }

  static async findById(id) {
    const user = users.find(u => u._id === id);
    return user ? new InMemoryUser(user) : null;
  }

  static async findByPk(id) {
    if (id == null || id === '') return null;
    const sid = String(id);
    const user = users.find(u => {
      const uid = u._id ?? u.id;
      return uid === id || String(uid) === sid;
    });
    return user ? new InMemoryUser(user) : null;
  }

  static async create(data) {
    const hashedPassword = await bcrypt.hash(data.password, 12);
    const userData = {
      ...data,
      password: hashedPassword,
      _id: uuidv4()
    };
    const user = new InMemoryUser(userData);
    await user.save();
    return user;
  }

  static async find(query = {}) {
    if (Object.keys(query).length === 0) {
      return users.map(u => new InMemoryUser(u));
    }
    return users
      .filter(u => {
        return Object.keys(query).every(key => u[key] === query[key]);
      })
      .map(u => new InMemoryUser(u));
  }

  static async findOneAndUpdate(query, update) {
    const user = await this.findOne(query);
    if (user) {
      Object.assign(user, update);
      user.updatedAt = new Date();
      await user.save();
    }
    return user;
  }

  static async destroy(options = {}) {
    const id = options?.where?.id ?? options?.where?.user_id ?? options?.id;
    const idx = users.findIndex(u => u._id === id || u.id === id || String(u._id) === String(id));
    if (idx >= 0) {
      users.splice(idx, 1);
      persistUsers();
    }
  }
}

export default InMemoryUser;
export { users };
