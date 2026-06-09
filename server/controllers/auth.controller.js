import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User from '../models/User.js';
import { normalizeUserId, coerceUserId } from '../utils/normalizeUserId.js';

const generateToken = (userId, role, name) => {
  const secret = process.env.JWT_SECRET;
  if (secret == null || String(secret).trim() === '') {
    const err = new Error('JWT_SECRET ist in der Server-.env nicht gesetzt');
    err.statusCode = 500;
    throw err;
  }
  const uid = coerceUserId(userId);
  if (uid == null) {
    const err = new Error('Ungültige Benutzer-ID für Token');
    err.statusCode = 500;
    throw err;
  }
  const payload = { userId: uid };
  const r = role != null ? String(role).trim() : '';
  if (r) payload.role = r;
  const n = name != null ? String(name).trim() : '';
  if (n) payload.name = n;
  return jwt.sign(payload, secret, { expiresIn: '7d' });
};

export const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({ name, email: email.toLowerCase(), password });
    const token = generateToken(user.id, user.role, user.name);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    if (!email || typeof email !== 'string' || !password) {
      return res.status(400).json({ message: 'E-Mail und Passwort erforderlich' });
    }

    let user;
    try {
      user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    } catch (dbErr) {
      console.error('login User.findOne:', dbErr);
      return res.status(503).json({
        message: 'Anmeldung derzeit nicht möglich (Datenbank). Bitte später erneut versuchen oder Administrator informieren.'
      });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await user.comparePassword(password);
    } catch (pwErr) {
      console.error('login comparePassword:', pwErr);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const userId = user.id ?? user.get?.('id');
    const userEmail = (user.email || '').toLowerCase();
    let role = String(user.role ?? user.get?.('role') ?? '').trim();
    if (role === 'Adminstrator' || (userEmail === 'admin@az-handy.berlin' && !['admin', 'Administrator'].includes(role))) {
      role = 'Administrator';
    }

    const token = generateToken(userId, role, user.name ?? user.get?.('name'));

    const uidOut = userId ?? user._id ?? user.get?.('id');
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: normalizeUserId(uidOut) ?? uidOut,
        name: user.name ?? user.get?.('name'),
        email: user.email ?? user.get?.('email'),
        role,
        avatar: user.avatar ?? user.get?.('avatar') ?? null,
        einsatz_ort: user.einsatz_ort ?? user.get?.('einsatz_ort') ?? null,
        telefon: user.telefon ?? user.get?.('telefon') ?? null,
        tshirt_groesse: user.tshirt_groesse ?? user.get?.('tshirt_groesse') ?? null
      }
    });
  } catch (error) {
    console.error('login:', error?.message || error);
    next(error);
  }
};
