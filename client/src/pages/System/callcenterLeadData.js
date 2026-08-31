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

export const LEAD_EXTRA_SHOPS = ['Kitzingstr. 7-9'];

export const LEAD_STORAGE_KEY = 'az-callcenter-leads-v1';

const STATUS_ALIASES = {
  orten: 'Orten',
  callcenter: 'Callcenter'
};

export function normalizeLeadStatus(value) {
  const v = String(value ?? '').trim();
  if (LEAD_STATUS_OPTIONS.includes(v)) return v;
  return STATUS_ALIASES[v.toLowerCase()] || '';
}

export function isLeadEntry(entry) {
  return entry?.source === 'lead';
}

export function isLeadInNeu(entry) {
  return LEAD_STATUS_OPTIONS.includes(normalizeLeadStatus(entry?.ticketStatus));
}

export function leadStatusBadge(status) {
  return normalizeLeadStatus(status) === 'Orten' ? 'orten' : 'callcenter';
}

export function emptyLeadForm() {
  return {
    rufnummer: '',
    o2Kunde: 'Nein',
    angebot: '',
    produktNotiz: '',
    stadt: '',
    marketingNotiz: '',
    terminDatum: '',
    terminZeit: '',
    shop: '',
    ticketStatus: LEAD_STATUS_DEFAULT
  };
}

export function formFromLead(entry) {
  return {
    rufnummer: entry?.rufnummer || '',
    o2Kunde: entry?.o2Kunde === 'Ja' ? 'Ja' : 'Nein',
    angebot: entry?.angebot || '',
    produktNotiz: entry?.produktNotiz || '',
    stadt: entry?.stadt || '',
    marketingNotiz: entry?.marketingNotiz || '',
    terminDatum: entry?.terminDatum || '',
    terminZeit: entry?.terminZeit || '',
    shop: entry?.shop || '',
    ticketStatus: normalizeLeadStatus(entry?.ticketStatus) || LEAD_STATUS_DEFAULT
  };
}

export function shopOptionsForLeads(filialeOptions = []) {
  const extra = LEAD_EXTRA_SHOPS.filter((s) => !filialeOptions.includes(s));
  return [...filialeOptions, ...extra];
}

function pad3(n) {
  return String(n).padStart(3, '0');
}

function todayIdPrefix(date = new Date()) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear());
  return `CC-${d}${m}${y}-`;
}

export function nextLeadId(tickets = [], date = new Date()) {
  const prefix = todayIdPrefix(date);
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
    id: 'CC-31082026-001',
    rufnummer: '',
    o2Kunde: 'Ja',
    angebot: 'Gold',
    produktNotiz: '10 in 1',
    stadt: 'Berlin',
    marketingNotiz: '',
    terminDatum: '',
    terminZeit: '',
    shop: 'Karl-Marx-Straße 50',
    ticketStatus: 'Callcenter',
    mitarbeiterName: '',
    createdAt: '2026-08-31T08:10:00.000Z'
  },
  {
    id: 'CC-31082026-002',
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
    mitarbeiterName: '',
    createdAt: '2026-08-31T08:18:00.000Z'
  },
  {
    id: 'CC-31082026-003',
    rufnummer: '',
    o2Kunde: 'Ja',
    angebot: 'S26 Ultra',
    produktNotiz: 'S26',
    stadt: 'außerhalb Berlin',
    marketingNotiz: '',
    terminDatum: '',
    terminZeit: '',
    shop: 'Karl-Marx-Straße 169',
    ticketStatus: 'Callcenter',
    mitarbeiterName: '',
    createdAt: '2026-08-31T08:25:00.000Z'
  },
  {
    id: 'CC-31082026-004',
    rufnummer: '',
    o2Kunde: 'Ja',
    angebot: 'IP 17 Pro Max',
    produktNotiz: '17ProMax',
    stadt: 'Berlin',
    marketingNotiz: '',
    terminDatum: '',
    terminZeit: '',
    shop: 'Kitzingstr. 7-9',
    ticketStatus: 'Orten',
    mitarbeiterName: '',
    createdAt: '2026-08-31T08:40:00.000Z'
  },
  {
    id: 'CC-31082026-005',
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
    mitarbeiterName: '',
    createdAt: '2026-08-31T09:05:00.000Z'
  },
  {
    id: 'CC-31082026-006',
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
    mitarbeiterName: '',
    createdAt: '2026-08-31T09:20:00.000Z'
  }
];

function cloneSeed() {
  return JSON.parse(JSON.stringify(SEED_LEADS));
}

export function leadToNeuEntry(lead) {
  return {
    id: lead.id,
    source: 'lead',
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
    kundeVorname: lead.rufnummer || lead.angebot || 'Nachricht',
    kundeNachname: '',
    datum: lead.terminDatum || String(lead.createdAt || '').slice(0, 10),
    ticketStatus: normalizeLeadStatus(lead.ticketStatus) || LEAD_STATUS_DEFAULT,
    mitarbeiterName: lead.mitarbeiterName || ''
  };
}

export function loadLeadTickets() {
  try {
    const raw = localStorage.getItem(LEAD_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((t) => ({
          ...t,
          ticketStatus: normalizeLeadStatus(t.ticketStatus) || LEAD_STATUS_DEFAULT
        }));
      }
    }
  } catch {
    /* Store ungültig – Seed verwenden */
  }
  return cloneSeed();
}

export function saveLeadTickets(tickets) {
  try {
    localStorage.setItem(LEAD_STORAGE_KEY, JSON.stringify(tickets));
  } catch {
    /* Quota / privater Modus */
  }
}
