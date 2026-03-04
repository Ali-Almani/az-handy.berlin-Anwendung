import { mockLogin, mockRegister } from './mockAuth';
import { mockGetProfile, mockUpdateProfile, mockUpdatePassword, mockCreateUserByAdmin, mockGetAllUsers, mockUpdateUserByAdmin, mockRestoreAdmin, mockDeleteUser } from './mockUserApi';
import { loadImeis, saveImeis } from '../utils/storage';

const mockUsers = [
  { id: 'admin-1', name: 'Ali Almani', email: 'admin@az-handy.berlin', password: 'Admin123!', role: 'Administrator', createdAt: new Date().toISOString() },
  { id: 'user-1', name: 'Test Benutzer', email: 'test@example.com', password: 'test123', role: 'user', createdAt: new Date().toISOString() },
  { id: 'mitarbeiter-1', name: 'Mitarbeiter Shop', email: 'mitarbeiter@az-handy.berlin', password: 'Test123!', role: 'Mitarbeiter shop', createdAt: new Date().toISOString() }
];

export const mockGetAdminName = () => {
  const admin = mockUsers.find((u) => (u.email || '').toLowerCase() === 'admin@az-handy.berlin');
  return admin?.name || '';
};

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
  async deleteUser(token, userId) { return mockDeleteUser(mockUsers, token, userId); },
  async getImeisData() {
    const imeis = await loadImeis();
    return {
      data: {
        success: true,
        imeis,
        cellColors: JSON.parse(localStorage.getItem('imeis-cell-text-colors') || '{}'),
        rowActions: JSON.parse(localStorage.getItem('imeis-row-actions') || '{}'),
        copyHistory: JSON.parse(localStorage.getItem('imeis-copy-history') || '[]'),
        copyTimestamps: JSON.parse(localStorage.getItem('imeis-copy-timestamps') || '[]')
      }
    };
  },
  async saveImeisData(payload) {
    if (payload.imeis !== undefined) await saveImeis(payload.imeis);
    if (payload.removedImei !== undefined) {
      const imeis = await loadImeis();
      const imeiStr = String(payload.removedImei || '').trim();
      const filtered = imeis.filter((item) => String(item?.imei || '').trim() !== imeiStr);
      await saveImeis(filtered);
    }
    if (payload.cellColors !== undefined) localStorage.setItem('imeis-cell-text-colors', JSON.stringify(payload.cellColors));
    if (payload.rowActions !== undefined) localStorage.setItem('imeis-row-actions', JSON.stringify(payload.rowActions));
    if (payload.copyHistory !== undefined) localStorage.setItem('imeis-copy-history', JSON.stringify(payload.copyHistory));
    if (payload.copyTimestamps !== undefined) localStorage.setItem('imeis-copy-timestamps', JSON.stringify(payload.copyTimestamps));
    return { data: { success: true } };
  },
  async updateHistoryAction({ imei, userName, newAction }) {
    const imeiStr = String(imei || '').trim();
    const copyHistory = JSON.parse(localStorage.getItem('imeis-copy-history') || '[]');
    const updated = copyHistory.filter(
      (e) => !(e && String(e.imei || '').trim() === imeiStr && String(e.userName || '').trim() === String(userName).trim())
    );
    localStorage.setItem('imeis-copy-history', JSON.stringify(updated));
    if (newAction === 'abgelehnt') {
      const rowActions = JSON.parse(localStorage.getItem('imeis-row-actions') || '{}');
      Object.keys(rowActions).forEach((rowId) => {
        if (rowId.includes(`-${imeiStr}-`)) delete rowActions[rowId];
      });
      localStorage.setItem('imeis-row-actions', JSON.stringify(rowActions));
    }
    if (newAction === 'angenommen') {
      const imeis = await loadImeis();
      const filtered = imeis.filter((item) => String(item?.imei || '').trim() !== imeiStr);
      await saveImeis(filtered);
    }
    return { data: { success: true } };
  }
};

export default mockApi;
