import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getDataDir } from './filePersistence.js';
import { readJsonStore, updateJsonStore } from './jsonClusterStore.js';
import { prepareWhatsAppAudio } from './whatsappAudio.js';
import {
  WHATSAPP_FILE_MAX_BYTES,
  WHATSAPP_NATIVE_VIDEO_MAX_BYTES
} from '../middleware/whatsappMediaUpload.js';
import { normalizeTicketLanguage } from '../constants/ticketLanguage.js';
import { ensureDailyTicketNrs, nextDailyTicketNr } from './dailyTicketNr.js';
import {
  findFlowQuestion,
  flowWaitMs,
  followupTextForLocale,
  followupWaitMs,
  loadAutoQuestionFlow,
  matchFlowOption,
  normalizeFlowAnswer,
  queueAfter,
  resolvedOptionTitle,
  savesCity
} from './autoQuestionFlow.js';

export { WHATSAPP_FILE_MAX_BYTES, WHATSAPP_NATIVE_VIDEO_MAX_BYTES };

const FILE = 'whatsapp-inbox.json';
const DEFAULT = () => ({ tickets: [] });
const MEDIA_DIR = () => path.join(getDataDir(), 'uploads', 'whatsapp');

const WELCOME_BRANCHES = `Sonnenallee 16, 12047
Karl-Marx-Straße 50, 12043
Karl-Marx-Straße 127, 12043
Karl-Marx-Straße 169, 12043
Badstraße 12, 13357
Turmstraße 47, 10551
Hauptstraße 156, 10827`;

const WELCOME_BY_LOCALE = {
  ar: `أهلاً بك في AZ Handy Berlin! 
استلمنا رسالتك، وسيرد عليك أحد زملائنا شخصياً بأقرب وقت خلال ساعات العمل.

📞 للاستفسارات : 03076767089
🕙 الإثنين–السبت: 10 صباحاً–6 مساءً

📍 فروعنا في برلين:
${WELCOME_BRANCHES}

🌐 أحدث عروضنا:
az-handy.berlin

شكراً جزيلاً، يسعدنا مساعدتك! 🌟`,
  de: `Willkommen bei AZ Handy Berlin!
Wir haben Ihre Nachricht erhalten. Ein Kollege antwortet Ihnen persönlich so schnell wie möglich während der Öffnungszeiten.

📞 Fragen: 03076767089
🕙 Mo–Sa: 10–18 Uhr

📍 Unsere Filialen in Berlin:
${WELCOME_BRANCHES}

🌐 Aktuelle Angebote:
az-handy.berlin

Vielen Dank, wir helfen Ihnen gerne! 🌟`,
  en: `Welcome to AZ Handy Berlin!
We received your message. A colleague will reply personally as soon as possible during opening hours.

📞 Inquiries: 03076767089
🕙 Mon–Sat: 10am–6pm

📍 Our shops in Berlin:
${WELCOME_BRANCHES}

🌐 Latest offers:
az-handy.berlin

Thank you, we are happy to help! 🌟`
};

export const FIRST_CUSTOMER_AUTO_REPLY = WELCOME_BY_LOCALE.ar;

const TYPING_PULSE_MS = 20_000;
const pendingQuestionTimers = new Map();
const pendingFollowupTimers = new Map();
const WHATSAPP_SESSION_MS = 24 * 60 * 60 * 1000;
const pendingTypingTimers = new Map();
let inboxEmitter = null;

export function setWhatsAppInboxEmitter(fn) {
  inboxEmitter = typeof fn === 'function' ? fn : null;
}

function emitInbox(ticket) {
  if (!ticket || !inboxEmitter) return;
  try {
    inboxEmitter(ticket);
  } catch {
    /* ignore */
  }
}

export function detectCustomerLanguage(text) {
  const t = String(text || '').trim();
  if (!t) return 'Deutsch';
  if (/[\u0600-\u06FF]/.test(t)) return 'Arabisch';
  const lower = t.toLowerCase();
  const de = /[äöüß]/.test(lower)
    || /\b(hallo|guten\s*(tag|morgen|abend)|bitte|danke|ich|und|nicht|möchte|haben|bin|für|oder|kein|keine|schon|kunde|handy|angebot|vertrag)\b/.test(lower);
  const en = /\b(hello|hi|hey|please|thanks|thank you|want|have|already|customer|phone|yes|no|the|you|are|offer|contract)\b/.test(lower);
  if (en && !de) return 'Englisch';
  return 'Deutsch';
}

function localeFromSprache(sprache) {
  const n = normalizeTicketLanguage(sprache);
  if (n === 'Arabisch') return 'ar';
  if (n === 'Englisch') return 'en';
  return 'de';
}

