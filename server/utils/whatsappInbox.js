import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getDataDir } from './filePersistence.js';
import { readJsonStore, updateJsonStore } from './jsonClusterStore.js';

const FILE = 'whatsapp-inbox.json';
const DEFAULT = () => ({ tickets: [] });
const MEDIA_DIR = () => path.join(getDataDir(), 'uploads', 'whatsapp');

export const FIRST_CUSTOMER_AUTO_REPLY = `أهلاً بك في AZ Handy Berlin! 
استلمنا رسالتك، وسيرد عليك أحد زملائنا شخصياً بأقرب وقت خلال ساعات العمل.

📞 للاستفسارات : 03076767089
🕙 الإثنين–السبت: 10 صباحاً–6 مساءً

📍 فروعنا في برلين:
Sonnenallee 16, 12047
Karl-Marx-Straße 50, 12043
Karl-Marx-Straße 127, 12043
Karl-Marx-Straße 169, 12043
Badstraße 12, 13357
Turmstraße 47, 10551
Hauptstraße 156, 10827

🌐 أحدث عروضنا:
az-handy.berlin

شكراً جزيلاً، يسعدنا مساعدتك! 🌟`;

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
  if (m.includes('jpeg') || m.includes('jpg')) return '.jpg';
  if (m.includes('png')) return '.png';
  if (m.includes('webp')) return '.webp';
  if (m.includes('gif')) return '.gif';
  if (m.includes('ogg')) return '.ogg';
  if (m.includes('mpeg') || m.includes('mp3')) return '.mp3';
  if (m.includes('mp4') || m.includes('m4a') || m.includes('aac')) return '.m4a';
  if (m.includes('webm')) return '.webm';
  if (m.includes('wav')) return '.wav';
  if (m.includes('amr')) return '.amr';
  return fallback;
}

function parseDataUrl(src) {
  const raw = String(src || '').trim();
  const match = raw.match(/^data:([^;,]+);base64,(.+)$/i);
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
  const ext = extForMime(mime, kind === 'audio' ? '.ogg' : '.jpg');
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
  const bytes = Uint8Array.from(buffer);
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
  if (!res.ok || !payload?.id) throw graphError(payload, 'whatsapp_media');
  return String(payload.id);
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
      'welcomeAutoSent'
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

export async function sendWhatsAppText(toWaId, text) {
  return sendGraphMessage({
    to: normalizeWaId(toWaId),
    type: 'text',
    text: { body: String(text || '').trim(), preview_url: true }
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
  if (mime === 'audio/ogg' || mime === 'audio/opus') return 'audio/ogg';
  if (mime === 'audio/mpeg' || mime === 'audio/mp3') return 'audio/mpeg';
  if (mime === 'audio/mp4' || mime === 'audio/aac' || mime === 'audio/m4a') return 'audio/mp4';
  if (mime === 'audio/amr') return 'audio/amr';
  if (mime === 'audio/webm') return 'audio/ogg';
  return mime || (kind === 'audio' ? 'audio/ogg' : 'image/jpeg');
}

export async function sendOutgoingParts(toWaId, { text = '', images = [], voices = [] } = {}) {
  const sent = [];
  const body = String(text || '').trim();
  const pics = (Array.isArray(images) ? images : []).filter((img) => img && (img.src || img.url));
  const audios = (Array.isArray(voices) ? voices : []).filter((voice) => voice && (voice.src || voice.url));
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
    const mime = uploadMime(parsed.mime, 'audio');
    const mediaId = await uploadWhatsAppMedia(parsed.buffer, mime, `audio${extForMime(mime, '.ogg')}`);
    const id = await sendWhatsAppAudio(toWaId, mediaId);
    const saved = saveBuffer(parsed.buffer, mime, 'audio');
    sent.push({
      id,
      from: 'agent',
      text: '',
      voices: [{
        id: saved.id,
        src: String(voice.src || '').startsWith('data:') ? voice.src : saved.src,
        duration: voice.duration
      }],
      at: new Date().toISOString()
    });
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
    const waMessageId = await sendWhatsAppText(ticket.waId, FIRST_CUSTOMER_AUTO_REPLY);
    const state = await appendOutgoingMessage(ticket.id, {
      id: waMessageId,
      from: 'agent',
      auto: 'welcome',
      locale: 'ar',
      text: FIRST_CUSTOMER_AUTO_REPLY,
      at: new Date().toISOString()
    }, { keepUnread: true, welcomeAutoSent: true });
    return ticketFromState(state, ticket.id, ticket.waId) || ticket;
  } catch (err) {
    console.warn('[whatsapp] welcome', err?.detail || err?.message || err);
    return ticket;
  }
}
