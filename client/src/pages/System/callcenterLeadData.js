import { normalizeVorvertragTicketStatus, VORVERTRAG_TICKET_STATUS_DEFAULT } from './vorvertragTicketStatus';

export const LEAD_STATUS_OPTIONS = ['Orten', 'Callcenter'];
export const LEAD_STATUS_DEFAULT = 'Callcenter';

export const LEAD_O2_OPTIONS = ['Ja', 'Nein'];

export const LEAD_ANGEBOT_OPTIONS = [
  'Gold',
  'Sonstiges',
  'S26 Ultra',
  'IP 17 Pro Max',
  'DSL',
  'SIM Only'
];

export const LEAD_STADT_OPTIONS = [
  'Berlin',
  'Brandenburg',
  'außerhalb Berlin',
  'Bayern',
  'Baden-Württemberg'
];

export const ORTEN_SHOP_OPTIONS = [
  'Sonnenallee 16',
  'Karl-Marx-Straße 50',
  'Karl-Marx-Straße 169',
  'Karl-Marx-Straße 127',
  'Badstraße 12',
  'Turmstraße 47',
  'Hauptstraße 156'
];

export const NACHRICHT_ART_OPTIONS = [
  { id: 'angebot', label: 'Angebot' },
  { id: 'beschwerde', label: 'Beschwerde' },
  { id: 'allgemeineInfo', label: 'Allgemeine Info' }
];

export const SOCIAL_CHANNELS = [
  { id: 'facebook', label: 'Facebook', short: 'FB' },
  { id: 'instagram', label: 'Instagram', short: 'IG' },
  { id: 'tiktok', label: 'TikTok', short: 'TT' }
];

export const TEMPLATE_QUESTIONS = [
  { field: 'rufnummer', label: 'Rufnummer?', text: 'Wie lautet Ihre Rufnummer?' },
  { field: 'o2Kunde', label: 'O2 Kunde?', text: 'Sind Sie bereits O2-Kunde?' },
  { field: 'angebot', label: 'Angebot / Produkt?', text: 'Welches Angebot oder Produkt möchten Sie?' },
  { field: 'produktNotiz', label: 'Produkt Notiz?', text: 'Gibt es eine Produkt-Notiz (z. B. Tarif, Modell)?' },
  { field: 'stadt', label: 'Stadt?', text: 'In welcher Stadt sind Sie?' },
  { field: 'marketingNotiz', label: 'Marketing Notiz?', text: 'Gibt es eine Marketing-Notiz oder Empfehlung?' },
  { field: 'terminDatum', label: 'Termin Datum?', text: 'An welchem Datum passt Ihnen ein Termin?' },
  { field: 'terminZeit', label: 'Termin Zeit?', text: 'Zu welcher Uhrzeit passt Ihnen der Termin?' }
];

export const LEAD_STORAGE_KEY = 'az-callcenter-inbox-v2';
export const INBOX_NOTE_STORAGE_KEY = 'az-callcenter-inbox-notiz';

const STATUS_ALIASES = {
  orten: 'Orten',
  callcenter: 'Callcenter'
};

export function normalizeLeadStatus(value) {
  const v = String(value ?? '').trim();
  if (LEAD_STATUS_OPTIONS.includes(v)) return v;
  return STATUS_ALIASES[v.toLowerCase()] || '';
}

export function normalizeNachrichtArt(value) {
  const v = String(value ?? '').trim();
  if (NACHRICHT_ART_OPTIONS.some((o) => o.id === v)) return v;
  const byLabel = NACHRICHT_ART_OPTIONS.find(
    (o) => o.label.toLowerCase() === v.toLowerCase()
  );
  return byLabel?.id || '';
}

export function nachrichtArtLabel(value) {
  const id = normalizeNachrichtArt(value);
  return NACHRICHT_ART_OPTIONS.find((o) => o.id === id)?.label || '';
}

export function isLeadEntry(entry) {
  return entry?.source === 'lead';
}

export function migrateLeadTicketStatus(value) {
  if (normalizeLeadStatus(value)) return VORVERTRAG_TICKET_STATUS_DEFAULT;
  return normalizeVorvertragTicketStatus(value);
}

export function isLeadArchived(entry) {
  return migrateLeadTicketStatus(entry?.ticketStatus) === 'Erledigt';
}

