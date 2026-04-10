import fs from 'fs';
import path from 'path';
import User from '../models/User.js';
import { loadJson, saveJson, getDataDir } from '../utils/filePersistence.js';

const FORMULAR_CENTER_FILE = 'formular-center.json';
const UPLOAD_SUBDIR = 'formular-center';

async function isAdminUser(userId) {
  if (!userId) return false;
  try {
    const u = await User.findByPk(userId);
    if (!u) return false;
    const role = String(u.role ?? u.get?.('role') ?? u.dataValues?.role ?? '').trim();
    return role === 'Administrator' || role === 'admin' || role.toLowerCase().includes('admin');
  } catch {
    return false;
  }
}

export const getFormularCenterItems = async (req, res, next) => {
  try {
    const data = loadJson(FORMULAR_CENTER_FILE) || {};
    const raw = Array.isArray(data.items) ? data.items : [];
    /**
     * Download nur über /api/formular-center/download/:id — gleicher Pfad wie andere API-Routen.
     * Reine /uploads-Links scheitern oft in Production (nur /api zum Node proxied, sonst liefert das Frontend HTML/JSON).
     */
    const items = raw
      .filter((it) => it && it.id && it.fileName)
      .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0))
      .map((it) => ({
        id: it.id,
        originalName: it.originalName || it.fileName,
        uploadedAt: it.uploadedAt,
        uploadedByName: it.uploadedByName || '',
        url: `/api/formular-center/download/${encodeURIComponent(it.id)}`
      }));
    return res.json({ success: true, items });
  } catch (e) {
    next(e);
  }
};

/** Öffentlicher Download (gleiche wie Liste): korrekte Datei mit Content-Disposition vom API-Server */
export const downloadFormularCenterFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID fehlt' });
    }
    const data = loadJson(FORMULAR_CENTER_FILE) || {};
    const items = Array.isArray(data.items) ? data.items : [];
    const found = items.find((it) => it && String(it.id) === String(id));
    if (!found || !found.fileName) {
      return res.status(404).json({ success: false, message: 'Datei nicht gefunden' });
    }
    const filePath = path.join(getDataDir(), 'uploads', UPLOAD_SUBDIR, found.fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Datei nicht gefunden' });
    }
    const downloadName = found.originalName || found.fileName || 'dokument';
    return res.download(filePath, downloadName, (err) => {
      if (err && !res.headersSent) next(err);
    });
  } catch (e) {
    next(e);
  }
};

export const uploadFormularCenterPdf = async (req, res, next) => {
  try {
    if (!(await isAdminUser(req.user.userId))) {
      return res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Dateien im Formular Center hochladen'
      });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Keine Datei' });
    }
    const currentUser = await User.findByPk(req.user.userId);
    const uploaderName = (
      currentUser?.name ??
      currentUser?.get?.('name') ??
      currentUser?.dataValues?.name ??
      ''
    ).trim();
    const id = `fc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const entry = {
      id,
      originalName: req.file.originalname || req.file.filename,
      fileName: req.file.filename,
      uploadedAt: new Date().toISOString(),
      uploadedByUserId: req.user.userId,
      uploadedByName: uploaderName
    };
    const data = loadJson(FORMULAR_CENTER_FILE) || {};
    const items = Array.isArray(data.items) ? [...data.items] : [];
    items.unshift(entry);
    saveJson(FORMULAR_CENTER_FILE, { items });
    return res.json({
      success: true,
      item: {
        id: entry.id,
        originalName: entry.originalName,
        uploadedAt: entry.uploadedAt,
        uploadedByName: entry.uploadedByName,
        url: `/api/formular-center/download/${encodeURIComponent(entry.id)}`
      }
    });
  } catch (e) {
    next(e);
  }
};

export const deleteFormularCenterItem = async (req, res, next) => {
  try {
    if (!(await isAdminUser(req.user.userId))) {
      return res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Einträge löschen'
      });
    }
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID fehlt' });
    }
    const data = loadJson(FORMULAR_CENTER_FILE) || {};
    let items = Array.isArray(data.items) ? data.items : [];
    const found = items.find((it) => it && it.id === id);
    if (!found) {
      return res.status(404).json({ success: false, message: 'Eintrag nicht gefunden' });
    }
    items = items.filter((it) => it.id !== id);
    saveJson(FORMULAR_CENTER_FILE, { items });
    const filePath = path.join(getDataDir(), 'uploads', UPLOAD_SUBDIR, found.fileName);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (_) {}
    return res.json({ success: true });
  } catch (e) {
    next(e);
  }
};
