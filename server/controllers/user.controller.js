import User from '../models/User.js';

const isAdmin = (user) => user && (user.role === 'admin' || user.role === 'Administrator');

export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const userEmail = (user.email || '').toLowerCase();
    let role = (user.role || '').trim();
    if (role === 'Adminstrator' || (userEmail === 'admin@az-handy.berlin' && !['admin', 'Administrator'].includes(role))) {
      role = 'Administrator';
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role,
        avatar: user.avatar || null,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, email, avatar } = req.body;
    const user = await User.findByPk(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userRole = (user.role || '').trim().toLowerCase();
    const isAdminUser = userRole === 'admin' || userRole === 'administrator';

    if (name) user.name = name;
    if (email && isAdminUser) {
      const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
      if (existingUser && existingUser.id !== user.id) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email.toLowerCase().trim();
    }
    if (avatar !== undefined) user.avatar = avatar || null;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || null
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const currentUser = await User.findByPk(req.user.userId);
    if (!currentUser || !isAdmin(currentUser)) {
      return res.status(403).json({ message: 'Nur Administratoren können Benutzer verwalten' });
    }
    const users = User.findAll ? await User.findAll() : (User.find ? await User.find() : []);
    const list = Array.isArray(users) ? users : (users.rows || []);
    res.json({
      success: true,
      users: list.map((u) => {
        const uu = u.toJSON ? u.toJSON() : u;
        const { password, ...rest } = uu;
        const createdAt = rest.createdAt ?? rest.created_at;
        return { ...rest, createdAt: createdAt ?? null };
      })
    });
  } catch (error) {
    next(error);
  }
};

export const createUserByAdmin = async (req, res, next) => {
  try {
    const currentUser = await User.findByPk(req.user.userId);
    if (!currentUser || !isAdmin(currentUser)) {
      return res.status(403).json({ message: 'Nur Administratoren können Benutzer erstellen' });
    }
    const { name, email, password, role, avatar } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, E-Mail und Passwort sind erforderlich' });
    }
    const existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(400).json({ message: 'E-Mail wird bereits verwendet' });
    }
    const user = await User.create({ name, email: email.toLowerCase(), password, role: role || 'Marketing', avatar: avatar || null });
    const createdAt = user.createdAt ?? user.created_at ?? new Date();
    res.status(201).json({
      success: true,
      message: 'Benutzer erfolgreich erstellt',
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar || null, createdAt }
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserByAdmin = async (req, res, next) => {
  try {
    const currentUser = await User.findByPk(req.user.userId);
    if (!currentUser || !isAdmin(currentUser)) {
      return res.status(403).json({ message: 'Nur Administratoren können Benutzer bearbeiten' });
    }
    const { id } = req.params;
    const { role, name, email, avatar } = req.body;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }
    const userEmail = (user.email || '').toLowerCase();
    if (userEmail === 'admin@az-handy.berlin') {
      if (role && !['admin', 'Administrator'].includes(role)) {
        return res.status(400).json({ message: 'Die Rolle von admin@az-handy.berlin kann nicht geändert werden' });
      }
      if (email && email.toLowerCase().trim() !== userEmail) {
        return res.status(400).json({ message: 'Die E-Mail von admin@az-handy.berlin kann nicht geändert werden' });
      }
    }
    if (role) user.role = role;
    if (name) user.name = name;
    if (email) {
      const existing = await User.findOne({ where: { email: email.toLowerCase() } });
      if (existing && String(existing.id) !== String(id)) {
        return res.status(400).json({ message: 'E-Mail wird bereits verwendet' });
      }
      user.email = email.toLowerCase().trim();
    }
    if (avatar !== undefined) user.avatar = avatar || null;
    await user.save();
    res.json({
      success: true,
      message: 'Benutzer erfolgreich aktualisiert',
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar || null }
    });
  } catch (error) {
    next(error);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      return res.status(400).json({ message: 'Aktuelles Passwort ist falsch' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Neues Passwort muss mindestens 6 Zeichen haben' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Passwort erfolgreich geändert' });
  } catch (error) {
    next(error);
  }
};

export const restoreAdmin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }
    const email = (user.email || '').toLowerCase();
    if (email !== 'admin@az-handy.berlin') {
      return res.status(403).json({ message: 'Nur für admin@az-handy.berlin' });
    }
    user.role = 'admin';
    await user.save();
    res.json({
      success: true,
      message: 'Admin-Rolle wiederhergestellt',
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar || null }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUserById = async (req, res, next) => {
  try {
    const currentUser = await User.findByPk(req.user.userId);
    if (!currentUser || !isAdmin(currentUser)) {
      return res.status(403).json({ message: 'Nur Administratoren können Benutzer löschen' });
    }
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }
    if (String(user.id) === String(currentUser.id)) {
      return res.status(400).json({ message: 'Sie können sich nicht selbst löschen' });
    }
    await User.destroy({ where: { id } });
    res.json({ success: true, message: 'Benutzer erfolgreich gelöscht' });
  } catch (error) {
    next(error);
  }
};
