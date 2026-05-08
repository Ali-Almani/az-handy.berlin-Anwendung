const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

const parseToken = (token) => {
  if (!token) return null;
  const parts = token.split('-');
  return parts.length >= 3 ? parts.slice(2, -1).join('-') : null;
};

const authError = (msg = 'Nicht autorisiert') => ({ response: { status: 401, data: { message: msg } } });
const notFoundError = (msg = 'Benutzer nicht gefunden') => ({ response: { status: 404, data: { message: msg } } });
const forbiddenError = (msg) => ({ response: { status: 403, data: { message: msg } } });
const badRequestError = (msg) => ({ response: { status: 400, data: { message: msg } } });

const ALLOWED_TSHIRT = new Set(['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL']);
const isMitarbeiterShopRole = (role) => String(role || '').replace(/\u00a0/g, ' ').trim() === 'Mitarbeiter shop';

export const mockGetProfile = async (mockUsers, token) => {
  await delay(500);
  const userId = parseToken(token);
  if (!userId) throw authError('Ungültiger Token');
  const user = mockUsers.find(u => u.id === userId);
  if (!user) throw notFoundError();
  const storedAvatar = typeof localStorage !== 'undefined' ? localStorage.getItem(`mock-avatar-${userId}`) : null;
  const avatar = user.avatar || storedAvatar || null;
  return {
    data: {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar,
        einsatz_ort: user.einsatz_ort || null,
        telefon: user.telefon || null,
        tshirt_groesse: user.tshirt_groesse ?? null,
        createdAt: user.createdAt
      }
    }
  };
};

export const mockUpdateProfile = async (mockUsers, token, updates) => {
  await delay(800);
  const userId = parseToken(token);
  if (!userId) throw authError();
  const userIndex = mockUsers.findIndex(u => u.id === userId);
  if (userIndex === -1) throw notFoundError();
  if (updates.name) mockUsers[userIndex].name = updates.name;
  if (updates.email) {
    if (mockUsers.some(u => u.email === updates.email && u.id !== userId)) throw badRequestError('E-Mail wird bereits verwendet');
    mockUsers[userIndex].email = updates.email;
  }
  if (updates.avatar !== undefined) {
    mockUsers[userIndex].avatar = updates.avatar || null;
    try {
      if (updates.avatar) {
        localStorage.setItem(`mock-avatar-${userId}`, updates.avatar);
      } else {
        localStorage.removeItem(`mock-avatar-${userId}`);
      }
    } catch (_) {}
  }
  if (updates.einsatz_ort !== undefined) {
    const allowed = new Set(['Zentrale', 'Sonne', 'KM127', 'KM169', 'KM50', 'Turm', 'Bad', 'Haupt']);
    const v = updates.einsatz_ort === null || updates.einsatz_ort === '' ? null : String(updates.einsatz_ort).trim();
    if (v && !allowed.has(v)) throw badRequestError('Ungültiger Einsatzort');
    mockUsers[userIndex].einsatz_ort = v;
  }
  if (updates.telefon !== undefined) {
    const t = updates.telefon === null || updates.telefon === '' ? null : String(updates.telefon).trim().slice(0, 40);
    mockUsers[userIndex].telefon = t || null;
  }
  if (updates.tshirt_groesse !== undefined) {
    const me = mockUsers[userIndex];
    if (!isMitarbeiterShopRole(me.role)) throw forbiddenError('Uniform-Größe ist nur für die Rolle „Mitarbeiter shop“.');
    const tv = updates.tshirt_groesse === null || updates.tshirt_groesse === '' ? null : String(updates.tshirt_groesse).trim();
    if (tv && !ALLOWED_TSHIRT.has(tv)) throw badRequestError('Ungültige Uniform-Größe');
    mockUsers[userIndex].tshirt_groesse = tv || null;
  }
  const u = mockUsers[userIndex];
  const storedAvatar = typeof localStorage !== 'undefined' ? localStorage.getItem(`mock-avatar-${userId}`) : null;
  const avatar = u.avatar || storedAvatar || null;
  return {
    data: {
      success: true,
      message: 'Profil erfolgreich aktualisiert',
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        avatar,
        einsatz_ort: u.einsatz_ort || null,
        telefon: u.telefon || null,
        tshirt_groesse: u.tshirt_groesse ?? null
      }
    }
  };
};