export function whatsappToken() {
  return String(process.env.WHATSAPP_TOKEN || '').trim().replace(/^["']|["']$/g, '');
}

export function whatsappPhoneNumberId() {
  return String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
}

export function whatsappAppSecret() {
  return String(process.env.WHATSAPP_APP_SECRET || '').trim().replace(/^["']|["']$/g, '');
}

export function whatsappVerifyToken() {
  return String(process.env.WHATSAPP_VERIFY_TOKEN || '').trim();
}

export function whatsappGraphVersion() {
  return String(process.env.WHATSAPP_GRAPH_VERSION || 'v21.0').trim() || 'v21.0';
}

export function whatsappConfigured() {
  return Boolean(whatsappToken() && whatsappPhoneNumberId());
}

export function normalizeWaId(raw) {
  let digits = String(raw || '').replace(/[^\d]/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length >= 10) digits = `49${digits.slice(1)}`;
  return digits;
}

export function formatWaHandle(waId) {
  const id = normalizeWaId(waId);
  if (id.startsWith('49') && id.length >= 11) return `+${id.slice(0, 2)} ${id.slice(2)}`;
  return id ? `+${id}` : '';
}

export function ticketIdForWa(waId) {
  return `WA-${normalizeWaId(waId)}`;
}

function emptyTicket(waId, name, at, existingTickets = []) {
  const id = ticketIdForWa(waId);
  const handle = formatWaHandle(waId);
  return {
    id,
    ticketNr: nextDailyTicketNr(existingTickets, 'whatsapp', at),
    liveWhatsApp: true,
    waId: normalizeWaId(waId),
    channel: 'whatsapp',
    customerName: String(name || handle || waId).trim(),
    handle,
    rufnummer: handle,
    o2Kunde: '',
    angebot: '',
    produktNotiz: '',
    stadt: '',
    marketingNotiz: '',
    terminDatum: '',
    terminZeit: '',
    mocKn: '',
    shop: '',
    ticketStatus: 'Callcenter',
    nachrichtArt: 'angebot',
    unread: true,
    welcomeAutoSent: false,
    autoQuestionField: '',
    autoQuestionDueAt: '',
    autoQuestionQueue: [],
    autoAnswers: {},
    customAnswers: {},
    inboxGroup: '',
    textFollowupDueAt: '',
    textFollowupSent: false,
    sprache: '',
    mitarbeiterName: '',
    shopMitarbeiter: '',
    shopMitarbeiterNames: [],
    kundenbesuchDatum: '',
    geoeffnetAt: '',
    lastOpenedAt: '',
    dokumente: [],
    dokumenteHidden: [],
    editLog: [],
    kontaktversuchCount: 1,
    createdAt: at,
    messages: []
  };
}

function graphUrl(pathname) {
  return `https://graph.facebook.com/${whatsappGraphVersion()}/${pathname.replace(/^\//, '')}`;
}

function graphError(payload, fallback) {
  const err = new Error(payload?.error?.message || fallback);
  err.status = 502;
  err.detail = String(payload?.error?.message || fallback).slice(0, 180);
  return err;
}

function extForMime(mime, fallback = '.bin') {
  const m = String(mime || '').toLowerCase();
  if (m.startsWith('video/')) {
    if (m.includes('3gpp') || m.includes('3gp')) return '.3gp';
    if (m.includes('quicktime')) return '.mov';
    return '.mp4';
  }
  if (m.includes('jpeg') || m.includes('jpg')) return '.jpg';
  if (m.includes('png')) return '.png';
  if (m.includes('webp')) return '.webp';
  if (m.includes('gif')) return '.gif';
  if (m.includes('ogg')) return '.ogg';
  if (m.includes('mpeg') || m.includes('mp3')) return '.mp3';
  if (m.includes('m4a') || m.includes('aac') || m === 'audio/mp4') return '.m4a';
  if (m.includes('webm')) return '.webm';
  if (m.includes('wav')) return '.wav';
  if (m.includes('amr')) return '.amr';
  if (m.includes('pdf')) return '.pdf';
  return fallback;
}

function parseDataUrl(src) {
  const raw = String(src || '').trim();
  const match = raw.match(/^data:([^;,]+)(?:;[^,]*)?;base64,(.+)$/i);
  if (!match) return null;
  return {
    mime: String(match[1] || 'application/octet-stream').trim(),
    buffer: Buffer.from(match[2], 'base64')
  };
}

function ensureMediaDir() {
  const dir = MEDIA_DIR();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function saveBuffer(buffer, mime, kind) {
  const dir = ensureMediaDir();
  const fallback = kind === 'audio' ? '.ogg' : kind === 'video' ? '.mp4' : kind === 'document' ? '.pdf' : '.jpg';
  const ext = extForMime(mime, fallback);
  const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(dir, name), buffer);
  return {
    id: name,
    src: `/api/whatsapp/files/${name}`,
    mime
  };
}

export function resolveWhatsAppFile(name) {
  const safe = String(name || '').trim();
  if (!safe || /[^A-Za-z0-9._-]/.test(safe) || safe.includes('..')) return null;
  const dir = ensureMediaDir();
  const full = path.join(dir, safe);
  if (!full.startsWith(dir) || !fs.existsSync(full)) return null;
  return full;
}

export async function downloadWhatsAppMedia(mediaId, kind = 'image') {
  const token = whatsappToken();
  const id = String(mediaId || '').trim();
  if (!token || !id) return null;
  const metaRes = await fetch(graphUrl(encodeURIComponent(id)), {
    headers: { Authorization: `Bearer ${token}` }
  });
  const meta = await metaRes.json().catch(() => ({}));
  if (!metaRes.ok || !meta?.url) {
    console.warn('[whatsapp] media meta', meta?.error?.message || metaRes.status);
    return null;
  }
  const binRes = await fetch(meta.url, { headers: { Authorization: `Bearer ${token}` } });
  if (!binRes.ok) {
    console.warn('[whatsapp] media download', binRes.status);
    return null;
  }
  const buffer = Buffer.from(await binRes.arrayBuffer());
  const mime = String(meta.mime_type || binRes.headers.get('content-type') || '').trim();
  return saveBuffer(buffer, mime, kind);
}

export async function uploadWhatsAppMedia(buffer, mime, filename) {
  const token = whatsappToken();
  const phoneId = whatsappPhoneNumberId();
  if (!token || !phoneId) throw graphError({}, 'WhatsApp ist nicht eingerichtet.');
  const type = String(mime || 'application/octet-stream').split(';')[0].trim() || 'application/octet-stream';
  const name = filename || `upload${extForMime(type)}`;
  const bytes = buffer instanceof Uint8Array ? buffer : Buffer.from(buffer);
  const file = typeof File === 'function'
    ? new File([bytes], name, { type })
    : new Blob([bytes], { type });
  const form = new FormData();
  form.set('messaging_product', 'whatsapp');
  form.set('type', type);
  form.set('file', file, name);
  const res = await fetch(graphUrl(`${encodeURIComponent(phoneId)}/media`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload?.id) {
    const msg = String(payload?.error?.message || '');
    if (/too large|file size|16\s*mb|100\s*mb|131053/i.test(msg)) {
      throw graphError(payload, 'Datei ist für WhatsApp zu groß.');
    }
    throw graphError(payload, 'whatsapp_media');
  }
  return String(payload.id);
}

function looksLikeVideoFile({ mime, name, kind } = {}) {
  return String(kind || '').toLowerCase() === 'video'
    || String(mime || '').toLowerCase().startsWith('video/')
    || /\.(mp4|mov|3gp|3gpp)$/i.test(String(name || ''));
}

export async function sendOutgoingSavedFile(toWaId, { filePath, mime, name, kind, text } = {}) {
  const full = path.resolve(String(filePath || ''));
  if (!full || !fs.existsSync(full)) throw graphError({}, 'Datei nicht gefunden.');
  const size = fs.statSync(full).size;
  if (size > WHATSAPP_FILE_MAX_BYTES) {
    const err = graphError({}, 'Datei darf höchstens 100 MB groß sein.');
    err.status = 400;
    throw err;
  }
  const buffer = fs.readFileSync(full);
  const filename = String(name || path.basename(full) || 'Datei').trim() || 'Datei';
  const isVideo = looksLikeVideoFile({ mime, name: filename, kind });
  const nativeVideo = isVideo && size <= WHATSAPP_NATIVE_VIDEO_MAX_BYTES;
  const uploadType = nativeVideo
    ? uploadMime(mime, 'video')
    : isVideo
      ? (String(mime || '').split(';')[0].trim() || 'video/mp4')
      : uploadMime(mime, 'document');
  let mediaId;
  try {
    mediaId = await uploadWhatsAppMedia(buffer, uploadType, filename);
  } catch (err) {
    if (isVideo && !nativeVideo) {
      const friendly = graphError({}, 'WhatsApp spielt Videos nur bis 16 MB ab. Größere Videos (bis 100 MB) gehen als Datei – wenn WhatsApp ablehnt, bitte kürzer aufnehmen oder komprimieren.');
      friendly.status = 400;
      throw friendly;
    }
    throw err;
  }
  const caption = String(text || '').trim();
  const savedName = path.basename(full);
  const src = `/api/whatsapp/files/${savedName}`;
  const at = new Date().toISOString();
  if (nativeVideo) {
    const id = await sendWhatsAppVideo(toWaId, mediaId, caption);
    return {
      id,
      from: 'agent',
      text: caption,
      videos: [{ id: savedName, src, name: filename }],
      at
    };
  }
  try {
    const id = await sendWhatsAppDocument(toWaId, mediaId, filename, caption);
    const part = {
      id,
      from: 'agent',
      text: caption,
      files: [{ id: savedName, src, name: filename, mime: uploadType }],
      at
    };
    if (isVideo) part.videos = [{ id: savedName, src, name: filename }];
    return part;
  } catch (err) {
    if (isVideo) {
      const friendly = graphError({}, 'WhatsApp spielt Videos nur bis 16 MB ab. Größere Videos (bis 100 MB) gehen als Datei – wenn WhatsApp ablehnt, bitte kürzer aufnehmen oder komprimieren.');
      friendly.status = 400;
      throw friendly;
    }
    throw err;
  }
}

export function loadWhatsAppTickets() {
  const raw = readJsonStore(FILE, DEFAULT());
  const tickets = Array.isArray(raw?.tickets) ? raw.tickets : [];
  const ensured = ensureDailyTicketNrs(tickets, 'whatsapp');
  if (!ensured.changed) return tickets;
  updateJsonStore(FILE, DEFAULT(), (state) => {
    const current = Array.isArray(state.tickets) ? state.tickets : [];
    const next = ensureDailyTicketNrs(current, 'whatsapp');
    if (next.changed) state.tickets = next.tickets;
  });
  return ensureDailyTicketNrs(readJsonStore(FILE, DEFAULT()).tickets || [], 'whatsapp').tickets;
}

export async function mutateWhatsAppTickets(updater) {
  return updateJsonStore(FILE, DEFAULT(), (state) => {
    if (!Array.isArray(state.tickets)) state.tickets = [];
    return updater(state);
  });
}

function ticketFromState(state, ticketId, waId) {
  return (state?.tickets || []).find((t) => t.id === ticketId || (waId && t.waId === normalizeWaId(waId))) || null;
}

export async function upsertIncomingMessage({ waId, name, message }) {
  const id = ticketIdForWa(waId);
  const at = message.at || new Date().toISOString();
  return mutateWhatsAppTickets((state) => {
    let ticket = state.tickets.find((t) => t.id === id || t.waId === normalizeWaId(waId));
    if (!ticket) {
      ticket = emptyTicket(waId, name, at, state.tickets);
      state.tickets.unshift(ticket);
    }
    if (name && (!ticket.customerName || ticket.customerName === ticket.handle || ticket.customerName === ticket.waId)) {
      ticket.customerName = name;
    }
    const exists = (ticket.messages || []).some((m) => m.id && m.id === message.id);
    if (!exists) {
      ticket.messages = [...(ticket.messages || []), message];
      ticket.unread = true;
      state.tickets = [ticket, ...state.tickets.filter((t) => t !== ticket)];
      if (message?.from === 'customer') {
        ticket.textFollowupDueAt = '';
        ticket.textFollowupSent = false;
      }
    }
    return { value: { tickets: state.tickets } };
  });
}

export async function appendOutgoingMessage(ticketId, message, extra = {}) {
  return mutateWhatsAppTickets((state) => {
    const ticket = state.tickets.find((t) => t.id === ticketId);
    if (!ticket) return { value: { tickets: state.tickets } };
    ticket.messages = [...(ticket.messages || []), message];
    if (!extra.keepUnread) ticket.unread = false;
    if (extra.mitarbeiterName) ticket.mitarbeiterName = extra.mitarbeiterName;
    if (extra.welcomeAutoSent) ticket.welcomeAutoSent = true;
    if (extra.autoQuestionField !== undefined) ticket.autoQuestionField = extra.autoQuestionField;
    if (extra.autoQuestionDueAt !== undefined) ticket.autoQuestionDueAt = extra.autoQuestionDueAt;
    if (extra.autoQuestionQueue !== undefined) ticket.autoQuestionQueue = extra.autoQuestionQueue;
    if (extra.sprache !== undefined) ticket.sprache = extra.sprache;
    return { value: { tickets: state.tickets } };
  }).then((state) => {
    const ticket = ticketFromState(state, ticketId);
    if (message?.from === 'agent' && message?.auto !== 'followup') {
      armTextFollowup(ticket);
    }
    return state;
  });
}

export async function patchWhatsAppTicket(ticketId, patch) {
  return mutateWhatsAppTickets((state) => {
    const ticket = state.tickets.find((t) => t.id === ticketId);
    if (!ticket) return { value: { tickets: state.tickets } };
    const allowed = [
      'shop', 'unread', 'ticketStatus', 'sprache', 'rufnummer', 'customerName', 'ticketNr',
      'o2Kunde', 'angebot', 'produktNotiz', 'stadt', 'marketingNotiz',
      'terminDatum', 'terminZeit', 'mocKn', 'geoeffnetAt', 'lastOpenedAt', 'nachrichtArt', 'mitarbeiterName', 'shopMitarbeiter', 'shopMitarbeiterNames', 'kundenbesuchDatum', 'priority',
      'welcomeAutoSent', 'autoQuestionField', 'autoQuestionDueAt', 'autoQuestionQueue', 'autoAnswers', 'customAnswers',
      'textFollowupDueAt', 'textFollowupSent', 'kontaktversuchCount', 'editLog',
      ...Array.from({ length: 20 }, (_, i) => i + 1).flatMap((n) => ([
        `kundenbesuch${n}Bearbeiter`,
        `kontakt${n}Bearbeiter`,
        `kontakt${n}ShopNotiz`,
        `kontakt${n}Datum`,
        `kontakt${n}Uhrzeit`,
        `kontakt${n}Zeit`,
        `kontakt${n}ZeitAt`
      ]))
    ];
    for (const key of allowed) {
      if (patch[key] === undefined) continue;
      if (key === 'autoQuestionQueue') {
        ticket.autoQuestionQueue = (Array.isArray(patch[key]) ? patch[key] : [])
          .map((id) => String(id || '').trim())
          .filter(Boolean)
          .slice(0, 20);
        continue;
      }
      if (key === 'autoAnswers') {
        const src = patch[key] && typeof patch[key] === 'object' && !Array.isArray(patch[key]) ? patch[key] : {};
        const next = {};
        for (const [id, entry] of Object.entries(src).slice(0, 30)) {
          const value = String(entry?.value ?? entry ?? '').trim().slice(0, 80);
          if (!value) continue;
          next[String(id).slice(0, 40)] = {
            label: String(entry?.label || id).trim().slice(0, 80),
            value
          };
        }
        ticket.autoAnswers = next;
        continue;
      }
      if (key === 'customAnswers') {
        const src = patch[key] && typeof patch[key] === 'object' && !Array.isArray(patch[key]) ? patch[key] : {};
        const next = { ...(ticket.customAnswers && typeof ticket.customAnswers === 'object' ? ticket.customAnswers : {}) };
        for (const [id, entry] of Object.entries(src).slice(0, 40)) {
          const fieldId = String(id).slice(0, 40);
          if (!/^cq-/.test(fieldId)) continue;
          next[fieldId] = String(entry ?? '').slice(0, 500);
          ticket[fieldId] = next[fieldId];
        }
        ticket.customAnswers = next;
        continue;
      }
      if (key === 'kontaktversuchCount') {
        const n = parseInt(patch[key], 10);
        ticket.kontaktversuchCount = Number.isFinite(n) ? Math.min(20, Math.max(1, n)) : 1;
        continue;
      }
      if (key === 'editLog') {
        const src = Array.isArray(patch[key]) ? patch[key] : [];
        ticket.editLog = src.slice(0, 200).map((item) => ({
          id: String(item?.id || '').slice(0, 80),
          timestamp: String(item?.timestamp || '').slice(0, 40),
          editorName: String(item?.editorName || '').slice(0, 80),
          action: String(item?.action || 'updated').slice(0, 40),
          actionLabel: String(item?.actionLabel || '').slice(0, 160),
          changes: (Array.isArray(item?.changes) ? item.changes : []).slice(0, 40).map((change) => ({
            field: String(change?.field || '').slice(0, 80),
            from: String(change?.from ?? '').slice(0, 160),
            to: String(change?.to ?? '').slice(0, 160)
          }))
        }));
        continue;
      }
      if (key === 'shopMitarbeiterNames') {
        const src = Array.isArray(patch[key]) ? patch[key] : [];
        const names = [];
        for (const value of src.slice(0, 30)) {
          const name = String(value || '').trim().slice(0, 80);
          if (name && !names.includes(name)) names.push(name);
        }
        ticket.shopMitarbeiterNames = names;
        continue;
      }
      ticket[key] = patch[key];
    }
    return { value: { tickets: state.tickets } };
  });
}

function dokumentKindFromFile(mime, name) {
  const type = String(mime || '').toLowerCase();
  const fileName = String(name || '').toLowerCase();
  if (type.includes('pdf') || fileName.endsWith('.pdf')) return 'pdf';
  if (type.startsWith('image/')) return 'image';
  return '';
}

export async function addTicketDokument(ticketId, { filename, mime, originalName, uploadedBy } = {}) {
  const kind = dokumentKindFromFile(mime, originalName || filename);
  if (!kind || !filename) return mutateWhatsAppTickets((state) => ({ value: { tickets: state.tickets } }));
  return mutateWhatsAppTickets((state) => {
    const ticket = state.tickets.find((t) => t.id === ticketId);
    if (!ticket) return { value: { tickets: state.tickets } };
    const doc = {
      id: String(filename).slice(0, 120),
      src: `/api/whatsapp/files/${filename}`,
      name: String(originalName || filename).trim().slice(0, 120) || (kind === 'pdf' ? 'Dokument.pdf' : 'Bild'),
      mime: String(mime || (kind === 'pdf' ? 'application/pdf' : 'image/jpeg')).slice(0, 80),
      kind,
      source: 'upload',
      at: new Date().toISOString(),
      uploadedBy: String(uploadedBy || '').trim().slice(0, 80)
    };
    const list = Array.isArray(ticket.dokumente) ? ticket.dokumente : [];
    ticket.dokumente = [...list.filter((item) => item?.src !== doc.src), doc].slice(-60);
    return { value: { tickets: state.tickets } };
  });
}

function normalizeDokumentSrc(src) {
  const s = String(src || '').trim();
  if (!s) return '';
  const prefix = '/uploads/whatsapp/';
  if (s.startsWith(prefix)) return `/api/whatsapp/files/${s.slice(prefix.length)}`;
  if (/^[A-Za-z0-9._-]+\.(jpe?g|png|gif|webp|pdf|bin)$/i.test(s)) return `/api/whatsapp/files/${s}`;
  return s;
}

function filenameFromDokumentSrc(src) {
  const s = normalizeDokumentSrc(src);
  const match = s.match(/\/api\/whatsapp\/files\/([^/?#]+)$/);
  return match ? match[1] : '';
}

export function sanitizeDokumenteHidden(list) {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const src = normalizeDokumentSrc(raw);
    if (!src || seen.has(src)) continue;
    seen.add(src);
    out.push(src);
  }
  return out.slice(0, 80);
}

function dokumentMatches(item, { src, id } = {}) {
  const itemSrc = normalizeDokumentSrc(item?.src || item);
  const itemId = String(item?.id || '').trim();
  const wantSrc = normalizeDokumentSrc(src);
  const wantId = String(id || '').trim();
  if (wantId && (itemId === wantId || itemSrc === wantId || itemSrc === normalizeDokumentSrc(wantId))) return true;
  if (wantSrc && (itemSrc === wantSrc || itemId === wantSrc)) return true;
  return false;
}

function ticketReferencesWhatsAppFile(ticket, filename) {
  if (!filename) return false;
  const hit = (value) => String(value?.src || value || '').includes(filename);
  for (const message of Array.isArray(ticket?.messages) ? ticket.messages : []) {
    if (hit(message?.image) || hit(message?.file)) return true;
    if ((message?.images || []).some(hit)) return true;
    if ((message?.files || []).some(hit)) return true;
  }
  return (Array.isArray(ticket?.dokumente) ? ticket.dokumente : []).some(hit);
}

export async function removeTicketDokument(ticketId, { src, id } = {}) {
  const wantSrc = String(src || '').trim();
  const wantId = String(id || '').trim();
  if (!wantSrc && !wantId) return mutateWhatsAppTickets((state) => ({ value: { tickets: state.tickets } }));
  let unlinkName = '';
  const result = await mutateWhatsAppTickets((state) => {
    const ticket = state.tickets.find((t) => t.id === ticketId);
    if (!ticket) return { value: { tickets: state.tickets } };
    const list = Array.isArray(ticket.dokumente) ? ticket.dokumente : [];
    const removed = list.filter((item) => dokumentMatches(item, { src: wantSrc, id: wantId }));
    ticket.dokumente = list.filter((item) => !dokumentMatches(item, { src: wantSrc, id: wantId }));
    const hiddenSrc = normalizeDokumentSrc(wantSrc || removed[0]?.src || wantId);
    ticket.dokumenteHidden = sanitizeDokumenteHidden([
      ...(Array.isArray(ticket.dokumenteHidden) ? ticket.dokumenteHidden : []),
      hiddenSrc,
      normalizeDokumentSrc(wantId)
    ]);
    const candidate = filenameFromDokumentSrc(hiddenSrc);
    const wasUpload = removed.some((item) => item?.source !== 'chat');
    if (candidate && wasUpload && !ticketReferencesWhatsAppFile(ticket, candidate)) {
      unlinkName = candidate;
    }
    return { value: { tickets: state.tickets } };
  });
  if (unlinkName) {
    const full = resolveWhatsAppFile(unlinkName);
    if (full) {
      try { fs.unlinkSync(full); } catch { /* Datei schon weg */ }
    }
  }
  return result;
}

export async function deleteWhatsAppTicket(ticketId) {
  return mutateWhatsAppTickets((state) => {
    state.tickets = state.tickets.filter((t) => t.id !== ticketId);
    return { value: { tickets: state.tickets } };
  });
}

export async function deleteStoredMessage(ticketId, messageId) {
  return mutateWhatsAppTickets((state) => {
    const ticket = state.tickets.find((t) => t.id === ticketId);
    if (!ticket) return { value: { tickets: state.tickets } };
    ticket.messages = (ticket.messages || []).filter((m) => m.id !== messageId);
    return { value: { tickets: state.tickets } };
  });
}

export async function deleteStoredMessageById(messageId) {
  const id = String(messageId || '').trim();
  if (!id) return [];
  const changed = [];
  const state = await mutateWhatsAppTickets((current) => {
    for (const ticket of current.tickets) {
      const before = (ticket.messages || []).length;
      ticket.messages = (ticket.messages || []).filter((m) => m.id !== id);
      if ((ticket.messages || []).length !== before) changed.push(ticket.id);
    }
    return { value: { tickets: current.tickets } };
  });
  return (state?.tickets || []).filter((ticket) => changed.includes(ticket.id));
}

export function findWhatsAppTicket(ticketId) {
  return loadWhatsAppTickets().find((t) => t.id === ticketId) || null;
}

export function findTicketInState(state, ticketId, waId) {
  return ticketFromState(state, ticketId, waId);
}

async function sendGraphMessage(body) {
  const token = whatsappToken();
  const phoneId = whatsappPhoneNumberId();
  const res = await fetch(graphUrl(`${encodeURIComponent(phoneId)}/messages`), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...body })
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw graphError(payload, 'whatsapp_send');
  return String(payload?.messages?.[0]?.id || `wa-out-${Date.now()}`);
}

function lastCustomerWaMessageId(ticket) {
  const messages = Array.isArray(ticket?.messages) ? ticket.messages : [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const id = String(messages[i]?.id || '').trim();
    if (messages[i]?.from === 'customer' && id.startsWith('wamid.')) return id;
  }
  return '';
}

async function sendWhatsAppTyping(messageId) {
  const id = String(messageId || '').trim();
  if (!id.startsWith('wamid.') || !whatsappConfigured()) return;
  const token = whatsappToken();
  const phoneId = whatsappPhoneNumberId();
  const res = await fetch(graphUrl(`${encodeURIComponent(phoneId)}/messages`), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: id,
      typing_indicator: { type: 'text' }
    })
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw graphError(payload, 'whatsapp_typing');
  }
}

function pulseQuestionTyping(ticket) {
  const current = findWhatsAppTicket(ticket?.id) || ticket;
  const messageId = lastCustomerWaMessageId(current);
  if (!messageId) return;
  sendWhatsAppTyping(messageId).catch((err) => {
    console.warn('[whatsapp] typing', err?.detail || err?.message || err);
  });
}

function stopQuestionTyping(ticketId, spec) {
  const key = `${spec.waitField}:${ticketId}`;
  const timer = pendingTypingTimers.get(key);
  if (timer) clearInterval(timer);
  pendingTypingTimers.delete(key);
}

function startQuestionTyping(ticket, spec) {
  if (!ticket?.id || !spec) return;
  const key = `${spec.waitField}:${ticket.id}`;
  const prev = pendingTypingTimers.get(key);
  if (prev) clearInterval(prev);
  const due = Date.parse(ticket.autoQuestionDueAt || '') || (Date.now() + flowWaitMs());
  if (due - Date.now() < 3000) {
    pendingTypingTimers.delete(key);
    return;
  }
  pulseQuestionTyping(ticket);
  const timer = setInterval(() => {
    const current = findWhatsAppTicket(ticket.id);
    if (String(current?.autoQuestionField || '') !== spec.waitField) {
      clearInterval(timer);
      pendingTypingTimers.delete(key);
      return;
    }
    pulseQuestionTyping(current);
  }, TYPING_PULSE_MS);
  pendingTypingTimers.set(key, timer);
}

export async function sendWhatsAppText(toWaId, text) {
  return sendGraphMessage({
    to: normalizeWaId(toWaId),
    type: 'text',
    text: { body: String(text || '').trim(), preview_url: true }
  });
}

async function sendWhatsAppButtons(toWaId, bodyText, buttons) {
  return sendGraphMessage({
    to: normalizeWaId(toWaId),
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.map((button) => ({
          type: 'reply',
          reply: { id: button.id, title: button.title }
        }))
      }
    }
  });
}

async function sendWhatsAppList(toWaId, bodyText, buttonLabel, rows, sectionTitle = 'Auswahl') {
  return sendGraphMessage({
    to: normalizeWaId(toWaId),
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: bodyText },
      action: {
        button: buttonLabel,
        sections: [{ title: String(sectionTitle || 'Auswahl').slice(0, 24), rows }]
      }
    }
  });
}

