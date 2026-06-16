import bcrypt from 'bcryptjs';
import { readJsonStore, updateJsonStore } from '../utils/jsonClusterStore.js';
import { getPersist } from '../utils/persistConfig.js';

const FILE = 'users.json';
const DEFAULT = () => [];

const uuidv4 = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const toPlainUser = (u) => ({
  _id: u._id ?? u.id,
  name: u.name,
  email: u.email,
  password: u.password,
  role: u.role,
  avatar: u.avatar ?? null,
  einsatz_ort: u.einsatz_ort ?? null,
  telefon: u.telefon ?? null,
  createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
  updatedAt: u.updatedAt instanceof Date ? u.updatedAt.toISOString() : u.updatedAt
});

const fromPlainUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  password: u.password,
  role: u.role,
  avatar: u.avatar ?? null,
  einsatz_ort: u.einsatz_ort ?? null,
  telefon: u.telefon ?? null,
  createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
  updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date()
});

const readUsersPlain = () => {
  const data = readJsonStore(FILE, DEFAULT());
  if (!Array.isArray(data)) return [];
  return data.map(fromPlainUser);
};

const writeUsersPlain = (usersPlain, updaterResult) =>
  updateJsonStore(FILE, DEFAULT(), (arr) => {
    const list = Array.isArray(arr) ? arr : [];
    list.length = 0;
    usersPlain.forEach((u) => list.push(toPlainUser(u)));
    return updaterResult;
  });

const mutateUsers = async (fn) => {
  const users = readUsersPlain();
  const result = await fn(users);
  writeUsersPlain(users, result);
  return result;
};

const createDefaultAdmin = async () => {
  const existing = readUsersPlain();
  if (existing.length > 0) return;
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  await mutateUsers((users) => {
    if (users.length > 0) return;
    users.push({
      _id: 'admin-' + uuidv4(),
      name: 'Ali Almani',
      email: 'admin@az-handy.berlin',
      password: adminPassword,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });
  if (getPersist()) {
    console.log('✅ Default admin user created (In-Memory Mode)');
    console.log('   Email: admin@az-handy.berlin');
    console.log('   Password: Admin123!');
  }
};

await createDefaultAdmin();

class InMemoryUser {
  constructor(data) {
    this._id = data._id || uuidv4();
    this.id = this._id;
    this.name = data.name;
    this.email = data.email.toLowerCase().trim();
    this.password = data.password;
    this.role = data.role || 'user';
    this.avatar = data.avatar ?? null;
    this.einsatz_ort = data.einsatz_ort ?? null;
    this.telefon = data.telefon ?? null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  async save() {
    if (this.password && !this.password.startsWith('$2')) {
      this.password = await bcrypt.hash(this.password, 12);
    }
    return mutateUsers((users) => {
      const existingIndex = users.findIndex((u) => u._id === this._id);
      this.updatedAt = new Date();
      const plain = {
        _id: this._id,
        name: this.name,
        email: this.email,
        password: this.password,
        role: this.role,
        avatar: this.avatar,
        einsatz_ort: this.einsatz_ort,
        telefon: this.telefon,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
      };
      if (existingIndex >= 0) {
        users[existingIndex] = plain;
      } else {
        users.push(plain);
      }
      return this;
    });
  }

  async comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
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
    if (!query || Object.keys(query).length === 0) return null;
    const users = readUsersPlain();
    const email = query.email || query.where?.email;
    if (email) {
      const user = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
      return user ? new InMemoryUser(user) : null;
    }
    const name = query.name || query.where?.name;
    if (name) {
      const user = users.find((u) => String(u.name || '').trim() === String(name).trim());
      return user ? new InMemoryUser(user) : null;
    }
    const key = Object.keys(query)[0];
    const value = query[key];
    const user = users.find((u) => {
      if (key === 'email') return u[key].toLowerCase() === value.toLowerCase();
      return u[key] === value;
    });
    return user ? new InMemoryUser(user) : null;
  }

  static async findById(id) {
    const user = readUsersPlain().find((u) => u._id === id);
    return user ? new InMemoryUser(user) : null;
  }

  static async findByPk(id) {
    if (id == null || id === '') return null;
    const sid = String(id);
    const user = readUsersPlain().find((u) => {
      const uid = u._id ?? u.id;
      return uid === id || String(uid) === sid;
    });
    return user ? new InMemoryUser(user) : null;
  }

  static async create(data) {
    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = new InMemoryUser({ ...data, password: hashedPassword, _id: uuidv4() });
    await user.save();
    return user;
  }

  static async find(query = {}) {
    const users = readUsersPlain();
    if (Object.keys(query).length === 0) {
      return users.map((u) => new InMemoryUser(u));
    }
    return users.filter((u) => Object.keys(query).every((key) => u[key] === query[key])).map((u) => new InMemoryUser(u));
  }

  static async findAll(options = {}) {
    const where = options?.where || {};
    const users = readUsersPlain();
    if (Object.keys(where).length === 0) {
      return users.map((u) => new InMemoryUser(u));
    }
    return users
      .filter((u) =>
        Object.entries(where).every(([key, val]) => {
          const uv = u[key];
          if (val == null) return uv == null || uv === '';
          return String(uv || '').trim() === String(val || '').trim();
        })
      )
      .map((u) => new InMemoryUser(u));
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
    await mutateUsers((users) => {
      const idx = users.findIndex(
        (u) => u._id === id || u.id === id || String(u._id) === String(id)
      );
      if (idx >= 0) users.splice(idx, 1);
    });
  }
}

export default InMemoryUser;
