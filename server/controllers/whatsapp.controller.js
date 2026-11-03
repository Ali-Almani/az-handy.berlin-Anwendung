import crypto from 'crypto';
import User from '../models/User.js';
import { normalizeUserId } from '../utils/normalizeUserId.js';
import {
  whatsappAppSecret,
  whatsappVerifyToken,
  whatsappConfigured,
  loadWhatsAppTickets,
  upsertIncomingMessage,
  appendOutgoingMessage,
  patchWhatsAppTicket,
  deleteWhatsAppTicket,
  deleteStoredMessage,
  deleteCloudMessage,
  findWhatsAppTicket,
  findTicketInState,
  sendOutgoingParts,
  sendWelcomeIfNeeded,
  downloadWhatsAppMedia,
  normalizeWaId
} from '../utils/whatsappInbox.js';

function roleText(user) {
  return String(user?.role ?? user?.get?.('role') ?? user?.dataValues?.role ?? '')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function isAdminRole(role) {
  const r = String(role || '').trim();
  return r === 'Administrator' || r === 'admin' || r.toLowerCase().includes('admin');
}

function isTeamleiterSocialMediaRole(role) {
  const k = String(role || '')
    .replace(/\u00a0/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ');
  return k === 'teamleiter social media' || (k.includes('teamleiter') && k.includes('social media'));
}

function isSocialMediaRole(role) {
  const k = String(role || '')
    .replace(/\u00a0/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ');
  return k === 'mitarbeiter social media' || k === 'social media';
}

async function canAccessTicketing(userId) {
  if (!userId) return false;
  try {
    const u = await User.findByPk(normalizeUserId(userId) ?? userId);
    if (!u) return false;
    const role = roleText(u);
    return isAdminRole(role) || isTeamleiterSocialMediaRole(role) || isSocialMediaRole(role);
  } catch {
    return false;
  }
}

async function requireTicketingAccess(req, res) {
  const ok = await canAccessTicketing(req.user?.userId ?? req.user?.id);
  if (!ok) {
    res.status(403).json({ success: false, message: 'Kein Zugriff auf das Ticketing-System.' });
    return false;
  }
  return true;
}

export function verifyWhatsAppSignature(req) {
  const secret = whatsappAppSecret();
  if (!secret) {
    console.warn('[whatsapp] WHATSAPP_APP_SECRET fehlt – Webhook ohne Signaturprüfung');
    return true;
  }
  const header = String(req.get('x-hub-signature-256') || '');
  const raw = req.rawBody;
  if (!header || !raw || !Buffer.isBuffer(raw)) return false;
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(raw).digest('hex')}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function verifyWhatsAppWebhook(req, res) {
  const mode = String(req.query['hub.mode'] || '');
  const token = String(req.query['hub.verify_token'] || '');
  const challenge = String(req.query['hub.challenge'] || '');
  const expected = whatsappVerifyToken();
  if (mode === 'subscribe' && expected && token === expected) {
    return res.status(200).type('text/plain').send(challenge);
  }
  return res.sendStatus(403);
}

async function messageFromWhatsApp(item) {
  const id = String(item?.id || `in-${Date.now()}`);
  const ts = Number(item?.timestamp);
  const at = Number.isFinite(ts) ? new Date(ts * 1000).toISOString() : new Date().toISOString();
  const type = String(item?.type || 'text');
  const message = {
    id,
    from: 'customer',
    text: '',
    images: [],
    voices: [],
    at,
    waType: type
  };
  if (type === 'text') {
    message.text = String(item?.text?.body || '').trim();
  } else if (type === 'image' || type === 'sticker') {
    const media = item?.image || item?.sticker || {};
    message.text = String(media.caption || '').trim();
    const saved = await downloadWhatsAppMedia(media.id, 'image');
    if (saved?.src) message.images = [{ id: saved.id, src: saved.src }];
    else if (!message.text) message.text = '[Bild]';
  } else if (type === 'audio' || type === 'voice') {
    const media = item?.audio || item?.voice || {};
    const saved = await downloadWhatsAppMedia(media.id, 'audio');
    if (saved?.src) message.voices = [{ id: saved.id, src: saved.src }];
    else message.text = '[Sprachnachricht]';
  } else if (type === 'video') {
    message.text = String(item?.video?.caption || '').trim() || '[Video]';
  } else if (type === 'document') {
    message.text = String(item?.document?.filename || item?.document?.caption || '[Datei]').trim();
  } else if (type === 'location') {
    message.text = '[Standort]';
  } else if (type === 'reaction' || type === 'unsupported') {
    return null;
  } else {
    message.text = `[${type}]`;
  }
  if (!message.text && !(message.images || []).length && !(message.voices || []).length) return null;
  return message;
}

export async function receiveWhatsAppWebhook(req, io) {
  const body = req.body || {};
  if (body.object && body.object !== 'whatsapp_business_account') return;
  const entries = Array.isArray(body.entry) ? body.entry : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value || {};
      const contacts = Array.isArray(value.contacts) ? value.contacts : [];
      const messages = Array.isArray(value.messages) ? value.messages : [];
      for (const item of messages) {
        const waId = normalizeWaId(item.from);
        if (!waId) continue;
        const name = String(contacts.find((c) => normalizeWaId(c.wa_id) === waId)?.profile?.name || '').trim();
        const message = await messageFromWhatsApp(item);
        if (!message) continue;
        const state = await upsertIncomingMessage({ waId, name, message });
        let ticket = findTicketInState(state, null, waId);
        ticket = await sendWelcomeIfNeeded(ticket);
        if (ticket && io) io.emit('whatsapp:inbox', ticket);
      }
    }
  }
}

export async function handleWhatsAppWebhookPost(req, res) {
  try {
    if (!verifyWhatsAppSignature(req)) return res.sendStatus(403);
  } catch {
    return res.sendStatus(403);
  }
  res.sendStatus(200);
  try {
    await receiveWhatsAppWebhook(req, req.app.get('io'));
  } catch (err) {
    if (err?.status === 403) return;
    console.warn('[whatsapp] webhook', err?.message || err);
  }
}

export async function listWhatsAppTickets(req, res) {
  if (!(await requireTicketingAccess(req, res))) return;
  if (!whatsappConfigured()) {
    return res.json({ success: true, configured: false, tickets: [] });
  }
  return res.json({
    success: true,
    configured: true,
    tickets: loadWhatsAppTickets()
  });
}

export async function sendWhatsAppTicketMessage(req, res) {
  if (!(await requireTicketingAccess(req, res))) return;
  if (!whatsappConfigured()) {
    return res.status(503).json({ success: false, message: 'WhatsApp ist nicht eingerichtet.' });
  }
  const ticket = findWhatsAppTicket(req.params.id);
  if (!ticket) return res.status(404).json({ success: false, message: 'Chat nicht gefunden.' });
  const text = String(req.body?.text ?? '').trim();
  const images = Array.isArray(req.body?.images) ? req.body.images : [];
  const voices = Array.isArray(req.body?.voices) ? req.body.voices : [];
  if (!text && !images.length && !voices.length) {
    return res.status(400).json({ success: false, message: 'Kein Text, Bild oder Sprache.' });
  }
  const authorName = String(req.body?.authorName || req.user?.name || 'Zentrale').trim();
  try {
    const sent = await sendOutgoingParts(ticket.waId, { text, images, voices });
    if (!sent.length) {
      return res.status(400).json({ success: false, message: 'Nichts zu senden.' });
    }
    let next = ticket;
    for (const part of sent) {
      const message = { ...part, authorName };
      const state = await appendOutgoingMessage(ticket.id, message, { mitarbeiterName: authorName });
      next = findTicketInState(state, ticket.id) || next;
    }
    req.app.get('io')?.emit('whatsapp:inbox', next);
    return res.json({ success: true, ticket: next });
  } catch (err) {
    return res.status(err?.status === 400 ? 400 : 502).json({
      success: false,
      message: err?.detail || 'WhatsApp-Nachricht konnte nicht gesendet werden.'
    });
  }
}

export async function deleteWhatsAppMessageHandler(req, res) {
  if (!(await requireTicketingAccess(req, res))) return;
  const ticket = findWhatsAppTicket(req.params.id);
  if (!ticket) return res.status(404).json({ success: false, message: 'Chat nicht gefunden.' });
  const messageId = String(req.params.messageId || '').trim();
  const message = (ticket.messages || []).find((m) => m.id === messageId);
  if (!message) return res.status(404).json({ success: false, message: 'Nachricht nicht gefunden.' });
  if (message.from !== 'agent') {
    return res.status(400).json({ success: false, message: 'Nur eigene Nachrichten können gelöscht werden.' });
  }
  await deleteCloudMessage(messageId);
  const state = await deleteStoredMessage(ticket.id, messageId);
  const next = findTicketInState(state, ticket.id) || { ...ticket, messages: (ticket.messages || []).filter((m) => m.id !== messageId) };
  req.app.get('io')?.emit('whatsapp:inbox', next);
  return res.json({ success: true, ticket: next });
}

export async function patchWhatsAppTicketHandler(req, res) {
  if (!(await requireTicketingAccess(req, res))) return;
  const state = await patchWhatsAppTicket(req.params.id, req.body || {});
  const ticket = (state?.tickets || []).find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ success: false, message: 'Chat nicht gefunden.' });
  req.app.get('io')?.emit('whatsapp:inbox', ticket);
  return res.json({ success: true, ticket });
}

export async function deleteWhatsAppTicketHandler(req, res) {
  if (!(await requireTicketingAccess(req, res))) return;
  await deleteWhatsAppTicket(req.params.id);
  req.app.get('io')?.emit('whatsapp:deleted', { id: req.params.id });
  return res.json({ success: true });
}