export async function sendWhatsAppImage(toWaId, mediaId, caption = '') {
  const image = { id: mediaId };
  const cap = String(caption || '').trim();
  if (cap) image.caption = cap;
  return sendGraphMessage({
    to: normalizeWaId(toWaId),
    type: 'image',
    image
  });
}

export async function sendWhatsAppAudio(toWaId, mediaId) {
  return sendGraphMessage({
    to: normalizeWaId(toWaId),
    type: 'audio',
    audio: { id: mediaId }
  });
}

export async function sendWhatsAppVideo(toWaId, mediaId, caption = '') {
  const video = { id: mediaId };
  const cap = String(caption || '').trim();
  if (cap) video.caption = cap;
  return sendGraphMessage({
    to: normalizeWaId(toWaId),
    type: 'video',
    video
  });
}

export async function sendWhatsAppDocument(toWaId, mediaId, filename, caption = '') {
  const document = { id: mediaId, filename: String(filename || 'Datei.pdf').trim() || 'Datei.pdf' };
  const cap = String(caption || '').trim();
  if (cap) document.caption = cap;
  return sendGraphMessage({
    to: normalizeWaId(toWaId),
    type: 'document',
    document
  });
}

export async function deleteCloudMessage(wamid) {
  const id = String(wamid || '').trim();
  if (!id || !id.startsWith('wamid.')) return false;
  try {
    await sendGraphMessage({
      status: 'deleted',
      message_id: id
    });
    return true;
  } catch (err) {
    console.warn('[whatsapp] delete message', err?.detail || err?.message || err);
    return false;
  }
}

