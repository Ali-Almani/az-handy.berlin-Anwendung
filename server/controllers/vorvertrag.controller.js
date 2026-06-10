import User from '../models/User.js';
import { loadJson, saveJson } from '../utils/filePersistence.js';
import { normalizeUserId } from '../utils/normalizeUserId.js';
import { FILIALE_OPTIONS, isValidFiliale, normalizeFiliale } from '../constants/einsatzorte.js';

const VORVERTRAG_FILE = 'vorvertrag.json';
const VERFUEGBARKEIT_OPTIONS = ['bestellen', 'in_shop'];

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

function newId(prefix = 'vv') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function loadStore() {
  const raw = await loadJson(VORVERTRAG_FILE, { entries: [] });
  return {
    entries: Array.isArray(raw?.entries) ? raw.entries : []
  };
}

async function saveStore(data) {
  await saveJson(VORVERTRAG_FILE, data);
}

function normalizeJaNein(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'ja' || v === 'yes' || v === 'true' || v === '1') return 'ja';
  return 'nein';
}

function normalizeAusgabeDetails(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const verf = String(raw.verfuegbarkeit ?? '').trim();
    return {
      geraet: String(raw.geraet ?? '').trim(),
      farbe: String(raw.farbe ?? '').trim(),
      verfuegbarkeit: VERFUEGBARKEIT_OPTIONS.includes(verf) ? verf : ''
    };
  }
  const legacy = String(raw ?? '').trim();
  return { geraet: legacy, farbe: '', verfuegbarkeit: '' };
}

function normalizeMitOhne(value) {
  const v = String(value ?? '').trim().toLowerCase();
  if (v === 'mit' || v === 'ja' || v === 'yes' || v === 'true' || v === '1') return 'Mit';
  return 'Ohne';
}

function normalizeEingabeDetails(raw = {}) {
  return {
    nationalitaet: String(raw.nationalitaet ?? '').trim(),
    passNummer: String(raw.passNummer ?? raw.pass_personalausweis_nummer ?? '').trim(),
    passAblaufDatum: String(raw.passAblaufDatum ?? raw.personalausweis_ablauf_datum ?? '').trim(),
    iban: String(raw.iban ?? '').trim(),
    ibanInhaber: String(raw.ibanInhaber ?? raw.iban_inhaber ?? '').trim(),
    imeisMonate: String(raw.imeisMonate ?? raw.imeis_monate ?? '').trim(),
    hwVoucher: String(raw.hwVoucher ?? raw.hw_voucher ?? '').trim(),
    kombi: normalizeMitOhne(raw.kombi),
    vvl: normalizeMitOhne(raw.vvl),
    eposKundenummer: String(raw.eposKundenummer ?? raw.epos_kundenummer ?? '').trim(),
    mnp: String(raw.mnp ?? '').trim(),
    notiz: String(raw.notiz ?? '').trim()
  };
}

