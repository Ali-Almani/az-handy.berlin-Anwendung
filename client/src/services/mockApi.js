import { mockLogin, mockRegister } from './mockAuth';
import { mockGetProfile, mockUpdateProfile, mockUpdatePassword, mockCreateUserByAdmin, mockGetAllUsers, mockUpdateUserByAdmin, mockRestoreAdmin, mockDeleteUser } from './mockUserApi';

const mockUsers = [
  { id: 'admin-1', name: 'Ali Almani', email: 'admin@az-handy.berlin', password: 'Admin123!', role: 'Administrator', createdAt: new Date().toISOString() },
  { id: 'user-1', name: 'Test Benutzer', email: 'test@example.com', password: 'test123', role: 'user', createdAt: new Date().toISOString() }
];

const mockApi = {
  async login(credentials) { return mockLogin(mockUsers, credentials); },
  async register(userData) { return mockRegister(mockUsers, userData); },
  async getProfile(token) { return mockGetProfile(mockUsers, token); },
  async updateProfile(token, updates) { return mockUpdateProfile(mockUsers, token, updates); },
  async updatePassword(token, passwordData) { return mockUpdatePassword(mockUsers, token, passwordData); },
  async createUserByAdmin(token, userData) { return mockCreateUserByAdmin(mockUsers, token, userData); },
  async getAllUsers(token) { return mockGetAllUsers(mockUsers, token); },
  async updateUserByAdmin(token, userId, userData) { return mockUpdateUserByAdmin(mockUsers, token, userId, userData); },
  async restoreAdmin(token) { return mockRestoreAdmin(mockUsers, token); },
  async deleteUser(token, userId) { return mockDeleteUser(mockUsers, token, userId); }
};

export default mockApi;