function uploadMime(raw, kind) {
  const mime = String(raw || '').split(';')[0].trim().toLowerCase();
  if (kind === 'image') {
    if (mime === 'image/png') return 'image/png';
    return 'image/jpeg';
  }
  if (kind === 'video') {
    if (mime.includes('3gpp') || mime.includes('3gp')) return 'video/3gpp';
    return 'video/mp4';
  }
  if (kind === 'document') return mime.includes('pdf') ? 'application/pdf' : mime || 'application/pdf';
  if (mime === 'audio/ogg' || mime === 'audio/opus') return 'audio/ogg';
  if (mime === 'audio/mpeg' || mime === 'audio/mp3') return 'audio/mpeg';
  if (mime === 'audio/mp4' || mime === 'audio/aac' || mime === 'audio/m4a') return 'audio/mp4';
  if (mime === 'audio/amr') return 'audio/amr';
  if (mime === 'audio/wav' || mime === 'audio/x-wav' || mime === 'audio/wave') return 'audio/wav';
  if (mime === 'audio/webm') return 'audio/webm';
  return mime || (kind === 'audio' ? 'audio/ogg' : 'image/jpeg');
}

export async function sendOutgoingParts(toWaId, { text = '', images = [], voices = [], files = [] } = {}) {
  const sent = [];
  const body = String(text || '').trim();
  const pics = (Array.isArray(images) ? images : []).filter((img) => img && (img.src || img.url));
  const audios = (Array.isArray(voices) ? voices : []).filter((voice) => voice && (voice.src || voice.url));
  const docs = (Array.isArray(files) ? files : []).filter((file) => file && (file.src || file.url));
  let captionUsed = false;

  for (let i = 0; i < pics.length; i += 1) {
    const parsed = parseDataUrl(pics[i].src || pics[i].url);
    if (!parsed) throw graphError({}, 'Bild konnte nicht gelesen werden.');
    const mime = uploadMime(parsed.mime, 'image');
    const mediaId = await uploadWhatsAppMedia(parsed.buffer, mime, `image${extForMime(mime)}`);
    const caption = !captionUsed && body ? body : '';
    if (caption) captionUsed = true;
    const id = await sendWhatsAppImage(toWaId, mediaId, caption);
    const saved = saveBuffer(parsed.buffer, mime, 'image');
    sent.push({
      id,
      from: 'agent',
      text: caption,
      images: [{
        id: saved.id,
        src: String(pics[i].src || '').startsWith('data:') ? pics[i].src : saved.src
      }],
      at: new Date().toISOString()
    });
  }

  for (const voice of audios) {
    const parsed = parseDataUrl(voice.src || voice.url);
    if (!parsed) throw graphError({}, 'Sprachnachricht konnte nicht gelesen werden.');
    const prepared = await prepareWhatsAppAudio(parsed.buffer, uploadMime(parsed.mime, 'audio'));
    const mediaId = await uploadWhatsAppMedia(prepared.buffer, prepared.mime, `audio${extForMime(prepared.mime, '.mp3')}`);
    const id = await sendWhatsAppAudio(toWaId, mediaId);
    const saved = saveBuffer(prepared.buffer, prepared.mime, 'audio');
    sent.push({
      id,
      from: 'agent',
      text: '',
      voices: [{
        id: saved.id,
        src: saved.src,
        duration: voice.duration
      }],
      at: new Date().toISOString()
    });
  }

  for (const file of docs) {
    const parsed = parseDataUrl(file.src || file.url);
    if (!parsed) throw graphError({}, 'Datei konnte nicht gelesen werden.');
    const kind = String(file.kind || '').toLowerCase() === 'video' || String(parsed.mime || '').startsWith('video/')
      ? 'video'
      : 'document';
    const mime = uploadMime(parsed.mime || file.mime, kind);
    const filename = String(file.name || (kind === 'video' ? 'video.mp4' : 'Datei.pdf')).trim() || 'Datei.pdf';
    const mediaId = await uploadWhatsAppMedia(parsed.buffer, mime, filename);
    const caption = !captionUsed && body ? body : '';
    if (caption) captionUsed = true;
    const saved = saveBuffer(parsed.buffer, mime, kind);
    if (kind === 'video') {
      const id = await sendWhatsAppVideo(toWaId, mediaId, caption);
      sent.push({
        id,
        from: 'agent',
        text: caption,
        videos: [{ id: saved.id, src: saved.src, name: filename }],
        at: new Date().toISOString()
      });
    } else {
      const id = await sendWhatsAppDocument(toWaId, mediaId, filename, caption);
      sent.push({
        id,
        from: 'agent',
        text: caption,
        files: [{ id: saved.id, src: saved.src, name: filename, mime }],
        at: new Date().toISOString()
      });
    }
  }

  if (body && !captionUsed) {
    const id = await sendWhatsAppText(toWaId, body);
    sent.push({
      id,
      from: 'agent',
      text: body,
      at: new Date().toISOString()
    });
  }

  return sent;
}

