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
  findWhatsAppTicket,
  sendWhatsAppText,
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

function messageFromWhatsApp(item) {
  const id = String(item?.id || `in-${Date.now()}`);
  const ts = Number(item?.timestamp);
  const at = Number.isFinite(ts) ? new Date(ts * 1000).toISOString() : new Date().toISOString();
  const type = String(item?.type || 'text');
  let text = '';
  if (type === 'text') text = String(item?.text?.body || '').trim();
  else if (type === 'image') text = String(item?.image?.caption || '').trim() || '[Bild]';
  else if (type === 'audio' || type === 'voice') text = '[Sprachnachricht]';
  else if (type === 'video') text = String(item?.video?.caption || '').trim() || '[Video]';
  else if (type === 'document') text = String(item?.document?.filename || item?.document?.caption || '[Datei]').trim();
  else if (type === 'sticker') text = '[Sticker]';
  else if (type === 'location') text = '[Standort]';
  else text = `[${type}]`;
  return {
    id,
    from: 'customer',
    text,
    at,
    waType: type
  };
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
        const message = messageFromWhatsApp(item);
        if (!message.text) continue;
        const state = await upsertIncomingMessage({ waId, name, message });
        const ticket = (state?.tickets || []).find((t) => t.waId === waId);
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
  if (!text) return res.status(400).json({ success: false, message: 'Kein Text.' });
  try {
    const waMessageId = await sendWhatsAppText(ticket.waId, text);
    const message = {
      id: waMessageId,
      from: 'agent',
      authorName: String(req.body?.authorName || req.user?.name || 'Zentrale').trim(),
      text,
      at: new Date().toISOString()
    };
    const state = await appendOutgoingMessage(ticket.id, message, {
      mitarbeiterName: message.authorName
    });
    const next = (state?.tickets || []).find((t) => t.id === ticket.id) || { ...ticket, messages: [...(ticket.messages || []), message] };
    req.app.get('io')?.emit('whatsapp:inbox', next);
    return res.json({ success: true, ticket: next });
  } catch (err) {
    return res.status(err?.status === 400 ? 400 : 502).json({
      success: false,
      message: err?.detail || 'WhatsApp-Nachricht konnte nicht gesendet werden.'
    });
  }
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
