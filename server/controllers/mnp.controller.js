import User from '../models/User.js';
import { readJsonStore, updateJsonStore } from '../utils/jsonClusterStore.js';
import { normalizeUserId } from '../utils/normalizeUserId.js';
import { FILIALE_OPTIONS, isValidFiliale, normalizeFiliale } from '../constants/einsatzorte.js';

const MNP_FILE = 'mnp-tracker.json';
const MNP_DEFAULT = () => ({ entries: [] });

const ROLE_LABELS = new Set([
  'admin',
  'Administrator',
  'Büro Mitarbeiter',
  'Marketing',
  'Callcenter',
  'Shops',
  'Buchhaltung',
  'Einkauf',
  'Partner',
  'Teamleiter shop',
  'Mitarbeiter shop',
  'Mitarbeiter'
]);

function isRoleLabel(value) {
  const v = String(value ?? '').trim();
  if (!v) return false;
  if (ROLE_LABELS.has(v)) return true;
  return /^mitarbeiter(\s|$)/i.test(v) && !v.includes('@');
}

function readUserName(user) {
  if (!user) return '';
  return String(user.name ?? user.get?.('name') ?? user.dataValues?.name ?? '').trim();
}

async function resolveUserDisplayName(userId, fallback = '') {
  const safeFallback = isRoleLabel(fallback) ? '' : String(fallback ?? '').trim();
  if (!userId) return safeFallback;

  try {
    const id = normalizeUserId(userId) ?? userId;
    const u = await User.findByPk(id);
    const name = readUserName(u);
    if (name && !isRoleLabel(name)) return name;
  } catch {
    // Fallback unten
  }

  return safeFallback;
}

async function enrichEditor(editor) {
  if (!editor || typeof editor !== 'object') return editor;
  const name = await resolveUserDisplayName(
    editor.userId,
    editor.name || editor.userName || ''
  );
  if (!name) return editor;
  return { ...editor, name, userName: name };
}

async function enrichEntryForClient(entry) {
  const { editHistory, ...rest } = entry;
  const createdBy = await enrichEditor(entry.createdBy);
  const lastEditedBy = await enrichEditor(entry.lastEditedBy);
  const mitarbeiterName =
    String(entry.mitarbeiter ?? '').trim() ||
    createdBy?.name ||
    createdBy?.userName ||
    (await resolveUserDisplayName(entry.createdBy?.userId, entry.createdBy?.userName || ''));
  return {
    ...rest,
    createdBy,
    lastEditedBy,
    mitarbeiterName,
    historyCount: Array.isArray(editHistory) ? editHistory.length : 0
  };
}

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

async function requireAdmin(req, res) {
  const ok = await isAdminUser(req.user?.userId ?? req.user?.id);
  if (!ok) {
    res.status(403).json({ success: false, message: 'Nur für Administratoren.' });
    return false;
  }
  return true;
}

function newId(prefix = 'mnp') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function loadStore() {
  const raw = readJsonStore(MNP_FILE, MNP_DEFAULT());
  return {
    entries: Array.isArray(raw?.entries) ? raw.entries : []
  };
}

async function mutateStore(updater) {
  return updateJsonStore(MNP_FILE, MNP_DEFAULT(), (state) => {
    if (!Array.isArray(state.entries)) state.entries = [];
    return updater(state);
  });
}

function trim(value) {
  return String(value ?? '').trim();
}

function normalizeEntryBody(body = {}) {
  const filialeRaw = trim(body.filiale);
  if (filialeRaw && !isValidFiliale(filialeRaw)) {
    return { error: 'Ungültige Filiale.' };
  }
  const filiale = normalizeFiliale(filialeRaw);

  return {
    filiale,
    mitarbeiter: trim(body.mitarbeiter),
    neuesVertragsdatum: trim(body.neuesVertragsdatum),
    neueO2Rufnummer: trim(body.neueO2Rufnummer),
    eposKn: trim(body.eposKn),
    iban: trim(body.iban),
    letzten7SimKarte: trim(body.letzten7SimKarte),
    kundenVorname: trim(body.kundenVorname),
    kundenNachname: trim(body.kundenNachname),
    kundenGeburtsdatum: trim(body.kundenGeburtsdatum),
    kundenAktuellKontaktNummer: trim(body.kundenAktuellKontaktNummer),
    kundenVollstaendigeAdresse: trim(body.kundenVollstaendigeAdresse),
    mnpRufnummer: trim(body.mnpRufnummer),
    originalAnbieter: trim(body.originalAnbieter),
    postpaidPrepaid: trim(body.postpaidPrepaid),
    mnpDetails: trim(body.mnpDetails),
    mnpAltKundenVorname: trim(body.mnpAltKundenVorname),
    mnpAltKundenNachname: trim(body.mnpAltKundenNachname),
    mnpAltKundenGeburtsdatum: trim(body.mnpAltKundenGeburtsdatum),
    freigegebenNachVertragsende: trim(body.freigegebenNachVertragsende),
    mnpTyp: trim(body.mnpTyp),
    status: trim(body.status) || 'Offen',
    mnpBestaetigungsdatum: trim(body.mnpBestaetigungsdatum),
    notiz: trim(body.notiz)
  };
}