export async function sendWelcomeIfNeeded(ticket) {
  if (!ticket?.id || ticket.welcomeAutoSent) return ticket;
  const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
  const customerCount = messages.filter((m) => m?.from === 'customer').length;
  if (customerCount !== 1) {
    if (customerCount > 1) {
      const state = await patchWhatsAppTicket(ticket.id, { welcomeAutoSent: true });
      return ticketFromState(state, ticket.id, ticket.waId) || ticket;
    }
    return ticket;
  }
  if (messages.some((m) => m?.auto === 'welcome' || String(m?.id || '').startsWith('auto-welcome-'))) {
    const state = await patchWhatsAppTicket(ticket.id, { welcomeAutoSent: true });
    return ticketFromState(state, ticket.id, ticket.waId) || ticket;
  }
  try {
    const firstText = messages.find((m) => m?.from === 'customer')?.text || '';
    const sprache = detectCustomerLanguage(firstText);
    const locale = localeFromSprache(sprache);
    const text = WELCOME_BY_LOCALE[locale] || WELCOME_BY_LOCALE.de;
    const waMessageId = await sendWhatsAppText(ticket.waId, text);
    const state = await appendOutgoingMessage(ticket.id, {
      id: waMessageId,
      from: 'agent',
      auto: 'welcome',
      locale,
      text,
      at: new Date().toISOString()
    }, { keepUnread: true, welcomeAutoSent: true, sprache });
    const welcomed = ticketFromState(state, ticket.id, ticket.waId) || { ...ticket, sprache };
    return startFlowPause(welcomed, loadAutoQuestionFlow().startId);
  } catch (err) {
    console.warn('[whatsapp] welcome', err?.detail || err?.message || err);
    return ticket;
  }
}

