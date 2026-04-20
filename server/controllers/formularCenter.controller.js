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

function sortSections(sections) {
  return [...(sections || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

function ensureDefaultSections(sections, titles) {
  const list = Array.isArray(sections) ? [...sections] : [];
  const wanted = (titles || []).map((t) => String(t || '').trim()).filter(Boolean);
  if (wanted.length === 0) return { sections: list, changed: false };

  const hasTitle = (title) =>
    list.some((s) => String(s?.title ?? '').trim().toLowerCase() === String(title).trim().toLowerCase());

  let changed = false;
  let nextOrder = -1;

  for (const title of wanted) {
    if (hasTitle(title)) continue;
    list.push({
      id: `sec-default-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      title,
      sortOrder: nextOrder++,
      items: []
    });
    changed = true;
  }

  if (!changed) return { sections: list, changed: false };
  return { sections: sortSections(list).map((s, i) => ({ ...s, sortOrder: i })), changed: true };
}

/** Legacy { items: [] } → { sections: [{ title, items }] } */
function normalizeFormularPayload(raw) {
  if (!raw || typeof raw !== 'object') return { sections: [], migrated: false };
  const hasSections = Array.isArray(raw.sections) && raw.sections.length > 0;
  const legacyItems = Array.isArray(raw.items) ? raw.items.filter((it) => it && it.id && it.fileName) : [];

  if (hasSections) {
    const sections = raw.sections.map((s, i) => ({
      id: String(s.id || `sec-${i}`),
      title: String(s.title || 'Bereich').trim() || 'Bereich',
      sortOrder: Number.isFinite(Number(s.sortOrder)) ? Number(s.sortOrder) : i,
      items: Array.isArray(s.items) ? s.items.filter((it) => it && it.id && it.fileName) : []
    }));
    return { sections: sortSections(sections), migrated: false };
  }

  if (legacyItems.length > 0) {
    return {
      sections: [
        {
          id: `sec-migrated-${Date.now()}`,
          title: 'Formulare',
          sortOrder: 0,
          items: legacyItems
        }
      ],
      migrated: true
    };
  }

  return { sections: [], migrated: false };
}

function loadFormularStore() {
  const raw = loadJson(FORMULAR_CENTER_FILE);
  const { sections, migrated } = normalizeFormularPayload(raw);
  const { sections: withDefaults, changed } = ensureDefaultSections(sections, ['Provision']);
  if (migrated || changed) {
    saveJson(FORMULAR_CENTER_FILE, { sections: withDefaults });
  }
  return { sections: withDefaults };
}

function saveFormularStore(sections) {
  saveJson(FORMULAR_CENTER_FILE, { sections });
}

function findItemLocation(sections, itemId) {
  const sid = String(itemId);
  for (let si = 0; si < sections.length; si++) {
    const items = sections[si].items || [];
    const ii = items.findIndex((it) => it && String(it.id) === sid);
    if (ii !== -1) return { sectionIndex: si, itemIndex: ii, section: sections[si], item: items[ii] };
  }
  return null;
}

function mapItemToResponse(it) {
  return {
    id: it.id,
    originalName: it.originalName || it.fileName,
    uploadedAt: it.uploadedAt,
    uploadedByName: it.uploadedByName || '',
    url: `/api/formular-center/download/${encodeURIComponent(it.id)}`
  };
}

export const getFormularCenterItems = async (req, res, next) => {
  try {
    const { sections } = loadFormularStore();
    const out = sortSections(sections).map((s) => ({
      id: s.id,
      title: s.title,
      sortOrder: s.sortOrder ?? 0,
      items: (s.items || []).map(mapItemToResponse)
    }));
    return res.json({ success: true, sections: out });
  } catch (e) {
    next(e);
  }
};

export const downloadFormularCenterFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID fehlt' });
    }
    const { sections } = loadFormularStore();
    const loc = findItemLocation(sections, id);
    if (!loc || !loc.item?.fileName) {
      return res.status(404).json({ success: false, message: 'Datei nicht gefunden' });
    }
    const found = loc.item;
    const filePath = path.join(getDataDir(), 'uploads', UPLOAD_SUBDIR, found.fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Datei nicht gefunden' });
    }
    const downloadName = found.originalName || found.fileName || 'dokument';
    const ext = path.extname(filePath).toLowerCase();
    const mimeByExt = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel'
    };
    if (mimeByExt[ext]) res.type(mimeByExt[ext]);
    return res.download(filePath, downloadName, (err) => {
      if (err && !res.headersSent) next(err);
    });
  } catch (e) {
    next(e);
  }
};

/** Administrator: neuen Bereich (Titel) anlegen */
export const createFormularSection = async (req, res, next) => {
  try {
    if (!(await isAdminUser(req.user.userId))) {
      return res.status(403).json({ success: false, message: 'Nur Administratoren' });
    }
    const title = String(req.body?.title ?? '').trim();
    if (!title || title.length > 200) {
      return res.status(400).json({ success: false, message: 'Titel erforderlich (max. 200 Zeichen)' });
    }
    const { sections } = loadFormularStore();
    const sorted = sortSections(sections);
    const maxOrder = sorted.reduce((m, s) => Math.max(m, s.sortOrder ?? 0), -1);
    const section = {
      id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      title,
      sortOrder: maxOrder + 1,
      items: []
    };
    sorted.push(section);
    saveFormularStore(sorted);
    return res.json({
      success: true,
      section: { id: section.id, title: section.title, sortOrder: section.sortOrder, items: [] }
    });
  } catch (e) {
    next(e);
  }
};

/** Administrator: Bereichstitel ändern */
export const patchFormularSection = async (req, res, next) => {
  try {
    if (!(await isAdminUser(req.user.userId))) {
      return res.status(403).json({ success: false, message: 'Nur Administratoren' });
    }
    const { sectionId } = req.params;
    const title = String(req.body?.title ?? '').trim();
    if (!title || title.length > 200) {
      return res.status(400).json({ success: false, message: 'Titel erforderlich (max. 200 Zeichen)' });
    }
    const { sections } = loadFormularStore();
    const s = sections.find((x) => x && String(x.id) === String(sectionId));
    if (!s) {
      return res.status(404).json({ success: false, message: 'Bereich nicht gefunden' });
    }
    s.title = title;
    saveFormularStore(sections);
    return res.json({
      success: true,
      section: { id: s.id, title: s.title, sortOrder: s.sortOrder ?? 0, items: (s.items || []).map(mapItemToResponse) }
    });
  } catch (e) {
    next(e);
  }
};

/** Administrator: Bereich löschen inkl. Dateien */
export const deleteFormularSection = async (req, res, next) => {
  try {
    if (!(await isAdminUser(req.user.userId))) {
      return res.status(403).json({ success: false, message: 'Nur Administratoren' });
    }
    const { sectionId } = req.params;
    const { sections } = loadFormularStore();
    const s = sections.find((x) => x && String(x.id) === String(sectionId));
    if (!s) {
      return res.status(404).json({ success: false, message: 'Bereich nicht gefunden' });
    }
    for (const it of s.items || []) {
      const fp = path.join(getDataDir(), 'uploads', UPLOAD_SUBDIR, it.fileName);
      try {
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      } catch (_) {}
    }
    const nextSections = sections.filter((x) => String(x.id) !== String(sectionId));
    const sorted = sortSections(nextSections);
    sorted.forEach((sec, i) => {
      sec.sortOrder = i;
    });
    saveFormularStore(sorted);
    return res.json({ success: true });
  } catch (e) {
    next(e);
  }
};

/** Administrator: Bereich nach oben/unten */
export const moveFormularSection = async (req, res, next) => {
  try {
    if (!(await isAdminUser(req.user.userId))) {
      return res.status(403).json({ success: false, message: 'Nur Administratoren' });
    }
    const { sectionId } = req.params;
    const direction = String(req.body?.direction || '').toLowerCase();
    if (direction !== 'up' && direction !== 'down') {
      return res.status(400).json({ success: false, message: 'direction: up oder down' });
    }
    const { sections } = loadFormularStore();
    const sorted = sortSections(sections);
    const idx = sorted.findIndex((s) => String(s.id) === String(sectionId));
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Bereich nicht gefunden' });
    }
    const j = direction === 'up' ? idx - 1 : idx + 1;
    if (j < 0 || j >= sorted.length) {
      return res.json({ success: true, sections: sorted.map((s) => ({ id: s.id, title: s.title, sortOrder: s.sortOrder, items: (s.items || []).map(mapItemToResponse) })) });
    }
    [sorted[idx], sorted[j]] = [sorted[j], sorted[idx]];
    sorted.forEach((s, i) => {
      s.sortOrder = i;
    });
    saveFormularStore(sorted);
    const out = sorted.map((s) => ({
      id: s.id,
      title: s.title,
      sortOrder: s.sortOrder,
      items: (s.items || []).map(mapItemToResponse)
    }));
    return res.json({ success: true, sections: out });
  } catch (e) {
    next(e);
  }
};

/** Administrator: Datei innerhalb des Bereichs nach oben/unten */
export const moveFormularItem = async (req, res, next) => {
  try {
    if (!(await isAdminUser(req.user.userId))) {
      return res.status(403).json({ success: false, message: 'Nur Administratoren' });
    }
    const { itemId } = req.params;
    const direction = String(req.body?.direction || '').toLowerCase();
    if (direction !== 'up' && direction !== 'down') {
      return res.status(400).json({ success: false, message: 'direction: up oder down' });
    }
    const { sections } = loadFormularStore();
    const loc = findItemLocation(sections, itemId);
    if (!loc) {
      return res.status(404).json({ success: false, message: 'Datei nicht gefunden' });
    }
    const items = [...(loc.section.items || [])];
    const idx = loc.itemIndex;
    const j = direction === 'up' ? idx - 1 : idx + 1;
    if (j < 0 || j >= items.length) {
      return res.json({ success: true });
    }
    [items[idx], items[j]] = [items[j], items[idx]];
    loc.section.items = items;
    saveFormularStore(sections);
    return res.json({ success: true });
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
    const sectionId = String(req.body?.sectionId ?? '').trim();
    if (!sectionId) {
      try {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      } catch (_) {}
      return res.status(400).json({ success: false, message: 'Bereich (sectionId) erforderlich' });
    }
    const { sections } = loadFormularStore();
    const sec = sections.find((s) => s && String(s.id) === String(sectionId));
    if (!sec) {
      try {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      } catch (_) {}
      return res.status(404).json({ success: false, message: 'Bereich nicht gefunden' });
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
    if (!Array.isArray(sec.items)) sec.items = [];
    sec.items.unshift(entry);
    saveFormularStore(sections);
    return res.json({
      success: true,
      item: {
        id: entry.id,
        originalName: entry.originalName,
        uploadedAt: entry.uploadedAt,
        uploadedByName: entry.uploadedByName,
        url: `/api/formular-center/download/${encodeURIComponent(entry.id)}`,
        sectionId: sec.id
      }
    });
  } catch (e) {
    next(e);
  }
};

export const patchFormularCenterItem = async (req, res, next) => {
  try {
    if (!(await isAdminUser(req.user.userId))) {
      return res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Einträge bearbeiten'
      });
    }
    const id = req.params?.itemId ?? req.params?.id;
    const { originalName } = req.body || {};
    const name = String(originalName ?? '').trim();
    if (!name || name.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Anzeigename erforderlich (1–500 Zeichen)'
      });
    }
    const { sections } = loadFormularStore();
    const loc = findItemLocation(sections, id);
    if (!loc) {
      return res.status(404).json({ success: false, message: 'Eintrag nicht gefunden' });
    }
    loc.item.originalName = name;
    saveFormularStore(sections);
    const found = loc.item;
    return res.json({
      success: true,
      item: {
        id: found.id,
        originalName: found.originalName,
        uploadedAt: found.uploadedAt,
        uploadedByName: found.uploadedByName || '',
        url: `/api/formular-center/download/${encodeURIComponent(found.id)}`
      }
    });
  } catch (e) {
    next(e);
  }
};

export const replaceFormularCenterFile = async (req, res, next) => {
  try {
    if (!(await isAdminUser(req.user.userId))) {
      return res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Dateien ersetzen'
      });
    }
    const id = req.params?.itemId ?? req.params?.id;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Keine Datei' });
    }
    const { sections } = loadFormularStore();
    const loc = findItemLocation(sections, id);
    if (!loc) {
      try {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      } catch (_) {}
      return res.status(404).json({ success: false, message: 'Eintrag nicht gefunden' });
    }
    const found = loc.item;
    const oldPath = path.join(getDataDir(), 'uploads', UPLOAD_SUBDIR, found.fileName);
    try {
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    } catch (_) {}
    const currentUser = await User.findByPk(req.user.userId);
    const uploaderName = (
      currentUser?.name ??
      currentUser?.get?.('name') ??
      currentUser?.dataValues?.name ??
      ''
    ).trim();
    found.fileName = req.file.filename;
    found.originalName = req.file.originalname || req.file.filename;
    found.uploadedAt = new Date().toISOString();
    found.uploadedByUserId = req.user.userId;
    found.uploadedByName = uploaderName;
    saveFormularStore(sections);
    return res.json({
      success: true,
      item: {
        id: found.id,
        originalName: found.originalName,
        uploadedAt: found.uploadedAt,
        uploadedByName: found.uploadedByName,
        url: `/api/formular-center/download/${encodeURIComponent(found.id)}`
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
    const id = req.params?.itemId ?? req.params?.id;
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID fehlt' });
    }
    const { sections } = loadFormularStore();
    const loc = findItemLocation(sections, id);
    if (!loc) {
      return res.status(404).json({ success: false, message: 'Eintrag nicht gefunden' });
    }
    const found = loc.item;
    loc.section.items = (loc.section.items || []).filter((it) => String(it.id) !== String(id));
    saveFormularStore(sections);
    const filePath = path.join(getDataDir(), 'uploads', UPLOAD_SUBDIR, found.fileName);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (_) {}
    return res.json({ success: true });
  } catch (e) {
    next(e);
  }
};