function entrySnapshot(entry) {
  const { id, createdAt, updatedAt, createdBy, editHistory, ...rest } = entry;
  return JSON.parse(JSON.stringify(rest));
}

async function editorFromReqAsync(req) {
  const userId = String(req.user?.userId ?? req.user?.id ?? '').trim();
  let userName = String(req.user?.name ?? req.user?.userName ?? '').trim();
  let email = String(req.user?.email ?? '').trim();

  if (userId) {
    try {
      const id = normalizeUserId(userId) ?? userId;
      const u = await User.findByPk(id);
      const dbName = readUserName(u);
      if (dbName && !isRoleLabel(dbName)) userName = dbName;
      email = String(u?.email ?? u?.get?.('email') ?? u?.dataValues?.email ?? email).trim();
    } catch {
      // Fallback auf JWT/Request-Werte
    }
  }

  if (isRoleLabel(userName)) userName = '';
  if (!userName) userName = email || 'Unbekannt';
  return { userId, name: userName, userName, email };
}

export async function listMnpEntries(req, res) {
  if (!(await requireAdmin(req, res))) return;
  const data = await loadStore();
  const entries = [...data.entries].sort(
    (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
  );
  return res.json({
    success: true,
    entries: await Promise.all(entries.map((e) => enrichEntryForClient(e))),
    filialeOptions: ['Zentrale', ...FILIALE_OPTIONS]
  });
}

export async function getMnpEntry(req, res) {
  if (!(await requireAdmin(req, res))) return;
  const id = String(req.params.id || '').trim();
  const data = await loadStore();
  const entry = data.entries.find((e) => String(e.id) === id);
  if (!entry) {
    return res.status(404).json({ success: false, message: 'MNP-Eintrag nicht gefunden.' });
  }
  return res.json({ success: true, entry: await enrichEntryForClient(entry) });
}

export async function createMnpEntry(req, res) {
  if (!(await requireAdmin(req, res))) return;
  const normalized = normalizeEntryBody(req.body);
  if (normalized.error) {
    return res.status(400).json({ success: false, message: normalized.error });
  }
  if (!normalized.filiale) {
    return res.status(400).json({ success: false, message: 'Filiale ist erforderlich.' });
  }

  const now = new Date().toISOString();
  const editor = await editorFromReqAsync(req);
  const id = newId();
  const mitarbeiter = normalized.mitarbeiter || editor.name || editor.userName || '';
  const entry = {
    id,
    createdAt: now,
    updatedAt: now,
    createdBy: editor,
    lastEditedBy: editor,
    ...normalized,
    mitarbeiter,
    editHistory: [
      {
        id: newId('hist'),
        timestamp: now,
        action: 'created',
        editorUserId: editor.userId,
        editorUserName: editor.userName,
        editorEmail: editor.email,
        snapshot: entrySnapshot({ ...normalized, mitarbeiter })
      }
    ]
  };

  await mutateStore((data) => {
    data.entries.push(entry);
  });
  return res.status(201).json({ success: true, entry: await enrichEntryForClient(entry) });
}

export async function updateMnpEntry(req, res) {
  if (!(await requireAdmin(req, res))) return;
  const id = String(req.params.id || '').trim();
  const normalized = normalizeEntryBody(req.body);
  if (normalized.error) {
    return res.status(400).json({ success: false, message: normalized.error });
  }
  if (!normalized.filiale) {
    return res.status(400).json({ success: false, message: 'Filiale ist erforderlich.' });
  }

  const now = new Date().toISOString();
  const editor = await editorFromReqAsync(req);
  let updated = null;
  const notFound = await mutateStore((data) => {
    const idx = data.entries.findIndex((e) => String(e.id) === id);
    if (idx < 0) return { value: true };

    const prev = data.entries[idx];
    const history = Array.isArray(prev.editHistory) ? [...prev.editHistory] : [];
    const mitarbeiter = normalized.mitarbeiter || prev.mitarbeiter || editor.name || '';

    history.unshift({
      id: newId('hist'),
      timestamp: now,
      action: 'updated',
      editorUserId: editor.userId,
      editorUserName: editor.userName,
      editorEmail: editor.email,
      snapshot: entrySnapshot({ ...normalized, mitarbeiter })
    });

    updated = {
      ...prev,
      ...normalized,
      mitarbeiter,
      updatedAt: now,
      lastEditedBy: editor,
      editHistory: history.slice(0, 200)
    };
    data.entries[idx] = updated;
  });

  if (notFound === true) {
    return res.status(404).json({ success: false, message: 'MNP-Eintrag nicht gefunden.' });
  }
  return res.json({ success: true, entry: await enrichEntryForClient(updated) });
}

export async function deleteMnpEntry(req, res) {
  if (!(await requireAdmin(req, res))) return;
  const id = String(req.params.id || '').trim();
  const notFound = await mutateStore((data) => {
    const before = data.entries.length;
    data.entries = data.entries.filter((e) => String(e.id) !== id);
    if (data.entries.length === before) return { value: true };
  });
  if (notFound === true) {
    return res.status(404).json({ success: false, message: 'MNP-Eintrag nicht gefunden.' });
  }
  return res.json({ success: true });
}