export function isLeadInNeu(entry) {
  return !isLeadArchived(entry);
}

export function leadStatusBadge(status) {
  return normalizeLeadStatus(status) === 'Orten' ? 'orten' : 'callcenter';
}

export function emptyLeadForm() {
  return {
    rufnummer: '',
    o2Kunde: '',
    angebot: '',
    produktNotiz: '',
    stadt: '',
    marketingNotiz: '',
    terminDatum: '',
    terminZeit: '',
    shop: '',
    ticketStatus: VORVERTRAG_TICKET_STATUS_DEFAULT,
    nachrichtArt: ''
  };
}

export function formFromLead(entry) {
  return {
    rufnummer: entry?.rufnummer || '',
    o2Kunde: entry?.o2Kunde === 'Ja' || entry?.o2Kunde === 'Nein' ? entry.o2Kunde : '',
    angebot: entry?.angebot || '',
    produktNotiz: entry?.produktNotiz || '',
    stadt: entry?.stadt || '',
    marketingNotiz: entry?.marketingNotiz || '',
    terminDatum: entry?.terminDatum || '',
    terminZeit: entry?.terminZeit || '',
    shop: entry?.shop || '',
    ticketStatus: migrateLeadTicketStatus(entry?.ticketStatus),
    nachrichtArt: normalizeNachrichtArt(entry?.nachrichtArt)
  };
}

export function shopOptionsForOrten() {
  return [...ORTEN_SHOP_OPTIONS];
}

export function shopFitsOrten(shop) {
  return ORTEN_SHOP_OPTIONS.includes(String(shop ?? '').trim());
}

export function shopOptionLabel(shop) {
  const s = String(shop ?? '').trim();
  if (s === 'Sonnenallee 16') return 'Sonnenallee';
  return s;
}

const INVALID_MITARBEITER_NAMES = new Set([
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
  'Mitarbeiter',
  'Zentrale',
  'Büro Zentrale'
]);

export function sanitizeMitarbeiterName(value) {
  const v = String(value ?? '').trim();
  if (!v) return '';
  if (INVALID_MITARBEITER_NAMES.has(v)) return '';
  if (/^mitarbeiter(\s|$)/i.test(v)) return '';
  if (/^büro(\s|$)/i.test(v)) return '';
  if (ORTEN_SHOP_OPTIONS.includes(v)) return '';
  return v;
}

export function lastMessageAt(ticket) {
  const last = ticket?.messages?.[ticket.messages.length - 1];
  return last?.at || ticket?.createdAt || '';
}

export function countUnreadLeadTickets(tickets) {
  return (tickets || []).filter((t) => t.unread).length;
}

function pad3(n) {
  return String(n).padStart(3, '0');
}

function dateStamp(date = new Date()) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear());
  return `${d}${m}${y}`;
}

export function normalizeSocialChannel(value) {
  const v = String(value ?? '').trim().toLowerCase();
  if (v === 'instagram' || v === 'ig') return 'instagram';
  if (v === 'tiktok' || v === 'tt') return 'tiktok';
  return 'facebook';
}

export function channelShort(channel) {
  const id = normalizeSocialChannel(channel);
  return SOCIAL_CHANNELS.find((c) => c.id === id)?.short || 'FB';
}

export function channelLabel(channel) {
  const id = normalizeSocialChannel(channel);
  return SOCIAL_CHANNELS.find((c) => c.id === id)?.label || 'Facebook';
}

export function migrateLeadId(ticket) {
  const channel = normalizeSocialChannel(ticket?.channel);
  const short = channelShort(channel);
  const id = String(ticket?.id || '');
  const match = id.match(/^(CC|WA|FB|IG|TT)-(\d{8})-(\d+)$/i);
  if (!match) return id;
  return `${short}-${match[2]}-${pad3(Number.parseInt(match[3], 10))}`;
}

