import { mockLogin, mockRegister } from './mockAuth';
import {
  mockGetProfile,
  mockUpdateProfile,
  mockUpdatePassword,
  mockCreateUserByAdmin,
  mockGetAllUsers,
  mockGetUserDirectory,
  mockGetDirectoryUser,
  mockUpdateUserByAdmin,
  mockSetPasswordByAdmin,
  mockRestoreAdmin,
  mockDeleteUser
} from './mockUserApi';
import { mockSendReminder, mockGetMyReminders, mockMarkReminderRead, mockNotifyReminderResponse, mockGetReminderResponseNotifications, mockMarkReminderResponseNotificationRead } from './mockImeiReminders';
import { loadImeis, saveImeis } from '../utils/storage';

const mockUsers = [
  { id: 'admin-1', name: 'Ali Almani', email: 'admin@az-handy.berlin', password: 'Admin123!', role: 'Administrator', einsatz_ort: 'Zentrale', telefon: '+49 30 123456', createdAt: new Date().toISOString() },
  { id: 'buero-1', name: 'M. Somer', email: 'm.somer@az-handy.berlin', password: '!azHandy.berlin20260203?', role: 'Büro Mitarbeiter', einsatz_ort: 'Zentrale', telefon: null, createdAt: new Date().toISOString() },
  { id: 'user-1', name: 'Test Benutzer', email: 'test@example.com', password: 'test123', role: 'Marketing', einsatz_ort: 'Sonne', telefon: '0171 0000000', createdAt: new Date().toISOString() },
  { id: 'mitarbeiter-1', name: 'Mitarbeiter Shop', email: 'mitarbeiter@az-handy.berlin', password: 'Test123!', role: 'Mitarbeiter shop', einsatz_ort: 'KM127', telefon: null, createdAt: new Date().toISOString() }
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
  async getUserDirectory(token) { return mockGetUserDirectory(mockUsers, token); },
  async getDirectoryUser(token, userId) { return mockGetDirectoryUser(mockUsers, token, userId); },
  async updateUserByAdmin(token, userId, userData) { return mockUpdateUserByAdmin(mockUsers, token, userId, userData); },
  async setPasswordByAdmin(token, userId, newPassword) { return mockSetPasswordByAdmin(mockUsers, token, userId, newPassword); },
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
  async sendReminder(token, data) {
    return mockSendReminder(mockUsers, token, data);
  },
  async getMyReminders(token) {
    return mockGetMyReminders(token);
  },
  async markReminderRead(token, reminderId) {
    return mockMarkReminderRead(token, reminderId);
  },
  async notifyReminderResponse(token, data) {
    return mockNotifyReminderResponse(mockUsers, token, data);
  },
  async getReminderResponseNotifications(token) {
    return mockGetReminderResponseNotifications(mockUsers, token);
  },
  async markReminderResponseNotificationRead(token, id) {
    return mockMarkReminderResponseNotificationRead(token, id);
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
