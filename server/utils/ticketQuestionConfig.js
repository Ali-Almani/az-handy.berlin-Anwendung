import { readJsonStore, updateJsonStore } from './jsonClusterStore.js';

export const TICKET_QUESTION_CONFIG_FILE = 'ticket-question-config.json';

const LOCALES = ['de', 'ar', 'en'];
const FIELD_TYPES = new Set(['text', 'dropdown', 'date', 'time', 'tel']);
const VORLAGE_FIELDS = [
  'priority',
  'sprache',
  'rufnummer',
  'o2Kunde',
  'stadt',
  'angebot',
  'produktNotiz',
  'marketingNotiz',
  'terminDatum',
  'terminZeit'
];
const EXTRA_FIELDS = ['mocKn', 'marketingErstkontakt', 'customerName'];
const CUSTOM_ID_RE = /^cq-[A-Za-z0-9_-]{1,40}$/;

function clip(value, max) {
  return String(value || '').trim().slice(0, max);
}

function germanizeTicketFormLabel(value) {
  const raw = String(value || '').trim().replace(/\?+$/, '').trim();
  const compact = raw.replace(/\s+/g, ' ');
  if (/^رقم\s*ال?هاتف/.test(compact)) return 'Telefonnummer des Kunden';
  return raw;
}

function emptyTicketQuestionConfig() {
  return { hidden: [], labels: {}, texts: {}, options: {}, links: {}, order: [], custom: [] };
}

function allowedFieldId(id, customIds) {
  return VORLAGE_FIELDS.includes(id)
    || EXTRA_FIELDS.includes(id)
    || customIds.has(id)
    || CUSTOM_ID_RE.test(id);
}

function sanitizeLocaleMap(raw, max) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const out = {};
  for (const loc of LOCALES) {
    const value = clip(src[loc], max);
    if (value) out[loc] = value;
  }
  return out;
}

function sanitizeOfferLocale(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    url: clip(src.url, 2000),
    image: clip(src.image, 400000)
  };
}

function sanitizeOfferEntry(value) {
  if (typeof value === 'string') {
    const url = clip(value, 2000);
    return { de: { url, image: '' }, ar: { url, image: '' } };
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { de: { url: '', image: '' }, ar: { url: '', image: '' } };
  }
  if (value.de || value.ar) {
    return {
      de: sanitizeOfferLocale(value.de),
      ar: sanitizeOfferLocale(value.ar)
    };
  }
  const shared = sanitizeOfferLocale(value);
  return { de: shared, ar: { ...shared } };
}

function sanitizeIdList(raw, customIds, max) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(raw) ? raw : []) {
    const id = String(item || '').trim();
    if (!id || seen.has(id) || !allowedFieldId(id, customIds)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

function sanitizeKeyedMap(raw, customIds, mapValue, maxKeys) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const out = {};
  let count = 0;
  for (const [key, value] of Object.entries(src)) {
    const id = String(key || '').trim();
    if (!id || !allowedFieldId(id, customIds)) continue;
    const mapped = mapValue(value);
    if (mapped == null) continue;
    out[id] = mapped;
    count += 1;
    if (count >= maxKeys) break;
  }
  return out;
}

export function sanitizeTicketQuestionConfig(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const custom = [];
  const customIds = new Set();
  for (const item of Array.isArray(src.custom) ? src.custom.slice(0, 40) : []) {
    const id = String(item?.id || '').trim();
    if (!CUSTOM_ID_RE.test(id) || customIds.has(id)) continue;
    const type = FIELD_TYPES.has(item?.type) ? item.type : 'text';
    customIds.add(id);
    const rawLabel = clip(item?.label, 80) || 'Neue Frage';
    custom.push({
      id,
      type,
      label: germanizeTicketFormLabel(rawLabel) || 'Neue Frage'
    });
  }

  const labels = sanitizeKeyedMap(src.labels, customIds, (value) => {
    const pack = sanitizeLocaleMap(value, 80);
    if (!pack.de) {
      const mapped = germanizeTicketFormLabel(pack.ar || pack.en || '');
      if (mapped === 'Telefonnummer des Kunden') pack.de = mapped;
    } else {
      pack.de = germanizeTicketFormLabel(pack.de) || pack.de;
    }
    return Object.keys(pack).length ? pack : null;
  }, 80);

  const texts = sanitizeKeyedMap(src.texts, customIds, (value) => {
    const pack = sanitizeLocaleMap(value, 2000);
    return Object.keys(pack).length ? pack : null;
  }, 80);

  const options = sanitizeKeyedMap(src.options, customIds, (value) => {
    if (!Array.isArray(value)) return null;
    const list = [...new Set(value.map((opt) => clip(opt, 80)).filter(Boolean))].slice(0, 40);
    return list.length ? list : null;
  }, 80);

  const links = sanitizeKeyedMap(src.links, customIds, (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const map = {};
    let count = 0;
    for (const [name, entry] of Object.entries(value)) {
      const option = clip(name, 80);
      if (!option) continue;
      map[option] = sanitizeOfferEntry(entry);
      count += 1;
      if (count >= 40) break;
    }
    return Object.keys(map).length ? map : null;
  }, 80);

  return {
    hidden: sanitizeIdList(src.hidden, customIds, 80),
    labels,
    texts,
    options,
    links,
    order: sanitizeIdList(src.order, customIds, 80),
    custom
  };
}

export function loadTicketQuestionConfig() {
  const stored = readJsonStore(TICKET_QUESTION_CONFIG_FILE, null);
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return { config: emptyTicketQuestionConfig(), empty: true };
  }
  return { config: sanitizeTicketQuestionConfig(stored), empty: false };
}

export function saveTicketQuestionConfig(raw) {
  const config = sanitizeTicketQuestionConfig(raw);
  updateJsonStore(TICKET_QUESTION_CONFIG_FILE, emptyTicketQuestionConfig(), (state) => {
    for (const key of Object.keys(state)) delete state[key];
    Object.assign(state, config);
  });
  return config;
}
