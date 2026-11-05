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
  deleteStoredMessageById,
  deleteCloudMessage,
  findWhatsAppTicket,
  findTicketInState,
  sendOutgoingParts,
  sendOutgoingSavedFile,
  sendWelcomeIfNeeded,
  handleAutoQuestionReply,
  downloadWhatsAppMedia,
  resolveWhatsAppFile,
  normalizeWaId
} from '../utils/whatsappInbox.js';
import { loadAutoQuestionFlow, saveAutoQuestionFlow } from '../utils/autoQuestionFlow.js';
import fs from 'fs';
import path from 'path';

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

async function requireTicketingManager(req, res) {
  const userId = req.user?.userId ?? req.user?.id;
  if (!userId) {
    res.status(403).json({ success: false, message: 'Kein Zugriff auf das Ticketing-System.' });
    return false;
  }
  try {
    const u = await User.findByPk(normalizeUserId(userId) ?? userId);
    const role = roleText(u);
    if (isAdminRole(role) || isTeamleiterSocialMediaRole(role)) return true;
  } catch {
    /* kein Zugriff */
  }
  res.status(403).json({ success: false, message: 'Kein Zugriff auf das Ticketing-System.' });
  return false;
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
    videos: [],
    files: [],
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
    const media = item?.video || {};
    message.text = String(media.caption || '').trim();
    const saved = await downloadWhatsAppMedia(media.id, 'video');
    if (saved?.src) message.videos = [{ id: saved.id, src: saved.src, name: 'video.mp4' }];
    else if (!message.text) message.text = '[Video]';
  } else if (type === 'document') {
    const media = item?.document || {};
    message.text = String(media.caption || '').trim();
    const saved = await downloadWhatsAppMedia(media.id, 'document');
    if (saved?.src) {
      message.files = [{
        id: saved.id,
        src: saved.src,
        name: String(media.filename || 'Datei').trim() || 'Datei',
        mime: saved.mime
      }];
    } else if (!message.text) {
      message.text = String(media.filename || '[Datei]').trim();
    }
  } else if (type === 'interactive') {
    const interactive = item?.interactive || {};
    const reply = interactive.button_reply || interactive.list_reply || {};
    message.text = String(reply.title || '').trim();
    message.interactiveId = String(reply.id || '').trim();
  } else if (type === 'location') {
    message.text = '[Standort]';
  } else if (type === 'reaction' || type === 'unsupported') {
    return null;
  } else {
    message.text = `[${type}]`;
  }
  if (
    !message.text
    && !message.interactiveId
    && !(message.images || []).length
    && !(message.voices || []).length
    && !(message.videos || []).length
    && !(message.files || []).length
  ) return null;
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
        if (String(item?.type || '') === 'revoke') {
          const originalId = String(item?.revoke?.original_message_id || '').trim();
          if (!originalId) continue;
          const revoked = await deleteStoredMessageById(originalId);
          if (io) revoked.forEach((ticket) => io.emit('whatsapp:inbox', ticket));
          continue;
        }
        const name = String(contacts.find((c) => normalizeWaId(c.wa_id) === waId)?.profile?.name || '').trim();
        const message = await messageFromWhatsApp(item);
        if (!message) continue;
        const state = await upsertIncomingMessage({ waId, name, message });
        let ticket = findTicketInState(state, null, waId);
        const wasWelcomed = Boolean(ticket?.welcomeAutoSent);
        ticket = await sendWelcomeIfNeeded(ticket);
        if (wasWelcomed) {
          ticket = await handleAutoQuestionReply(ticket, message);
        }
        if (ticket && io) io.emit('whatsapp:inbox', ticket);
      }
      const statuses = Array.isArray(value.statuses) ? value.statuses : [];
      for (const status of statuses) {
        const statusName = String(status?.status || '').toLowerCase();
        if (statusName !== 'deleted' && statusName !== 'revoked') continue;
        const wamid = String(status?.id || '').trim();
        if (!wamid) continue;
        const tickets = await deleteStoredMessageById(wamid);
        if (io) {
          tickets.forEach((ticket) => io.emit('whatsapp:inbox', ticket));
        }
      }
    }
  }
}

function mimeFromExtension(full) {
  const ext = path.extname(full).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.ogg') return 'audio/ogg';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.webm') return 'audio/webm';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.mp4' || ext === '.mov') return 'video/mp4';
  if (ext === '.3gp') return 'video/3gpp';
  if (ext === '.m4a') return 'audio/mp4';
  return 'application/octet-stream';
}

/** iOS braucht den echten Typ: alte Videos wurden als .m4a gespeichert (audio/mp4) und spielen dann nicht. */
function sniffWhatsAppFileMime(full) {
  try {
    const fd = fs.openSync(full, 'r');
    const buf = Buffer.alloc(16);
    const n = fs.readSync(fd, buf, 0, 16, 0);
    fs.closeSync(fd);
    if (n >= 12 && buf.toString('ascii', 4, 8) === 'ftyp') {
      const brand = buf.toString('ascii', 8, 12);
      if (brand === 'M4A ' || brand === 'M4B ' || brand === 'M4P ') return 'audio/mp4';
      if (brand.startsWith('3gp')) return 'video/3gpp';
      return 'video/mp4';
    }
  } catch {
    /* Dateiendung */
  }
  return mimeFromExtension(full);
}

