import bcrypt from 'bcryptjs';

const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const users = [];

const createDefaultAdmin = async () => {
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
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  async save() {
    const existingIndex = users.findIndex(u => u._id === this._id);
    if (existingIndex >= 0) {
      this.updatedAt = new Date();
      users[existingIndex] = this;
    } else {
      users.push(this);
    }
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
    const user = users.find(u => u._id === id || u._id === String(id));
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
}

export default InMemoryUser;
export { users };
