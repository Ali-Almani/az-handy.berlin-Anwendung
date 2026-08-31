import User from '../models/User.js';
import { readJsonStore, updateJsonStore } from '../utils/jsonClusterStore.js';
import { normalizeUserId } from '../utils/normalizeUserId.js';
import { FILIALE_OPTIONS, isValidFiliale, normalizeFiliale } from '../constants/einsatzorte.js';
import {
  normalizeVorvertragTicketStatus,
  VORVERTRAG_TICKET_STATUS_DEFAULT
} from '../constants/vorvertragTicketStatus.js';
import { writeAuditLog } from '../utils/auditLog.js';
import {
  backfillTicketIds,
  needsTicketIdBackfill,
  nextTicketId,
  ticketIdPrefixForType
} from '../utils/vorvertragTicketId.js';
import { buildVorvertragEditLog } from '../utils/vorvertragEditLog.js';

const VORVERTRAG_FILE = 'vorvertrag.json';
const VORVERTRAG_DEFAULT = () => ({ entries: [] });

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
  const editLog = await Promise.all(
    buildVorvertragEditLog(editHistory).map(async (item) => {
      const editorName = await resolveUserDisplayName(item.editorUserId, item.editorUserName);
      return {
        id: item.id,
        timestamp: item.timestamp,
        action: item.action,
        actionLabel: item.actionLabel,
        editorName: editorName || item.editorUserName || item.editorEmail || 'Unbekannt',
        changes: item.changes
      };
    })
  );
  return {
    ...rest,
    createdBy,
    lastEditedBy,
    mitarbeiterName,
    editLog,
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
  const raw = readJsonStore(VORVERTRAG_FILE, VORVERTRAG_DEFAULT());
  const entries = Array.isArray(raw?.entries) ? raw.entries : [];
  if (!needsTicketIdBackfill(entries)) {
    return { entries };
  }
  return updateJsonStore(VORVERTRAG_FILE, VORVERTRAG_DEFAULT(), (state) => {
    if (!Array.isArray(state.entries)) state.entries = [];
    backfillTicketIds(state.entries);
    return { value: { entries: state.entries } };
  });
}

async function mutateStore(updater) {
  return updateJsonStore(VORVERTRAG_FILE, VORVERTRAG_DEFAULT(), (state) => {
    if (!Array.isArray(state.entries)) state.entries = [];
    return updater(state);
  });
}

function normalizeJaNein(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'ja' || v === 'yes' || v === 'true' || v === '1') return 'ja';
  return 'nein';
}