function normalizeEntryBody(body = {}) {
  const filialeRaw = String(body.filiale ?? '').trim();
  if (filialeRaw && !isValidFiliale(filialeRaw)) {
    return { error: 'Ungültige Filiale.' };
  }
  const filiale = normalizeFiliale(filialeRaw);
  const anschlussJa = normalizeJaNein(body.anschlussJaNein ?? body.anschluss?.jaNein);
  const zuzahlungJa = normalizeJaNein(body.zuzahlungJaNein ?? body.zuzahlung?.jaNein);
  return {
    datum: String(body.datum ?? '').trim(),
    filiale,
    kundeVorname: String(body.kundeVorname ?? body.kunde_vorname ?? '').trim(),
    kundeNachname: String(body.kundeNachname ?? body.kunde_nachname ?? '').trim(),
    ausgabeDetails: normalizeAusgabeDetails(
      body.ausgabeDetails ??
        body.ausgabe_details ??
        (body.ausgabeGeraet != null || body.ausgabeFarbe != null || body.ausgabeVerfuegbarkeit != null
          ? {
              geraet: body.ausgabeGeraet,
              farbe: body.ausgabeFarbe,
              verfuegbarkeit: body.ausgabeVerfuegbarkeit
            }
          : '')
    ),
    anschluss: {
      jaNein: anschlussJa,
      wert: anschlussJa === 'ja' ? String(body.anschlussWert ?? body.anschluss?.wert ?? '').trim() : ''
    },
    zuzahlung: {
      jaNein: zuzahlungJa,
      wert: zuzahlungJa === 'ja' ? String(body.zuzahlungWert ?? body.zuzahlung?.wert ?? '').trim() : ''
    },
    eingabeDetails: normalizeEingabeDetails(body.eingabeDetails ?? body)
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

export async function listVorvertraege(req, res) {
  if (!(await requireAdmin(req, res))) return;
  const data = await loadStore();
  const entries = [...data.entries].sort(
    (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
  );
  return res.json({
    success: true,
    entries: await Promise.all(entries.map((e) => enrichEntryForClient(e))),
    filialeOptions: FILIALE_OPTIONS
  });
}

export async function getVorvertrag(req, res) {
  if (!(await requireAdmin(req, res))) return;
  const id = String(req.params.id || '').trim();
  const data = await loadStore();
  const entry = data.entries.find((e) => String(e.id) === id);
  if (!entry) {
    return res.status(404).json({ success: false, message: 'Vorvertrag nicht gefunden.' });
  }
  return res.json({ success: true, entry });
}

export async function createVorvertrag(req, res) {
  if (!(await requireAdmin(req, res))) return;
  const normalized = normalizeEntryBody(req.body);
  if (normalized.error) {
    return res.status(400).json({ success: false, message: normalized.error });
  }
  if (!normalized.datum) {
    return res.status(400).json({ success: false, message: 'Datum ist erforderlich.' });
  }
  if (!normalized.filiale) {
    return res.status(400).json({ success: false, message: 'Filiale ist erforderlich.' });
  }

  const now = new Date().toISOString();
  const editor = await editorFromReqAsync(req);
  const id = newId();
  const entry = {
    id,
    createdAt: now,
    updatedAt: now,
    createdBy: editor,
    lastEditedBy: editor,
    ...normalized,
    editHistory: [
      {
        id: newId('hist'),
        timestamp: now,
        action: 'created',
        editorUserId: editor.userId,
        editorUserName: editor.userName,
        editorEmail: editor.email,
        snapshot: entrySnapshot({ ...normalized })
      }
    ]
  };

  const data = await loadStore();
  data.entries.push(entry);
  await saveStore(data);
  return res.status(201).json({ success: true, entry: await enrichEntryForClient(entry) });
}

export async function updateVorvertrag(req, res) {
  if (!(await requireAdmin(req, res))) return;
  const id = String(req.params.id || '').trim();
  const normalized = normalizeEntryBody(req.body);
  if (normalized.error) {
    return res.status(400).json({ success: false, message: normalized.error });
  }
  if (!normalized.datum) {
    return res.status(400).json({ success: false, message: 'Datum ist erforderlich.' });
  }
  if (!normalized.filiale) {
    return res.status(400).json({ success: false, message: 'Filiale ist erforderlich.' });
  }

  const data = await loadStore();
  const idx = data.entries.findIndex((e) => String(e.id) === id);
  if (idx < 0) {
    return res.status(404).json({ success: false, message: 'Vorvertrag nicht gefunden.' });
  }

  const now = new Date().toISOString();
  const editor = await editorFromReqAsync(req);
  const prev = data.entries[idx];
  const history = Array.isArray(prev.editHistory) ? [...prev.editHistory] : [];

  history.unshift({
    id: newId('hist'),
    timestamp: now,
    action: 'updated',
    editorUserId: editor.userId,
    editorUserName: editor.userName,
    editorEmail: editor.email,
    snapshot: entrySnapshot({ ...normalized })
  });

  const updated = {
    ...prev,
    ...normalized,
    updatedAt: now,
    lastEditedBy: editor,
    editHistory: history.slice(0, 200)
  };
  data.entries[idx] = updated;
  await saveStore(data);
  return res.json({ success: true, entry: await enrichEntryForClient(updated) });
}

export async function deleteVorvertrag(req, res) {
  if (!(await requireAdmin(req, res))) return;
  const id = String(req.params.id || '').trim();
  const data = await loadStore();
  const before = data.entries.length;
  data.entries = data.entries.filter((e) => String(e.id) !== id);
  if (data.entries.length === before) {
    return res.status(404).json({ success: false, message: 'Vorvertrag nicht gefunden.' });
  }
  await saveStore(data);
  return res.json({ success: true });
}