export const mockUpdatePassword = async (mockUsers, token, passwordData) => {
  await delay(800);
  const userId = parseToken(token);
  if (!userId) throw authError();
  const userIndex = mockUsers.findIndex(u => u.id === userId);
  if (userIndex === -1) throw notFoundError();
  const current = mockUsers[userIndex].password;
  if (passwordData.currentPassword !== current && passwordData.currentPassword !== 'Admin123!' && passwordData.currentPassword !== 'test123') {
    throw badRequestError('Aktuelles Passwort ist falsch');
  }
  mockUsers[userIndex].password = passwordData.newPassword;
  return { data: { success: true, message: 'Passwort erfolgreich geändert' } };
};

export const mockCreateUserByAdmin = async (mockUsers, token, userData) => {
  await delay(800);
  const adminId = parseToken(token);
  if (!adminId) throw authError();
  const adminUser = mockUsers.find(u => u.id === adminId);
  if (!adminUser || !['Administrator', 'admin'].includes(adminUser.role)) throw forbiddenError('Nur Administratoren können Benutzer erstellen');
  if (mockUsers.find(u => u.email === userData.email)) throw badRequestError('E-Mail wird bereits verwendet');
  const newUser = { id: `user-${Date.now()}`, name: userData.name, email: userData.email, password: userData.password, role: userData.role || 'Marketing Mitarbeiter', avatar: userData.avatar || null, einsatz_ort: userData.einsatz_ort || null, telefon: userData.telefon ? String(userData.telefon).trim().slice(0, 40) || null : null, createdAt: new Date().toISOString() };
  mockUsers.push(newUser);
  return { data: { success: true, message: 'Benutzer erfolgreich erstellt', user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, avatar: newUser.avatar || null, einsatz_ort: newUser.einsatz_ort || null, telefon: newUser.telefon || null } } };
};

export const mockGetAllUsers = async (mockUsers, token) => {
  await delay(500);
  const adminId = parseToken(token);
  if (!adminId) throw authError();
  const adminUser = mockUsers.find(u => u.id === adminId);
  if (!adminUser || !['Administrator', 'admin'].includes(adminUser.role)) throw forbiddenError('Nur Administratoren können alle Benutzer sehen');
  const users = mockUsers.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, avatar: u.avatar || null, einsatz_ort: u.einsatz_ort || null, telefon: u.telefon || null, createdAt: u.createdAt }));
  return { data: { success: true, users } };
};

export const mockSetPasswordByAdmin = async (mockUsers, token, userId, newPassword) => {
  await delay(500);
  const adminId = parseToken(token);
  if (!adminId) throw authError();
  const adminUser = mockUsers.find(u => u.id === adminId);
  if (!adminUser || !['Administrator', 'admin'].includes(adminUser.role)) throw forbiddenError('Nur Administratoren können Passwörter setzen');
  const userIndex = mockUsers.findIndex(u => u.id === userId);
  if (userIndex === -1) throw notFoundError();
  if (!newPassword || newPassword.length < 6) throw badRequestError('Neues Passwort muss mindestens 6 Zeichen haben');
  mockUsers[userIndex].password = newPassword;
  return { data: { success: true, message: 'Passwort erfolgreich gesetzt' } };
};

export const mockRestoreAdmin = async (mockUsers, token) => {
  await delay(500);
  const userId = parseToken(token);
  if (!userId) throw authError();
  const user = mockUsers.find(u => u.id === userId);
  if (!user) throw notFoundError();
  if (user.email?.toLowerCase() !== 'admin@az-handy.berlin') throw forbiddenError('Nur für admin@az-handy.berlin');
  user.role = 'Administrator';
  return { data: { success: true, message: 'Admin-Rolle wiederhergestellt', user: { id: user.id, name: user.name, email: user.email, role: user.role } } };
};