async function appendAutoQuestion(ticket, { waMessageId, text, auto, autoQuestionField, locale }) {
  const state = await appendOutgoingMessage(ticket.id, {
    id: waMessageId,
    from: 'agent',
    auto,
    locale: locale || localeFromSprache(ticket.sprache),
    text,
    at: new Date().toISOString()
  }, { keepUnread: true, autoQuestionField, autoQuestionDueAt: '' });
  return ticketFromState(state, ticket.id, ticket.waId) || ticket;
}

const LIST_BUTTON = { de: 'Auswählen', ar: 'اختيار', en: 'Choose' };

function clipTitle(value, max) {
  return String(value || '').trim().slice(0, max);
}

async function sendFlowQuestion(ticket, questionId) {
  if (!ticket?.id || !ticket.waId) return ticket;
  const flow = loadAutoQuestionFlow();
  const question = findFlowQuestion(flow, questionId);
  if (!question) return ticket;
  const locale = localeFromSprache(ticket.sprache);
  const text = question.text?.[locale] || question.text?.de || question.label;
  const options = question.kind === 'choice' ? question.options : [];
  try {
    let waMessageId = '';
    if (!options.length) {
      waMessageId = await sendWhatsAppText(ticket.waId, text);
    } else if (options.length <= 3) {
      waMessageId = await sendWhatsAppButtons(ticket.waId, text, options.map((opt, index) => ({
        id: opt.replyId || `opt:${question.id}:${index}`,
        title: clipTitle(resolvedOptionTitle(opt, locale), 20)
      })));
    } else {
      waMessageId = await sendWhatsAppList(
        ticket.waId,
        text,
        LIST_BUTTON[locale] || LIST_BUTTON.de,
        options.map((opt, index) => ({
          id: opt.replyId || `opt:${question.id}:${index}`,
          title: clipTitle(resolvedOptionTitle(opt, locale), 24)
        })),
        clipTitle(question.label, 24) || 'Auswahl'
      );
    }
    return appendAutoQuestion(ticket, {
      waMessageId,
      text,
      auto: `ask-${question.id}`,
      autoQuestionField: question.id,
      locale
    });
  } catch (err) {
    console.warn('[whatsapp] ask', question.id, err?.detail || err?.message || err);
    return ticket;
  }
}