export function serveWhatsAppFile(req, res) {
  const full = resolveWhatsAppFile(req.params.name);
  if (!full) return res.sendStatus(404);
  const mime = sniffWhatsAppFileMime(full);
  return res.sendFile(full, {
    acceptRanges: true,
    headers: {
      'Content-Type': mime,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=86400',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    }
  }, (err) => {
    if (!err || res.headersSent) return;
    res.sendStatus(err.status || err.statusCode || 404);
  });
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
  const files = Array.isArray(req.body?.files) ? req.body.files : [];
  if (!text && !images.length && !voices.length && !files.length) {
    return res.status(400).json({ success: false, message: 'Kein Text, Bild, Datei oder Sprache.' });
  }
  const authorName = String(req.body?.authorName || req.user?.name || 'Zentrale').trim();
  try {
    const sent = await sendOutgoingParts(ticket.waId, { text, images, voices, files });
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
    console.warn('[whatsapp] send', err?.detail || err?.message || err);
    return res.status(err?.status === 400 ? 400 : 502).json({
      success: false,
      message: err?.detail || err?.message || 'WhatsApp-Nachricht konnte nicht gesendet werden.'
    });
  }
}

export async function sendWhatsAppTicketMedia(req, res) {
  if (!(await requireTicketingAccess(req, res))) return;
  if (!whatsappConfigured()) {
    return res.status(503).json({ success: false, message: 'WhatsApp ist nicht eingerichtet.' });
  }
  const ticket = findWhatsAppTicket(req.params.id);
  if (!ticket) return res.status(404).json({ success: false, message: 'Chat nicht gefunden.' });
  if (!req.file?.path) {
    return res.status(400).json({ success: false, message: 'Keine Datei empfangen.' });
  }
  const text = String(req.body?.text ?? '').trim();
  const authorName = String(req.body?.authorName || req.user?.name || 'Zentrale').trim();
  const kind = String(req.body?.kind || '').trim();
  try {
    const part = await sendOutgoingSavedFile(ticket.waId, {
      filePath: req.file.path,
      mime: req.file.mimetype,
      name: req.file.originalname || req.file.filename,
      kind,
      text
    });
    const message = { ...part, authorName };
    const state = await appendOutgoingMessage(ticket.id, message, { mitarbeiterName: authorName });
    const next = findTicketInState(state, ticket.id) || findWhatsAppTicket(ticket.id);
    req.app.get('io')?.emit('whatsapp:inbox', next);
    return res.json({ success: true, ticket: next });
  } catch (err) {
    return res.status(err?.status === 400 ? 400 : 502).json({
      success: false,
      message: err?.detail || 'WhatsApp-Datei konnte nicht gesendet werden.'
    });
  }
}

export async function deleteWhatsAppMessageHandler(req, res) {
  if (!(await requireTicketingAccess(req, res))) return;
  const ticket = findWhatsAppTicket(req.params.id);
  if (!ticket) return res.status(404).json({ success: false, message: 'Chat nicht gefunden.' });
  const messageId = String(req.body?.messageId || req.params.messageId || '').trim();
  const message = (ticket.messages || []).find((m) => m.id === messageId);
  if (!message) return res.status(404).json({ success: false, message: 'Nachricht nicht gefunden.' });
  if (message.from !== 'agent') {
    return res.status(400).json({ success: false, message: 'Nur eigene Nachrichten können gelöscht werden.' });
  }
  const sentToWhatsApp = messageId.startsWith('wamid.');
  const cloudDeleted = sentToWhatsApp ? await deleteCloudMessage(messageId) : true;
  if (sentToWhatsApp && !cloudDeleted) {
    return res.json({
      success: true,
      cloudDeleted: false,
      ticket,
      message: 'Bei WhatsApp ging das Löschen nicht (nur eigene Nachrichten, max. 2 Tage). Die Nachricht bleibt im Chat.'
    });
  }
  const state = await deleteStoredMessage(ticket.id, messageId);
  const next = findTicketInState(state, ticket.id) || { ...ticket, messages: (ticket.messages || []).filter((m) => m.id !== messageId) };
  req.app.get('io')?.emit('whatsapp:inbox', next);
  return res.json({ success: true, cloudDeleted: true, ticket: next });
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

export async function getAutoQuestionFlowHandler(req, res) {
  if (!(await requireTicketingAccess(req, res))) return;
  return res.json({ success: true, flow: loadAutoQuestionFlow() });
}

export async function saveAutoQuestionFlowHandler(req, res) {
  if (!(await requireTicketingManager(req, res))) return;
  const { flow, error } = saveAutoQuestionFlow(req.body?.flow || req.body || {});
  if (error) return res.status(400).json({ success: false, message: error });
  return res.json({ success: true, flow });
}