function normalizeAusgabeDetails(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const verf = String(raw.verfuegbarkeit ?? '').trim();
    let verfuegbarkeit = '';
    if (verf === 'bestellen' || verf === 'in_shop') {
      verfuegbarkeit = verf;
    } else if (isValidFiliale(verf)) {
      verfuegbarkeit = normalizeFiliale(verf);
    }
    return {
      geraet: String(raw.geraet ?? '').trim(),
      farbe: String(raw.farbe ?? '').trim(),
      verfuegbarkeit
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

function normalizeMnpDetails(raw = {}) {
  const source = raw?.mnpDetails && typeof raw.mnpDetails === 'object' && !Array.isArray(raw.mnpDetails)
    ? raw.mnpDetails
    : raw;
  return {
    mitarbeiter: String(source.mitarbeiter ?? '').trim(),
    neuesVertragsdatum: String(source.neuesVertragsdatum ?? '').trim(),
    neueO2Rufnummer: String(source.neueO2Rufnummer ?? '').trim(),
    eposKn: String(source.eposKn ?? '').trim(),
    iban: String(source.iban ?? '').trim(),
    letzten7SimKarte: String(source.letzten7SimKarte ?? '').trim(),
    kundenVorname: String(source.kundenVorname ?? '').trim(),
    kundenNachname: String(source.kundenNachname ?? '').trim(),
    kundenGeburtsdatum: String(source.kundenGeburtsdatum ?? '').trim(),
    kundenAktuellKontaktNummer: String(source.kundenAktuellKontaktNummer ?? '').trim(),
    kundenVollstaendigeAdresse: String(source.kundenVollstaendigeAdresse ?? '').trim(),
    mnpRufnummer: String(source.mnpRufnummer ?? '').trim(),
    originalAnbieter: String(source.originalAnbieter ?? '').trim(),
    postpaidPrepaid: String(source.postpaidPrepaid ?? '').trim(),
    mnpDetails: String(source.mnpDetails ?? '').trim(),
    mnpAltKundenVorname: String(source.mnpAltKundenVorname ?? '').trim(),
    mnpAltKundenNachname: String(source.mnpAltKundenNachname ?? '').trim(),
    mnpAltKundenGeburtsdatum: String(source.mnpAltKundenGeburtsdatum ?? '').trim(),
    freigegebenNachVertragsende: String(source.freigegebenNachVertragsende ?? '').trim(),
    mnpTyp: String(source.mnpTyp ?? '').trim(),
    status: String(source.status ?? '').trim() || 'Offen',
    mnpBestaetigungsdatum: String(source.mnpBestaetigungsdatum ?? '').trim(),
    notiz: String(source.notiz ?? source.mnp ?? raw.mnp ?? '').trim()
  };
}

function normalizeEntryType(value) {
  return String(value ?? '').trim().toLowerCase() === 'mnp' ? 'mnp' : 'vorvertrag';
}

function validateMnpDetailsRequired(details = {}) {
  if (!String(details.postpaidPrepaid ?? '').trim()) {
    return 'Bitte Postpaid/Prepaid wählen.';
  }
  if (!String(details.mnpDetails ?? '').trim()) {
    return 'Bitte MNP-Details wählen.';
  }
  if (!String(details.freigegebenNachVertragsende ?? '').trim()) {
    return 'Bitte freigegeben/nach Vertragsende wählen.';
  }
  if (!String(details.mnpTyp ?? '').trim()) {
    return 'Bitte MNP Typ wählen.';
  }
  return '';
}

function applyMnpCustomerNames(normalized) {
  if (normalizeEntryType(normalized.entryType) !== 'mnp') return normalized;
  const mnp = normalized.eingabeDetails?.mnpDetails || {};
  return {
    ...normalized,
    kundeVorname: String(mnp.kundenVorname ?? '').trim(),
    kundeNachname: String(mnp.kundenNachname ?? '').trim()
  };
}

function normalizeEingabeDetails(raw = {}) {
  const mnpDetails = normalizeMnpDetails(raw);
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
    mnpDetails,
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
    entryType: normalizeEntryType(body.entryType),
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
    eingabeDetails: normalizeEingabeDetails(body.eingabeDetails ?? body),
    ticketStatus: normalizeVorvertragTicketStatus(body.ticketStatus ?? VORVERTRAG_TICKET_STATUS_DEFAULT)
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
    filialeOptions: ['Zentrale', ...FILIALE_OPTIONS]
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
  let normalized = normalizeEntryBody(req.body);
  if (normalized.error) {
    return res.status(400).json({ success: false, message: normalized.error });
  }
  if (!normalized.datum) {
    return res.status(400).json({ success: false, message: 'Datum ist erforderlich.' });
  }
  if (!normalized.filiale) {
    return res.status(400).json({ success: false, message: 'Filiale ist erforderlich.' });
  }
  normalized = applyMnpCustomerNames(normalized);
  if (normalized.entryType === 'mnp') {
    const mnpErr = validateMnpDetailsRequired(normalized.eingabeDetails?.mnpDetails);
    if (mnpErr) {
      return res.status(400).json({ success: false, message: mnpErr });
    }
  }

  const now = new Date().toISOString();
  const editor = await editorFromReqAsync(req);
  let entry = null;

  await mutateStore((data) => {
    if (needsTicketIdBackfill(data.entries)) backfillTicketIds(data.entries);
    const id = nextTicketId(data.entries, {
      prefix: ticketIdPrefixForType(normalized.entryType),
      datum: normalized.datum,
      createdAt: now
    });
    entry = {
      createdAt: now,
      updatedAt: now,
      createdBy: editor,
      lastEditedBy: editor,
      ...normalized,
      id,
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
    data.entries.push(entry);
  });
  const customerLabel = [normalized.kundeVorname, normalized.kundeNachname].filter(Boolean).join(' ') || 'Ohne Kundenname';
  writeAuditLog(req, {
    category: 'vorvertrag',
    action: normalized.entryType === 'mnp' ? 'vorvertrag.mnp.create' : 'vorvertrag.create',
    summary: `${normalized.entryType === 'mnp' ? 'MNP' : 'Vorvertrag'} erstellt: ${customerLabel}`,
    meta: { entryId: entry.id, entryType: normalized.entryType, filiale: normalized.filiale }
  });
  return res.status(201).json({ success: true, entry: await enrichEntryForClient(entry) });
}

export async function updateVorvertrag(req, res) {
  if (!(await requireAdmin(req, res))) return;
  const id = String(req.params.id || '').trim();
  let normalized = normalizeEntryBody(req.body);
  if (normalized.error) {
    return res.status(400).json({ success: false, message: normalized.error });
  }
  if (!normalized.datum) {
    return res.status(400).json({ success: false, message: 'Datum ist erforderlich.' });
  }
  if (!normalized.filiale) {
    return res.status(400).json({ success: false, message: 'Filiale ist erforderlich.' });
  }
  normalized = applyMnpCustomerNames(normalized);
  if (normalized.entryType === 'mnp') {
    const mnpErr = validateMnpDetailsRequired(normalized.eingabeDetails?.mnpDetails);
    if (mnpErr) {
      return res.status(400).json({ success: false, message: mnpErr });
    }
  }

  const now = new Date().toISOString();
  const editor = await editorFromReqAsync(req);
  let updated = null;
  const notFound = await mutateStore((data) => {
    const idx = data.entries.findIndex((e) => String(e.id) === id);
    if (idx < 0) return { value: true };

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

    updated = {
      ...prev,
      ...normalized,
      id: prev.id,
      ticketStatus:
        req.body?.ticketStatus != null
          ? normalizeVorvertragTicketStatus(req.body.ticketStatus)
          : normalizeVorvertragTicketStatus(prev.ticketStatus),
      updatedAt: now,
      lastEditedBy: editor,
      editHistory: history.slice(0, 200)
    };
    data.entries[idx] = updated;
  });

  if (notFound === true) {
    return res.status(404).json({ success: false, message: 'Vorvertrag nicht gefunden.' });
  }
  const customerLabel = [updated?.kundeVorname, updated?.kundeNachname].filter(Boolean).join(' ') || id;
  writeAuditLog(req, {
    category: 'vorvertrag',
    action: updated?.entryType === 'mnp' ? 'vorvertrag.mnp.update' : 'vorvertrag.update',
    summary: `${updated?.entryType === 'mnp' ? 'MNP' : 'Vorvertrag'} bearbeitet: ${customerLabel}`,
    meta: { entryId: id, entryType: updated?.entryType }
  });
  return res.json({ success: true, entry: await enrichEntryForClient(updated) });
}

export async function updateVorvertragTicketStatus(req, res) {
  if (!(await requireAdmin(req, res))) return;
  const id = String(req.params.id || '').trim();
  const ticketStatus = normalizeVorvertragTicketStatus(req.body?.ticketStatus);
  if (!String(req.body?.ticketStatus ?? '').trim()) {
    return res.status(400).json({ success: false, message: 'Status ist erforderlich.' });
  }

  const now = new Date().toISOString();
  const editor = await editorFromReqAsync(req);
  let updated = null;
  const notFound = await mutateStore((data) => {
    const idx = data.entries.findIndex((e) => String(e.id) === id);
    if (idx < 0) return { value: true };

    const prev = data.entries[idx];
    const history = Array.isArray(prev.editHistory) ? [...prev.editHistory] : [];

    history.unshift({
      id: newId('hist'),
      timestamp: now,
      action: 'status_changed',
      editorUserId: editor.userId,
      editorUserName: editor.userName,
      editorEmail: editor.email,
      snapshot: entrySnapshot({ ...prev, ticketStatus })
    });

    updated = {
      ...prev,
      ticketStatus,
      updatedAt: now,
      lastEditedBy: editor,
      editHistory: history.slice(0, 200)
    };
    data.entries[idx] = updated;
  });

  if (notFound === true) {
    return res.status(404).json({ success: false, message: 'Vorvertrag nicht gefunden.' });
  }
  writeAuditLog(req, {
    category: 'vorvertrag',
    action: 'vorvertrag.status',
    summary: `Ticket-Status geändert: ${ticketStatus} (${id})`,
    meta: { entryId: id, ticketStatus }
  });
  return res.json({ success: true, entry: await enrichEntryForClient(updated) });
}

export async function deleteVorvertrag(req, res) {
  if (!(await requireAdmin(req, res))) return;
  const id = String(req.params.id || '').trim();
  const notFound = await mutateStore((data) => {
    const before = data.entries.length;
    data.entries = data.entries.filter((e) => String(e.id) !== id);
    if (data.entries.length === before) return { value: true };
  });
  if (notFound === true) {
    return res.status(404).json({ success: false, message: 'Vorvertrag nicht gefunden.' });
  }
  writeAuditLog(req, {
    category: 'vorvertrag',
    action: 'vorvertrag.delete',
    summary: `Eintrag gelöscht: ${id}`,
    meta: { entryId: id }
  });
  return res.json({ success: true });
}