function specForQuestion(questionId, legacy = '') {
  const send = (ticket) => sendFlowQuestion(ticket, questionId);
  if (legacy === 'o2') {
    return {
      waitField: 'o2Wait',
      sendingField: 'o2Sending',
      successField: questionId,
      questionId,
      send
    };
  }
  if (legacy === 'stadt') {
    return {
      waitField: 'stadtWait',
      sendingField: 'stadtSending',
      successField: questionId,
      questionId,
      send
    };
  }
  return {
    waitField: `wait:${questionId}`,
    sendingField: `sending:${questionId}`,
    successField: questionId,
    questionId,
    send
  };
}

function specForWaitField(field) {
  if (field === 'o2Wait' || field === 'o2Sending') {
    return specForQuestion(loadAutoQuestionFlow().startId || 'o2Kunde', 'o2');
  }
  if (field === 'stadtWait' || field === 'stadtSending') return specForQuestion('stadt', 'stadt');
  const wait = field.startsWith('wait:') ? field.slice(5) : '';
  const sending = field.startsWith('sending:') ? field.slice(8) : '';
  const id = wait || sending;
  if (!id) return null;
  return specForQuestion(id);
}

function isPauseField(field) {
  return field === 'o2Wait'
    || field === 'o2Sending'
    || field === 'stadtWait'
    || field === 'stadtSending'
    || field.startsWith('wait:')
    || field.startsWith('sending:');
}

async function startFlowPause(ticket, questionId, queue = []) {
  const id = String(questionId || '').trim();
  if (!ticket?.id || !id) return ticket;
  const dueAt = new Date(Date.now() + flowWaitMs()).toISOString();
  const rest = (Array.isArray(queue) ? queue : []).filter((item) => item && item !== id);
  const state = await patchWhatsAppTicket(ticket.id, {
    autoQuestionField: `wait:${id}`,
    autoQuestionDueAt: dueAt,
    autoQuestionQueue: rest
  });
  const next = ticketFromState(state, ticket.id, ticket.waId)
    || { ...ticket, autoQuestionField: `wait:${id}`, autoQuestionDueAt: dueAt, autoQuestionQueue: rest };
  scheduleDelayedQuestion(next, specForQuestion(id));
  return next;
}

async function finishOrPause(ticket, patch, queued) {
  const [nextId, ...rest] = queued;
  if (!nextId) {
    const state = await patchWhatsAppTicket(ticket.id, {
      ...patch,
      autoQuestionField: '',
      autoQuestionDueAt: '',
      autoQuestionQueue: []
    });
    return ticketFromState(state, ticket.id, ticket.waId) || ticket;
  }
  const dueAt = new Date(Date.now() + flowWaitMs()).toISOString();
  const state = await patchWhatsAppTicket(ticket.id, {
    ...patch,
    autoQuestionField: `wait:${nextId}`,
    autoQuestionDueAt: dueAt,
    autoQuestionQueue: rest
  });
  const next = ticketFromState(state, ticket.id, ticket.waId) || {
    ...ticket,
    ...patch,
    autoQuestionField: `wait:${nextId}`,
    autoQuestionDueAt: dueAt,
    autoQuestionQueue: rest
  };
  scheduleDelayedQuestion(next, specForQuestion(nextId));
  return next;
}

function answerPatch(ticket, question, value) {
  const patch = {};
  if (!value) return patch;
  if (question.saveAs) patch[question.saveAs] = value;
  else {
    const prev = ticket.autoAnswers && typeof ticket.autoAnswers === 'object' ? ticket.autoAnswers : {};
    patch.autoAnswers = {
      ...prev,
      [question.id]: { label: question.label || question.id, value }
    };
  }
  return patch;
}

async function claimDelayedQuestion(ticketId, spec) {
  let claimed = false;
  const state = await mutateWhatsAppTickets((current) => {
    const found = current.tickets.find((t) => t.id === ticketId);
    if (!found || String(found.autoQuestionField || '') !== spec.waitField) {
      return { value: { tickets: current.tickets } };
    }
    found.autoQuestionField = spec.sendingField;
    claimed = true;
    return { value: { tickets: current.tickets } };
  });
  return { claimed, ticket: ticketFromState(state, ticketId) };
}

function scheduleDelayedQuestion(ticket, spec) {
  if (!ticket?.id || !spec) return;
  const key = `${spec.waitField}:${ticket.id}`;
  const prev = pendingQuestionTimers.get(key);
  if (prev) clearTimeout(prev);
  const due = Date.parse(ticket.autoQuestionDueAt || '') || (Date.now() + flowWaitMs());
  const wait = Math.max(0, due - Date.now());
  const timer = setTimeout(() => {
    pendingQuestionTimers.delete(key);
    sendScheduledQuestion(ticket.id, spec);
  }, wait);
  pendingQuestionTimers.set(key, timer);
  startQuestionTyping(ticket, spec);
}

