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
import { stadtForTicket } from './stadtDeutsch.js';

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

const ASK_O2 = {
  ar: 'هل أنت عميل O2 حالياً؟',
  de: 'Sind Sie bereits O2-Kunde?',
  en: 'Are you already an O2 customer?'
};

const ASK_STADT = {
  ar: 'في أي مدينة أنت؟',
  de: 'In welcher Stadt sind Sie?',
  en: 'Which city are you in?'
};

const ASK_STADT_TYPING = {
  ar: 'يرجى كتابة اسم المدينة.',
  de: 'Bitte schreiben Sie den Städtenamen.',
  en: 'Please type the city name.'
};

const O2_BUTTONS = {
  ar: [{ id: 'o2:Ja', title: 'نعم' }, { id: 'o2:Nein', title: 'لا' }],
  de: [{ id: 'o2:Ja', title: 'Ja' }, { id: 'o2:Nein', title: 'Nein' }],
  en: [{ id: 'o2:Ja', title: 'Yes' }, { id: 'o2:Nein', title: 'No' }]
};

const STADT_LIST = {
  ar: {
    button: 'اختيار',
    rows: [
      { id: 'stadt:Berlin', title: 'برلين' },
      { id: 'stadt:out', title: 'خارج برلين' },
      { id: 'stadt:custom', title: 'اكتب بنفسك' }
    ]
  },
  de: {
    button: 'Auswählen',
    rows: [
      { id: 'stadt:Berlin', title: 'Berlin' },
      { id: 'stadt:out', title: 'außerhalb Berlin' },
      { id: 'stadt:custom', title: 'selbst schreiben' }
    ]
  },
  en: {
    button: 'Choose',
    rows: [
      { id: 'stadt:Berlin', title: 'Berlin' },
      { id: 'stadt:out', title: 'outside Berlin' },
      { id: 'stadt:custom', title: 'type yourself' }
    ]
  }
};

const O2_YES = new Set(['o2:Ja', 'Ja', 'Yes', 'نعم']);
const O2_NO = new Set(['o2:Nein', 'Nein', 'No', 'لا']);
const STADT_CUSTOM = new Set(['stadt:custom', 'selbst schreiben', 'type yourself', 'اكتب بنفسك']);
const STADT_BERLIN = new Set(['stadt:Berlin', 'Berlin', 'برلين', 'بيرلين']);
const STADT_OUT = new Set(['stadt:out', 'außerhalb Berlin', 'outside Berlin', 'خارج برلين', 'خارج بيرلين']);

const QUESTION_PAUSE_MS = 60_000;
const TYPING_PULSE_MS = 20_000;
const pendingQuestionTimers = new Map();
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

function copyForLocale(map, sprache) {
  const locale = localeFromSprache(sprache);
  return map[locale] || map.de;
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

function emptyTicket(waId, name, at) {
  const id = ticketIdForWa(waId);
  const handle = formatWaHandle(waId);
  return {
    id,
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
    shop: '',
    ticketStatus: 'Callcenter',
    nachrichtArt: 'angebot',
    unread: true,
    welcomeAutoSent: false,
    autoQuestionField: '',
    autoQuestionDueAt: '',
    sprache: '',
    mitarbeiterName: '',
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
  return Array.isArray(raw?.tickets) ? raw.tickets : [];
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
      ticket = emptyTicket(waId, name, at);
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
    if (extra.sprache !== undefined) ticket.sprache = extra.sprache;
    return { value: { tickets: state.tickets } };
  });
}