export const mockUpdateUserByAdmin = async (mockUsers, token, userId, updates) => {
  await delay(500);
  const adminId = parseToken(token);
  if (!adminId) throw authError();
  const adminUser = mockUsers.find(u => u.id === adminId);
  if (!adminUser || !['Administrator', 'admin'].includes(adminUser.role)) throw forbiddenError('Nur Administratoren können Benutzer bearbeiten');
  const userIndex = mockUsers.findIndex(u => u.id === userId);
  if (userIndex === -1) throw notFoundError();
  const targetUser = mockUsers[userIndex];
  if (targetUser.email?.toLowerCase() === 'admin@az-handy.berlin' && updates.role && !['Administrator', 'admin'].includes(updates.role)) {
    throw badRequestError('Die Rolle von admin@az-handy.berlin kann nicht geändert werden');
  }
  if (updates.role) mockUsers[userIndex].role = updates.role;
  if (updates.name) mockUsers[userIndex].name = updates.name;
  if (updates.einsatz_ort !== undefined) mockUsers[userIndex].einsatz_ort = updates.einsatz_ort || null;
  if (updates.telefon !== undefined) {
    mockUsers[userIndex].telefon = updates.telefon === null || updates.telefon === '' ? null : String(updates.telefon).trim().slice(0, 40) || null;
  }
  if (updates.email) {
    if (mockUsers.some(u => u.email === updates.email && u.id !== userId)) throw badRequestError('E-Mail wird bereits verwendet');
    mockUsers[userIndex].email = updates.email;
  }
  const u = mockUsers[userIndex];
  return { data: { success: true, message: 'Benutzer erfolgreich aktualisiert', user: { id: u.id, name: u.name, email: u.email, role: u.role, telefon: u.telefon || null, einsatz_ort: u.einsatz_ort || null } } };
};

export const mockDeleteUser = async (mockUsers, token, userId) => {
  await delay(500);
  const adminId = parseToken(token);
  if (!adminId) throw authError();
  const adminUser = mockUsers.find(u => u.id === adminId);
  if (!adminUser || !['Administrator', 'admin'].includes(adminUser.role)) throw forbiddenError('Nur Administratoren können Benutzer löschen');
  if (adminId === userId) throw badRequestError('Sie können sich nicht selbst löschen');
  const userIndex = mockUsers.findIndex(u => u.id === userId);
  if (userIndex === -1) throw notFoundError();
  mockUsers.splice(userIndex, 1);
  return { data: { success: true, message: 'Benutzer erfolgreich gelöscht' } };
};

export const mockGetUserDirectory = async (mockUsers, token) => {
  await delay(400);
  const userId = parseToken(token);
  if (!userId) throw authError();
  const users = mockUsers
    .filter((u) => {
      if (String(u.name || '').trim().toLowerCase() === 'ali test') return false;
      const r = String(u.role || '').trim();
      if (r === 'Partner' || r.toLowerCase() === 'partner') return false;
      if (!String(u.einsatz_ort || '').trim()) return false;
      return true;
    })
    .map((u) => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar || null,
      einsatz_ort: u.einsatz_ort || null,
      telefon: u.telefon || null
    }));
  return { data: { success: true, users } };
};

export const mockGetMitarbeiterShopTshirtGroessen = async (mockUsers, token) => {
  await delay(400);
  const userId = parseToken(token);
  if (!userId) throw authError();
  const me = mockUsers.find((u) => u.id === userId);
  if (!me || String(me.role || '').replace(/\u00a0/g, ' ').trim() !== 'Marketing') {
    throw forbiddenError('Nur für die Rolle Marketing');
  }
  const users = mockUsers
    .filter((u) => String(u.role || '').replace(/\u00a0/g, ' ').trim() === 'Mitarbeiter shop')
    .map((u) => ({
      id: u.id,
      name: u.name,
      einsatz_ort: u.einsatz_ort || null,
      tshirt_groesse: u.tshirt_groesse ?? null
    }))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));
  return { data: { success: true, users } };
};

export const mockGetDirectoryUser = async (mockUsers, token, id) => {
  await delay(300);
  const userId = parseToken(token);
  if (!userId) throw authError();
  const u = mockUsers.find((x) => String(x.id) === String(id));
  if (!u) throw notFoundError();
  return {
    data: {
      success: true,
      user: {
        id: u.id,
        name: u.name,
        avatar: u.avatar || null,
        einsatz_ort: u.einsatz_ort || null,
        telefon: u.telefon || null
      }
    }
  };
};