async function sendScheduledQuestion(ticketId, spec) {
  stopQuestionTyping(ticketId, spec);
  if (spec.questionId && !findFlowQuestion(loadAutoQuestionFlow(), spec.questionId)) {
    await patchWhatsAppTicket(ticketId, { autoQuestionField: '', autoQuestionDueAt: '', autoQuestionQueue: [] });
    return;
  }
  const { claimed, ticket } = await claimDelayedQuestion(ticketId, spec);
  if (!claimed || !ticket) return;
  const sent = await spec.send(ticket);
  if (String(sent?.autoQuestionField || '') !== spec.successField) {
    const dueAt = new Date(Date.now() + 15000).toISOString();
    await patchWhatsAppTicket(ticketId, { autoQuestionField: spec.waitField, autoQuestionDueAt: dueAt });
    scheduleDelayedQuestion({ ...ticket, autoQuestionField: spec.waitField, autoQuestionDueAt: dueAt }, spec);
    return;
  }
  emitInbox(sent);
}

function lastCustomerMessageAt(ticket) {
  const times = (ticket?.messages || [])
    .filter((item) => item?.from === 'customer')
    .map((item) => Date.parse(item.at || ''))
    .filter((value) => Number.isFinite(value));
  return times.length ? Math.max(...times) : 0;
}

function clearFollowupTimer(ticketId) {
  const prev = pendingFollowupTimers.get(ticketId);
  if (prev) clearTimeout(prev);
  pendingFollowupTimers.delete(ticketId);
}

function scheduleTextFollowup(ticket) {
  if (!ticket?.id) return;
  clearFollowupTimer(ticket.id);
  const due = Date.parse(ticket.textFollowupDueAt || '');
  if (!Number.isFinite(due)) return;
  const wait = Math.max(0, due - Date.now());
  const timer = setTimeout(() => {
    pendingFollowupTimers.delete(ticket.id);
    sendScheduledTextFollowup(ticket.id);
  }, wait);
  pendingFollowupTimers.set(ticket.id, timer);
}

function armTextFollowup(ticket) {
  if (!ticket?.id) return;
  const flow = loadAutoQuestionFlow();
  const locale = localeFromSprache(ticket.sprache);
  if (!followupTextForLocale(flow, locale)) {
    clearFollowupTimer(ticket.id);
    patchWhatsAppTicket(ticket.id, { textFollowupDueAt: '', textFollowupSent: false }).catch(() => {});
    return;
  }
  const dueAt = new Date(Date.now() + followupWaitMs(flow)).toISOString();
  patchWhatsAppTicket(ticket.id, { textFollowupDueAt: dueAt, textFollowupSent: false })
    .then((state) => {
      const next = ticketFromState(state, ticket.id, ticket.waId) || { ...ticket, textFollowupDueAt: dueAt, textFollowupSent: false };
      scheduleTextFollowup(next);
    })
    .catch((err) => {
      console.warn('[whatsapp] followup-arm', err?.message || err);
    });
}

export function cancelTextFollowup(ticketId) {
  if (!ticketId) return;
  clearFollowupTimer(ticketId);
}

async function sendScheduledTextFollowup(ticketId) {
  const flow = loadAutoQuestionFlow();
  let claimed = false;
  let ticket = null;
  const state = await mutateWhatsAppTickets((current) => {
    const found = current.tickets.find((item) => item.id === ticketId);
    if (!found || found.textFollowupSent || !found.textFollowupDueAt) {
      return { value: { tickets: current.tickets } };
    }
    found.textFollowupSent = true;
    found.textFollowupDueAt = '';
    claimed = true;
    ticket = found;
    return { value: { tickets: current.tickets } };
  });
  ticket = ticketFromState(state, ticketId) || ticket;
  if (!claimed || !ticket?.waId) return;
  const locale = localeFromSprache(ticket.sprache);
  const text = followupTextForLocale(flow, locale);
  const lastCustomer = lastCustomerMessageAt(ticket);
  if (!text || !lastCustomer || Date.now() - lastCustomer >= WHATSAPP_SESSION_MS - 60_000) return;
  try {
    const waMessageId = await sendWhatsAppText(ticket.waId, text);
    const nextState = await appendOutgoingMessage(ticket.id, {
      id: waMessageId,
      from: 'agent',
      auto: 'followup',
      locale,
      text,
      at: new Date().toISOString()
    }, { keepUnread: true });
    emitInbox(ticketFromState(nextState, ticket.id, ticket.waId) || ticket);
  } catch (err) {
    console.warn('[whatsapp] followup', err?.detail || err?.message || err);
    await patchWhatsAppTicket(ticketId, { textFollowupSent: false });
  }
}

export async function resumeDelayedAutoQuestions() {
  const tickets = loadWhatsAppTickets();
  for (const ticket of tickets) {
    if (ticket?.textFollowupDueAt && !ticket.textFollowupSent) {
      scheduleTextFollowup(ticket);
    }
  }
  for (const ticket of tickets) {
    const field = String(ticket.autoQuestionField || '');
    const spec = specForWaitField(field);
    if (!spec) continue;
    if (field === spec.sendingField) {
      const dueAt = new Date().toISOString();
      await patchWhatsAppTicket(ticket.id, { autoQuestionField: spec.waitField, autoQuestionDueAt: dueAt });
      scheduleDelayedQuestion({ ...ticket, autoQuestionField: spec.waitField, autoQuestionDueAt: dueAt }, spec);
    } else {
      scheduleDelayedQuestion(ticket, spec);
    }
  }
}

export async function handleAutoQuestionReply(ticket, message) {
  if (!ticket?.id) return ticket;
  const field = String(ticket.autoQuestionField || '').trim();
  if (!field || isPauseField(field)) return ticket;
  const question = findFlowQuestion(loadAutoQuestionFlow(), field);
  if (!question) return ticket;

  const replyId = String(message?.interactiveId || '').trim();
  const text = String(message?.text || '').trim();
  const remaining = Array.isArray(ticket.autoQuestionQueue) ? ticket.autoQuestionQueue : [];

  if (question.kind === 'text' || !question.options.length) {
    if (replyId || !text) return ticket;
    const value = normalizeFlowAnswer(question, text);
    if (!value) return ticket;
    return finishOrPause(ticket, answerPatch(ticket, question, value), queueAfter(question.next, remaining));
  }

  let option = matchFlowOption(question, replyId, text);
  if (!option && savesCity(question) && text) {
    const mapped = normalizeFlowAnswer(question, text);
    option = (question.options || []).find((opt) => !opt.prompt && opt.value === mapped) || null;
    if (mapped && !option) {
      return finishOrPause(ticket, answerPatch(ticket, question, mapped), queueAfter(question.next, remaining));
    }
  }
  if (!option) return ticket;
  if (option.prompt) {
    return finishOrPause(ticket, {}, queueAfter(option.next, remaining));
  }
  const value = savesCity(question)
    ? (normalizeFlowAnswer(question, option.value) || option.value)
    : option.value;
  return finishOrPause(ticket, answerPatch(ticket, question, value), queueAfter(option.next, remaining));
}