export async function patchWhatsAppTicket(ticketId, patch) {
  return mutateWhatsAppTickets((state) => {
    const ticket = state.tickets.find((t) => t.id === ticketId);
    if (!ticket) return { value: { tickets: state.tickets } };
    const allowed = [
      'shop', 'unread', 'ticketStatus', 'sprache', 'rufnummer', 'customerName',
      'o2Kunde', 'angebot', 'produktNotiz', 'stadt', 'marketingNotiz',
      'terminDatum', 'terminZeit', 'nachrichtArt', 'mitarbeiterName', 'priority',
      'welcomeAutoSent', 'autoQuestionField', 'autoQuestionDueAt',
      'kundenbesuch1Bearbeiter', 'kundenbesuch2Bearbeiter', 'kundenbesuch3Bearbeiter',
      'kontakt1ShopNotiz', 'kontakt1Datum', 'kontakt1Zeit',
      'kontakt2Bearbeiter', 'kontakt2ShopNotiz', 'kontakt2Datum', 'kontakt2Zeit',
      'kontakt3Bearbeiter', 'kontakt3ShopNotiz', 'kontakt3Datum', 'kontakt3Zeit'
    ];
    for (const key of allowed) {
      if (patch[key] !== undefined) ticket[key] = patch[key];
    }
    return { value: { tickets: state.tickets } };
  });
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
  const due = Date.parse(ticket.autoQuestionDueAt || '') || (Date.now() + QUESTION_PAUSE_MS);
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

async function sendWhatsAppList(toWaId, bodyText, buttonLabel, rows) {
  return sendGraphMessage({
    to: normalizeWaId(toWaId),
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: bodyText },
      action: {
        button: buttonLabel,
        sections: [{ title: 'Stadt', rows }]
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
    return startQuestionPause(welcomed, 'o2Wait');
  } catch (err) {
    console.warn('[whatsapp] welcome', err?.detail || err?.message || err);
    return ticket;
  }
}

async function appendAutoQuestion(ticket, { waMessageId, text, auto, autoQuestionField, locale }) {
  const extra = { keepUnread: true, autoQuestionField };
  if (autoQuestionField === 'stadt' || autoQuestionField === 'o2Kunde') extra.autoQuestionDueAt = '';
  const state = await appendOutgoingMessage(ticket.id, {
    id: waMessageId,
    from: 'agent',
    auto,
    locale: locale || localeFromSprache(ticket.sprache),
    text,
    at: new Date().toISOString()
  }, extra);
  return ticketFromState(state, ticket.id, ticket.waId) || ticket;
}

export async function sendO2KundeQuestion(ticket) {
  if (!ticket?.id || !ticket.waId) return ticket;
  const locale = localeFromSprache(ticket.sprache);
  const text = copyForLocale(ASK_O2, ticket.sprache);
  try {
    const waMessageId = await sendWhatsAppButtons(ticket.waId, text, copyForLocale(O2_BUTTONS, ticket.sprache));
    return appendAutoQuestion(ticket, {
      waMessageId,
      text,
      auto: 'ask-o2',
      autoQuestionField: 'o2Kunde',
      locale
    });
  } catch (err) {
    console.warn('[whatsapp] ask-o2', err?.detail || err?.message || err);
    return ticket;
  }
}

export async function sendStadtQuestion(ticket) {
  if (!ticket?.id || !ticket.waId) return ticket;
  const locale = localeFromSprache(ticket.sprache);
  const text = copyForLocale(ASK_STADT, ticket.sprache);
  const list = copyForLocale(STADT_LIST, ticket.sprache);
  try {
    const waMessageId = await sendWhatsAppList(ticket.waId, text, list.button, list.rows);
    return appendAutoQuestion(ticket, {
      waMessageId,
      text,
      auto: 'ask-stadt',
      autoQuestionField: 'stadt',
      locale
    });
  } catch (err) {
    console.warn('[whatsapp] ask-stadt', err?.detail || err?.message || err);
    return ticket;
  }
}

export async function sendStadtTypingPrompt(ticket) {
  if (!ticket?.id || !ticket.waId) return ticket;
  const locale = localeFromSprache(ticket.sprache);
  const text = copyForLocale(ASK_STADT_TYPING, ticket.sprache);
  try {
    const waMessageId = await sendWhatsAppText(ticket.waId, text);
    return appendAutoQuestion(ticket, {
      waMessageId,
      text,
      auto: 'ask-stadt-text',
      autoQuestionField: 'stadtText',
      locale
    });
  } catch (err) {
    console.warn('[whatsapp] ask-stadt-text', err?.detail || err?.message || err);
    return ticket;
  }
}

const DELAYED_QUESTIONS = {
  o2Wait: {
    waitField: 'o2Wait',
    sendingField: 'o2Sending',
    successField: 'o2Kunde',
    send: sendO2KundeQuestion
  },
  stadtWait: {
    waitField: 'stadtWait',
    sendingField: 'stadtSending',
    successField: 'stadt',
    send: sendStadtQuestion
  }
};

function specForWaitField(field) {
  if (field === 'o2Wait' || field === 'o2Sending') return DELAYED_QUESTIONS.o2Wait;
  if (field === 'stadtWait' || field === 'stadtSending') return DELAYED_QUESTIONS.stadtWait;
  return null;
}

async function startQuestionPause(ticket, waitField) {
  const dueAt = new Date(Date.now() + QUESTION_PAUSE_MS).toISOString();
  const state = await patchWhatsAppTicket(ticket.id, {
    autoQuestionField: waitField,
    autoQuestionDueAt: dueAt
  });
  const next = ticketFromState(state, ticket.id, ticket.waId)
    || { ...ticket, autoQuestionField: waitField, autoQuestionDueAt: dueAt };
  const spec = specForWaitField(waitField);
  if (spec) scheduleDelayedQuestion(next, spec);
  return next;
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
  const due = Date.parse(ticket.autoQuestionDueAt || '') || (Date.now() + QUESTION_PAUSE_MS);
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

export async function resumeDelayedAutoQuestions() {
  const tickets = loadWhatsAppTickets();
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
  if (!field || field === 'o2Wait' || field === 'o2Sending' || field === 'stadtWait' || field === 'stadtSending') return ticket;

  const replyId = String(message?.interactiveId || '').trim();
  const text = String(message?.text || '').trim();

  if (field === 'o2Kunde') {
    let value = '';
    if (O2_YES.has(replyId) || O2_YES.has(text)) value = 'Ja';
    else if (O2_NO.has(replyId) || O2_NO.has(text)) value = 'Nein';
    else return ticket;
    const dueAt = new Date(Date.now() + QUESTION_PAUSE_MS).toISOString();
    const state = await patchWhatsAppTicket(ticket.id, {
      o2Kunde: value,
      autoQuestionField: 'stadtWait',
      autoQuestionDueAt: dueAt
    });
    const next = ticketFromState(state, ticket.id, ticket.waId)
      || { ...ticket, o2Kunde: value, autoQuestionField: 'stadtWait', autoQuestionDueAt: dueAt };
    scheduleDelayedQuestion(next, DELAYED_QUESTIONS.stadtWait);
    return next;
  }

  if (field === 'stadt') {
    if (STADT_CUSTOM.has(replyId) || STADT_CUSTOM.has(text)) {
      const state = await patchWhatsAppTicket(ticket.id, { autoQuestionField: 'stadtText' });
      const next = ticketFromState(state, ticket.id, ticket.waId) || { ...ticket, autoQuestionField: 'stadtText' };
      return sendStadtTypingPrompt(next);
    }
    let value = '';
    if (STADT_BERLIN.has(replyId) || STADT_BERLIN.has(text)) value = 'Berlin';
    else if (STADT_OUT.has(replyId) || STADT_OUT.has(text)) value = 'außerhalb Berlin';
    else value = stadtForTicket(text) || '';
    if (!value) return ticket;
    const state = await patchWhatsAppTicket(ticket.id, { stadt: value, autoQuestionField: '' });
    return ticketFromState(state, ticket.id, ticket.waId) || ticket;
  }

  if (field === 'stadtText') {
    if (replyId || !text) return ticket;
    const value = (stadtForTicket(text) || text).slice(0, 80);
    const state = await patchWhatsAppTicket(ticket.id, { stadt: value, autoQuestionField: '' });
    return ticketFromState(state, ticket.id, ticket.waId) || ticket;
  }

  return ticket;
}
