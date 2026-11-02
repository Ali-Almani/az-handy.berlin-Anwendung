import { readJsonStore, updateJsonStore } from './jsonClusterStore.js';

const FILE = 'whatsapp-inbox.json';
const DEFAULT = () => ({ tickets: [] });

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
    mitarbeiterName: '',
    createdAt: at,
    messages: []
  };
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
    }
    return { value: { tickets: state.tickets } };
  });
}

export async function appendOutgoingMessage(ticketId, message, extra = {}) {
  return mutateWhatsAppTickets((state) => {
    const ticket = state.tickets.find((t) => t.id === ticketId);
    if (!ticket) return { value: { tickets: state.tickets } };
    ticket.messages = [...(ticket.messages || []), message];
    ticket.unread = false;
    if (extra.mitarbeiterName) ticket.mitarbeiterName = extra.mitarbeiterName;
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
      'terminDatum', 'terminZeit', 'nachrichtArt', 'mitarbeiterName', 'priority'
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

export function findWhatsAppTicket(ticketId) {
  return loadWhatsAppTickets().find((t) => t.id === ticketId) || null;
}

export async function sendWhatsAppText(toWaId, text) {
  const token = whatsappToken();
  const phoneId = whatsappPhoneNumberId();
  const version = whatsappGraphVersion();
  const url = `https://graph.facebook.com/${version}/${encodeURIComponent(phoneId)}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalizeWaId(toWaId),
      type: 'text',
      text: { body: String(text || '').trim(), preview_url: true }
    })
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(payload?.error?.message || 'whatsapp_send');
    err.status = res.status;
    err.detail = String(payload?.error?.message || '').slice(0, 180);
    throw err;
  }
  return String(payload?.messages?.[0]?.id || `wa-out-${Date.now()}`);
}