export function nextLeadId(tickets = [], date = new Date(), channel = 'facebook') {
  const prefix = `${channelShort(channel)}-${dateStamp(date)}-`;
  let max = 0;
  tickets.forEach((t) => {
    const id = String(t?.id || '');
    if (!id.startsWith(prefix)) return;
    const n = Number.parseInt(id.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  });
  return `${prefix}${pad3(max + 1)}`;
}

const SEED_LEADS = [
  {
    id: 'FB-31082026-001',
    channel: 'facebook',
    customerName: 'Fatima Kaya',
    handle: '+49 176 8821 4410',
    rufnummer: '+49 176 8821 4410',
    o2Kunde: 'Ja',
    angebot: 'Gold',
    produktNotiz: '10 in 1',
    stadt: 'Berlin',
    marketingNotiz: '',
    terminDatum: '',
    terminZeit: '',
    shop: 'Karl-Marx-Straße 50',
    ticketStatus: 'Callcenter',
    nachrichtArt: 'angebot',
    unread: true,
    mitarbeiterName: '',
    createdAt: '2026-08-31T08:10:00.000Z',
    messages: [
      {
        id: 'cc-001-1',
        from: 'customer',
        text: 'Hallo, ich interessiere mich für das Gold-Angebot (10 in 1). Geht das in Berlin?',
        at: '2026-08-31T08:10:00.000Z'
      }
    ]
  },
  {
    id: 'IG-31082026-002',
    channel: 'instagram',
    customerName: 'Mehmet Özdemir',
    handle: '@mehmet.oz',
    rufnummer: '',
    o2Kunde: 'Nein',
    angebot: 'Sonstiges',
    produktNotiz: 'MacBookNeo13',
    stadt: 'Brandenburg',
    marketingNotiz: '',
    terminDatum: '',
    terminZeit: '',
    shop: 'Sonnenallee 16',
    ticketStatus: 'Orten',
    nachrichtArt: 'angebot',
    unread: true,
    mitarbeiterName: '',
    createdAt: '2026-08-31T08:18:00.000Z',
    messages: [
      {
        id: 'cc-002-1',
        from: 'customer',
        text: 'Hi, habt ihr das MacBook Neo 13 noch? Ich komme aus Brandenburg.',
        at: '2026-08-31T08:18:00.000Z'
      }
    ]
  },
  {
    id: 'FB-31082026-003',
    channel: 'facebook',
    customerName: 'Lisa Weber',
    handle: '+49 163 5512 9088',
    rufnummer: '+49 163 5512 9088',
    o2Kunde: 'Ja',
    angebot: 'S26 Ultra',
    produktNotiz: 'S26',
    stadt: 'außerhalb Berlin',
    marketingNotiz: '',
    terminDatum: '',
    terminZeit: '',
    shop: 'Karl-Marx-Straße 169',
    ticketStatus: 'Callcenter',
    nachrichtArt: 'allgemeineInfo',
    unread: false,
    mitarbeiterName: '',
    createdAt: '2026-08-31T08:25:00.000Z',
    messages: [
      {
        id: 'cc-003-1',
        from: 'customer',
        text: 'S26 Ultra noch da? Ich wohne außerhalb von Berlin.',
        at: '2026-08-31T08:25:00.000Z'
      },
      {
        id: 'cc-003-2',
        from: 'agent',
        authorName: 'Büro Zentrale',
        text: 'Guten Tag, wir prüfen das und legen Ihnen gern einen Termin an. Welcher Shop passt?',
        at: '2026-08-31T08:32:00.000Z'
      }
    ]
  },
  {
    id: 'TT-31082026-004',
    channel: 'tiktok',
    customerName: 'Nisa Yildiz',
    handle: '@nisa.shop',
    rufnummer: '',
    o2Kunde: 'Ja',
    angebot: 'IP 17 Pro Max',
    produktNotiz: '17ProMax',
    stadt: 'Berlin',
    marketingNotiz: '',
    terminDatum: '',
    terminZeit: '',
    shop: 'Sonnenallee 16',
    ticketStatus: 'Orten',
    nachrichtArt: 'angebot',
    unread: true,
    mitarbeiterName: '',
    createdAt: '2026-08-31T08:40:00.000Z',
    messages: [
      {
        id: 'cc-004-1',
        from: 'customer',
        text: 'Unter eurem Video: iPhone 17 Pro Max – könnt ihr in Berlin reservieren?',
        at: '2026-08-31T08:40:00.000Z'
      }
    ]
  },
  {
    id: 'FB-31082026-005',
    channel: 'facebook',
    customerName: 'Kai Hartmann',
    handle: '+49 157 3340 2291',
    rufnummer: '',
    o2Kunde: 'Nein',
    angebot: 'DSL',
    produktNotiz: 'dsl',
    stadt: 'Bayern',
    marketingNotiz: '',
    terminDatum: '',
    terminZeit: '',
    shop: 'Karl-Marx-Straße 127',
    ticketStatus: 'Callcenter',
    nachrichtArt: 'beschwerde',
    unread: true,
    mitarbeiterName: '',
    createdAt: '2026-08-31T09:05:00.000Z',
    messages: [
      {
        id: 'cc-005-1',
        from: 'customer',
        text: 'Geht bei euch auch DSL, wenn ich in Bayern bin?',
        at: '2026-08-31T09:05:00.000Z'
      }
    ]
  },
  {
    id: 'IG-31082026-006',
    channel: 'instagram',
    customerName: 'Sara Müller',
    handle: '@sara.mueller.bln',
    rufnummer: '',
    o2Kunde: 'Ja',
    angebot: 'SIM Only',
    produktNotiz: '10in1 Deal 40€ mtl.',
    stadt: 'Baden-Württemberg',
    marketingNotiz: 'weil er seine bekannte zu uns',
    terminDatum: '',
    terminZeit: '',
    shop: 'Hauptstraße 156',
    ticketStatus: 'Orten',
    nachrichtArt: 'allgemeineInfo',
    unread: false,
    mitarbeiterName: '',
    createdAt: '2026-08-31T09:20:00.000Z',
    messages: [
      {
        id: 'cc-006-1',
        from: 'customer',
        text: 'SIM Only 10in1 Deal 40€ – eine Bekannte hat euch empfohlen. Wann Termin?',
        at: '2026-08-31T09:20:00.000Z'
      }
    ]
  }
];

function cloneSeed() {
  return JSON.parse(JSON.stringify(SEED_LEADS));
}

export function leadToNeuEntry(lead) {
  const channel = normalizeSocialChannel(lead.channel);
  return {
    id: migrateLeadId({ ...lead, channel }),
    source: 'lead',
    channel,
    customerName: lead.customerName,
    handle: lead.handle,
    rufnummer: lead.rufnummer,
    o2Kunde: lead.o2Kunde,
    angebot: lead.angebot,
    produktNotiz: lead.produktNotiz,
    stadt: lead.stadt,
    marketingNotiz: lead.marketingNotiz,
    terminDatum: lead.terminDatum,
    terminZeit: lead.terminZeit,
    shop: lead.shop,
    filiale: lead.shop,
    kundeVorname: lead.customerName || lead.rufnummer || lead.angebot || 'Nachricht',
    kundeNachname: '',
    datum: lead.terminDatum || String(lead.createdAt || '').slice(0, 10),
    ticketStatus: migrateLeadTicketStatus(lead.ticketStatus),
    nachrichtArt: normalizeNachrichtArt(lead.nachrichtArt),
    mitarbeiterName: sanitizeMitarbeiterName(lead.mitarbeiterName)
  };
}

function hydrateLeadTicket(t) {
  const channel = normalizeSocialChannel(t?.channel);
  const withChannel = { ...t, channel };
  return {
    ...emptyLeadForm(),
    ...withChannel,
    id: migrateLeadId(withChannel),
    channel,
    messages: Array.isArray(t?.messages) ? t.messages : [],
    ticketStatus: migrateLeadTicketStatus(t?.ticketStatus),
    nachrichtArt: normalizeNachrichtArt(t?.nachrichtArt),
    shop: t?.shop || '',
    mitarbeiterName: sanitizeMitarbeiterName(t?.mitarbeiterName)
  };
}

export function loadLeadTickets() {
  try {
    const raw = localStorage.getItem(LEAD_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(hydrateLeadTicket);
      }
    }
  } catch {
    /* Store ungültig – Seed verwenden */
  }
  return cloneSeed().map(hydrateLeadTicket);
}

export function saveLeadTickets(tickets) {
  try {
    localStorage.setItem(LEAD_STORAGE_KEY, JSON.stringify(tickets));
  } catch {
    /* Quota / privater Modus */
  }
}

export function loadInboxNotiz() {
  try {
    return String(localStorage.getItem(INBOX_NOTE_STORAGE_KEY) || '');
  } catch {
    return '';
  }
}

export function saveInboxNotiz(text) {
  try {
    localStorage.setItem(INBOX_NOTE_STORAGE_KEY, String(text ?? ''));
  } catch {
    /* Quota / privater Modus */
  }
}
