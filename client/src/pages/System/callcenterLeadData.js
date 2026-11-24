import {
  isArchivedTicketStatus,
  normalizeVorvertragTicketStatus,
  VORVERTRAG_TICKET_STATUS_DEFAULT
} from './vorvertragTicketStatus';
import { TICKET_PRIORITY_DEFAULT, TICKET_PRIORITY_OPTIONS, normalizeTicketPriority } from './ticketPriority';
import { TICKET_LANGUAGE_DEFAULT_NEU, TICKET_LANGUAGE_OPTIONS, normalizeTicketLanguage } from './ticketLanguage';
import { EINSATZORT_LEGACY_MAP } from '../../constants/einsatzorte';

export { LEAD_STADT_OPTIONS, isStadtFilterOption } from './deutscheStaedte';

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

export const ORTEN_SHOP_OPTIONS = [
  'Kitzingstraße',
  'Sonnenallee 16',
  'Karl-Marx-Straße 50',
  'Karl-Marx-Straße 169',
  'Karl-Marx-Straße 127',
  'Badstraße 12',
  'Turmstraße 47',
  'Hauptstraße 156'
];

export const NACHRICHTEN_FILIALE_GROUPS = [
  { id: 'callcenter', shop: 'Call Center', label: 'CC' },
  { id: 'sonnenallee16', shop: 'Sonnenallee 16', label: 'Son' },
  { id: 'km169', shop: 'Karl-Marx-Straße 169', label: 'K69' },
  { id: 'km127', shop: 'Karl-Marx-Straße 127', label: 'K27' },
  { id: 'km50', shop: 'Karl-Marx-Straße 50', label: 'K50' },
  { id: 'badstr12', shop: 'Badstraße 12', label: 'Bad' },
  { id: 'turmstr47', shop: 'Turmstraße 47', label: 'Trm' },
  { id: 'hauptstr156', shop: 'Hauptstraße 156', label: 'Hpt' },
  { id: 'kitzingstr', shop: 'Kitzingstraße', label: 'Ktz' }
];

export const NACHRICHT_ART_OPTIONS = [
  { id: 'angebot', label: 'Angebot' },
  { id: 'beschwerde', label: 'Beschwerde' },
  { id: 'allgemeineInfo', label: 'Allgemeine Info' }
];

export const SOCIAL_CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp', short: 'WA' },
  { id: 'instagram', label: 'Instagram', short: 'IG' },
  { id: 'facebook', label: 'Facebook', short: 'FB' },
  { id: 'tiktok', label: 'TikTok', short: 'TT' }
];

export const MANUAL_TICKET_CHANNEL = 'ticket';
export const MANUAL_TICKET_NAME = 'Neues Ticket';

export const QUESTION_CHAT_LOCALES = [
  { id: 'de', short: 'DE', sprache: 'Deutsch' },
  { id: 'ar', short: 'AR', sprache: 'Arabisch' },
  { id: 'en', short: 'ENG', sprache: 'Englisch' }
];

export const TEMPLATE_QUESTIONS = [
  {
    field: 'o2Kunde',
    label: 'O2 Kunde?',
    de: { label: 'O2 Kunde?', text: 'Sind Sie bereits O2-Kunde?' },
    ar: { label: 'عميل O2؟', text: 'هل أنت عميل O2 حالياً؟' },
    en: { label: 'O2 customer?', text: 'Are you already an O2 customer?' }
  },
  {
    field: 'rufnummer',
    label: 'Rufnummer?',
    de: { label: 'Rufnummer?', text: 'Wie lautet Ihre Rufnummer?' },
    ar: { label: 'رقم الهاتف؟', text: 'ما هو رقم هاتفك؟' },
    en: { label: 'Phone number?', text: 'What is your phone number?' }
  },
  {
    field: 'angebot',
    label: 'Produkt?',
    de: { label: 'Produkt?', text: 'Welches Angebot oder Produkt möchten Sie?' },
    ar: { label: 'العرض / المنتج؟', text: 'أي عرض أو منتج ترغب به؟' },
    en: { label: 'Offer / Product?', text: 'Which offer or product would you like?' }
  },
  {
    field: 'produktNotiz',
    label: 'Produkt Notiz?',
    de: { label: 'Produkt Notiz?', text: 'Gibt es eine Produkt-Notiz (z. B. Tarif, Modell)?' },
    ar: { label: 'ملاحظة المنتج؟', text: 'هل هناك ملاحظة للمنتج (مثل التعريفة أو الموديل)؟' },
    en: { label: 'Product note?', text: 'Is there a product note (e.g. plan or model)?' }
  },
  {
    field: 'marketingNotiz',
    label: 'Marketing Notiz?',
    de: { label: 'Marketing Notiz?', text: 'Gibt es eine Marketing-Notiz oder Empfehlung?' },
    ar: { label: 'ملاحظة التسويق؟', text: 'هل هناك ملاحظة تسويقية أو توصية؟' },
    en: { label: 'Marketing note?', text: 'Is there a marketing note or referral?' }
  },
  {
    field: 'stadt',
    label: 'Stadt?',
    de: { label: 'Stadt?', text: 'In welcher Stadt sind Sie?' },
    ar: { label: 'المدينة؟', text: 'في أي مدينة أنت؟' },
    en: { label: 'City?', text: 'Which city are you in?' }
  },
  {
    field: 'terminDatum',
    label: 'Termin Datum?',
    de: { label: 'Termin Datum?', text: 'An welchem Datum passt Ihnen ein Termin?' },
    ar: { label: 'تاريخ الموعد؟', text: 'في أي تاريخ يناسبك الموعد؟' },
    en: { label: 'Appointment date?', text: 'Which date works for an appointment?' }
  },
  {
    field: 'terminZeit',
    label: 'Termin Zeit?',
    de: { label: 'Termin Zeit?', text: 'Zu welcher Uhrzeit passt Ihnen der Termin?' },
    ar: { label: 'وقت الموعد؟', text: 'في أي وقت يناسبك الموعد؟' },
    en: { label: 'Appointment time?', text: 'What time works for the appointment?' }
  }
];

export function questionChatLocale(sprache) {
  const n = normalizeTicketLanguage(sprache);
  if (n === 'Arabisch') return 'ar';
  if (n === 'Englisch') return 'en';
  return 'de';
}

export function spracheFromQuestionLocale(locale) {
  const found = QUESTION_CHAT_LOCALES.find((item) => item.id === locale);
  return found?.sprache || TICKET_LANGUAGE_DEFAULT_NEU;
}

function isWelcomeAutoReply(message) {
  return message?.auto === 'welcome' || String(message?.id || '').startsWith('auto-welcome-');
}

export function isLiveWhatsAppTicket(ticket) {
  return Boolean(ticket?.liveWhatsApp || ticket?.waId);
}

export function isLiteInboxTicket(ticket) {
  return Boolean(ticket?.messagesLite);
}

function withMessageTranslations(prevMessages, nextMessages) {
  return (nextMessages || []).map((message) => {
    const old = (prevMessages || []).find((item) => item.id === message.id);
    if (!old?.translation) return message;
    return {
      ...message,
      translation: old.translation,
      translationLang: old.translationLang,
      translationSourceLang: old.translationSourceLang
    };
  });
}

export function mergeWhatsAppTickets(local, remote) {
  const list = Array.isArray(local) ? local : [];
  const cloud = Array.isArray(remote) ? remote : [];
  const cloudIds = new Set(cloud.map((raw) => String(raw?.id || '')).filter(Boolean));
  const others = list.filter((t) => (
    !cloudIds.has(t.id)
    && normalizeSocialChannel(t.channel) !== 'whatsapp'
    && !isLiveWhatsAppTicket(t)
  ));
  const prevById = new Map(list.filter((t) => isLiveWhatsAppTicket(t) || cloudIds.has(t.id)).map((t) => [t.id, t]));
  return [...others, ...cloud.map((raw) => {
    const remoteLite = isLiteInboxTicket(raw);
    const hydrated = hydrateLeadTicket({
      ...raw,
      liveWhatsApp: Boolean(raw?.waId),
      messagesLite: remoteLite
    });
    const prev = prevById.get(hydrated.id);
    if (!prev) return hydrated;
    if (remoteLite) {
      const last = (hydrated.messages || [])[(hydrated.messages || []).length - 1];
      let messages = prev.messages || [];
      if (last?.id && !messages.some((item) => item.id === last.id)) {
        messages = [...messages, last];
      }
      return withPendingOutgoingMessages(prev, preserveOpenTicketEdits(prev, {
        ...hydrated,
        messagesLite: isLiteInboxTicket(prev),
        messageCount: hydrated.messageCount || messages.length,
        messages
      }));
    }
    return withPendingOutgoingMessages(prev, preserveOpenTicketEdits(prev, {
      ...hydrated,
      messagesLite: false,
      messages: withMessageTranslations(prev.messages, hydrated.messages)
    }));
  })];
}

export function isPendingOutgoingMessage(message) {
  return Boolean(message?.pending) || String(message?.id || '').startsWith('local-send-');
}

function pendingMatchesServer(pending, messages) {
  const text = String(pending?.text || '').trim();
  const pendingAt = Date.parse(pending?.at || '') || 0;
  return (Array.isArray(messages) ? messages : []).some((item) => {
    if (item?.from !== 'agent' || isPendingOutgoingMessage(item)) return false;
    const itemText = String(item?.text || '').trim();
    if (text && itemText === text) {
      const itemAt = Date.parse(item?.at || '') || 0;
      return !pendingAt || !itemAt || Math.abs(itemAt - pendingAt) < 120000;
    }
    if (text) return false;
    const hasMedia = (list) => Array.isArray(list) && list.length > 0;
    if (
      !hasMedia(pending.images)
      && !hasMedia(pending.voices)
      && !hasMedia(pending.files)
      && !hasMedia(pending.videos)
    ) {
      return false;
    }
    const itemAt = Date.parse(item?.at || '') || 0;
    return Boolean(itemAt) && itemAt >= pendingAt - 2000;
  });
}

export function withPendingOutgoingMessages(prevTicket, nextTicket) {
  if (!nextTicket) return nextTicket;
  const pending = (prevTicket?.messages || []).filter(isPendingOutgoingMessage);
  if (!pending.length) return nextTicket;
  const server = Array.isArray(nextTicket.messages) ? nextTicket.messages : [];
  const keep = pending.filter((item) => (
    !server.some((message) => message.id === item.id)
    && !pendingMatchesServer(item, server)
  ));
  if (!keep.length) return nextTicket;
  return { ...nextTicket, messages: [...server, ...keep] };
}

export function withFirstMessageAutoReply(ticket) {
  if (!ticket || isLiveWhatsAppTicket(ticket)) return ticket;
  const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
  const firstCustomerAt = messages.findIndex((m) => m?.from === 'customer');
  if (firstCustomerAt < 0) return ticket;
  if (ticket.welcomeAutoSent || messages.some(isWelcomeAutoReply)) {
    return ticket.welcomeAutoSent ? ticket : { ...ticket, welcomeAutoSent: true };
  }
  return { ...ticket, welcomeAutoSent: true };
}

function leadSprache(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return TICKET_LANGUAGE_DEFAULT_NEU;
  return normalizeTicketLanguage(raw);
}

export const QUESTION_CONFIG_KEY = 'az-callcenter-question-config';

const PREVIOUS_VORLAGE_QUESTION_ORDERS = [
  [
    'priority',
    'sprache',
    'rufnummer',
    'o2Kunde',
    'angebot',
    'produktNotiz',
    'marketingNotiz',
    'stadt',
    'terminDatum',
    'terminZeit'
  ],
  [
    'priority',
    'sprache',
    'rufnummer',
    'o2Kunde',
    'angebot',
    'produktNotiz',
    'stadt',
    'marketingNotiz',
    'terminDatum',
    'terminZeit'
  ],
  [
    'priority',
    'sprache',
    'o2Kunde',
    'rufnummer',
    'angebot',
    'produktNotiz',
    'marketingNotiz',
    'stadt',
    'terminDatum',
    'terminZeit'
  ]
];

export const VORLAGE_QUESTION_ORDER = [
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

export function isVorlageQuestionField(field) {
  return VORLAGE_QUESTION_ORDER.includes(field);
}

function padClock(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '';
  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`;
}

export function parseRueckrufzeit(value) {
  const raw = String(value || '').trim();
  const range = raw.match(/^(\d{1,2}:\d{2})\s*(?:bis|-|–|—)\s*(\d{1,2}:\d{2})$/i);
  if (range) return { von: padClock(range[1]), bis: padClock(range[2]) };
  return { von: padClock(raw), bis: '' };
}

export function formatRueckrufzeit(von, bis) {
  const from = padClock(von);
  const to = padClock(bis);
  if (from && to) return `${from} bis ${to}`;
  return from || to;
}

export function isCustomTicketField(field) {
  return /^cq-/.test(String(field || ''));
}

const DROPDOWN_DEFAULTS = {
  priority: TICKET_PRIORITY_OPTIONS,
  sprache: TICKET_LANGUAGE_OPTIONS,
  o2Kunde: LEAD_O2_OPTIONS,
  angebot: LEAD_ANGEBOT_OPTIONS
};

export const QUESTION_FIELD_TYPES = [
  { id: 'text', label: 'Text' },
  { id: 'dropdown', label: 'Dropdown' },
  { id: 'date', label: 'Datum' },
  { id: 'time', label: 'Uhrzeit' },
  { id: 'tel', label: 'Telefon' }
];

function upgradeQuestionOrder(order) {
  if (!Array.isArray(order) || !order.length) return order;
  const old = PREVIOUS_VORLAGE_QUESTION_ORDERS.find((candidate) => (
    candidate.every((field, index) => order[index] === field)
  ));
  if (!old) return order;
  return [...VORLAGE_QUESTION_ORDER, ...order.slice(old.length)];
}

export const NEW_QUESTION_PLACEHOLDER = {
  de: 'Neue Frage?',
  ar: 'سؤال جديد؟',
  en: 'New question?'
};

export function emptyQuestionConfig() {
  return { hidden: [], hiddenLocales: {}, labels: {}, texts: {}, options: {}, links: {}, order: [], custom: [] };
}

function normalizeHiddenLocales(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  Object.entries(raw).forEach(([field, value]) => {
    const id = String(field || '').trim();
    if (!id) return;
    const locales = Array.isArray(value)
      ? value.map(String)
      : (value && typeof value === 'object'
        ? QUESTION_CHAT_LOCALES.map((item) => item.id).filter((loc) => value[loc])
        : []);
    const next = locales.filter((loc) => QUESTION_CHAT_LOCALES.some((item) => item.id === loc));
    if (next.length) out[id] = [...new Set(next)];
  });
  return out;
}

export function normalizeQuestionConfig(parsed) {
  if (!parsed || typeof parsed !== 'object') return emptyQuestionConfig();
  return {
    hidden: Array.isArray(parsed.hidden) ? parsed.hidden.filter(Boolean).map(String) : [],
    hiddenLocales: normalizeHiddenLocales(parsed.hiddenLocales),
    labels: parsed.labels && typeof parsed.labels === 'object' && !Array.isArray(parsed.labels) ? parsed.labels : {},
    texts: parsed.texts && typeof parsed.texts === 'object' && !Array.isArray(parsed.texts) ? parsed.texts : {},
    options: parsed.options && typeof parsed.options === 'object' && !Array.isArray(parsed.options) ? parsed.options : {},
    links: parsed.links && typeof parsed.links === 'object' && !Array.isArray(parsed.links) ? parsed.links : {},
    order: upgradeQuestionOrder(
      Array.isArray(parsed.order) ? parsed.order.filter((field) => typeof field === 'string' && field) : []
    ),
    custom: Array.isArray(parsed.custom)
      ? parsed.custom
        .filter((item) => item && item.id && QUESTION_FIELD_TYPES.some((type) => type.id === item.type))
        .map((item) => (
          item.audience === 'alissar'
            ? { ...item, audience: 'alissar' }
            : item
        ))
      : []
  };
}

export function hasQuestionConfigContent(config) {
  const next = normalizeQuestionConfig(config);
  return Boolean(
    next.custom.length
    || next.hidden.length
    || next.order.length
    || Object.keys(next.labels).length
    || Object.keys(next.texts).length
    || Object.keys(next.options).length
    || Object.keys(next.links).length
  );
}

export function loadQuestionConfig() {
  try {
    const raw = localStorage.getItem(QUESTION_CONFIG_KEY);
    return normalizeQuestionConfig(raw ? JSON.parse(raw) : null);
  } catch {
    return emptyQuestionConfig();
  }
}

export function saveQuestionConfig(config) {
  try {
    localStorage.setItem(QUESTION_CONFIG_KEY, JSON.stringify(config || emptyQuestionConfig()));
  } catch {
    /* Quota / privater Modus */
  }
}

export function isQuestionHidden(config, field) {
  return (config?.hidden || []).includes(field);
}

export function isQuestionHiddenForLocale(config, field, locale) {
  if (isQuestionHidden(config, field)) return true;
  const loc = QUESTION_CHAT_LOCALES.some((item) => item.id === locale) ? locale : 'de';
  const list = config?.hiddenLocales?.[field];
  return Array.isArray(list) && list.includes(loc);
}

export function questionLocaleValue(map, field, locale) {
  const loc = QUESTION_CHAT_LOCALES.some((item) => item.id === locale) ? locale : 'de';
  return String(map?.[field]?.[loc] || '').trim();
}

export function customQuestionVisibleInLocale(config, field, locale) {
  if (!isCustomTicketField(field) || isQuestionHiddenForLocale(config, field, locale)) return false;
  return Boolean(
    questionLocaleValue(config?.labels, field, locale)
    || questionLocaleValue(config?.texts, field, locale)
  );
}

export function customQuestions(config) {
  return Array.isArray(config?.custom) ? config.custom : [];
}

export function isAlissarOnlyQuestion(item) {
  return item?.audience === 'alissar';
}

export function questionFieldIds(config) {
  return [...VORLAGE_QUESTION_ORDER, ...customQuestions(config).map((item) => item.id)];
}

export function visibleQuestionOrder(config) {
  const known = questionFieldIds(config);
  const saved = Array.isArray(config?.order) ? config.order.filter((field) => known.includes(field)) : [];
  const rest = known.filter((field) => !saved.includes(field));
  return [...saved, ...rest].filter((field) => !isQuestionHidden(config, field));
}

function isKundenTelefonnummerField(config, field) {
  const added = customQuestions(config).find((item) => item.id === field);
  const label = String(added?.label || '').trim().replace(/\?+$/, '').toLowerCase();
  return label === 'telefonnummer des kunden' || label === 'telefonnummer';
}

export function customFieldIdsFromTicket(ticket) {
  const ids = [];
  const seen = new Set();
  const add = (id) => {
    const key = String(id || '');
    if (!isCustomTicketField(key) || seen.has(key)) return;
    seen.add(key);
    ids.push(key);
  };
  const answers = ticket?.customAnswers && typeof ticket.customAnswers === 'object'
    ? ticket.customAnswers
    : {};
  Object.keys(answers).forEach(add);
  Object.keys(ticket || {}).forEach(add);
  return ids;
}

/** Ticket erstellen: Vorlagenfelder bleiben immer sichtbar, auch wenn sie im Fragen-Bereich gelöscht sind. */
export function ticketFormFieldOrder(config, { includeMocKn = false, extraCustomIds = [] } = {}) {
  const seen = new Set();
  const custom = [];
  for (const id of [...customQuestions(config).map((item) => item.id), ...extraCustomIds]) {
    if (!id || seen.has(id) || !isCustomTicketField(id) || isQuestionHidden(config, id)) continue;
    if (isAlissarOnlyQuestion(customQuestions(config).find((item) => item.id === id))) continue;
    if (!ticketFormCustomLabel(config, id)) continue;
    seen.add(id);
    custom.push(id);
  }
  const saved = Array.isArray(config?.order)
    ? config.order.filter((field) => custom.includes(field))
    : [];
  const rest = custom.filter((field) => !saved.includes(field));
  const order = [...VORLAGE_QUESTION_ORDER, ...saved, ...rest];
  if (!includeMocKn) return order;
  const phoneAt = order.findIndex((field) => isKundenTelefonnummerField(config, field));
  order.splice(phoneAt >= 0 ? phoneAt + 1 : order.length, 0, 'mocKn');
  const mocAt = order.indexOf('mocKn');
  order.splice(mocAt >= 0 ? mocAt + 1 : order.length, 0, 'marketingErstkontakt');
  return order;
}

export const TICKET_FORM_LABELS = {
  customerName: 'Kunde Name',
  priority: 'Priorität',
  sprache: 'Sprache',
  rufnummer: 'WhatsApp-Nummer',
  o2Kunde: 'O2 Kunde',
  stadt: 'Stadt',
  angebot: 'Angebote',
  produktNotiz: 'Produkt Notiz',
  marketingNotiz: 'Marketing Notiz',
  terminDatum: 'Gewünschte Datum',
  terminZeit: 'Gewünschte Rückrufzeit',
  mocKn: 'Moc KN',
  marketingErstkontakt: 'Marketing-Kontaktzeitraum'
};

const LEGACY_TICKET_FORM_LABELS = {
  rufnummer: ['rufnummer', 'telefonnummer des kunden', 'telefonnummer'],
  angebot: ['produkt', 'angebot / produkt'],
  terminDatum: ['termin datum', 'gewünschtes datum'],
  terminZeit: ['termin zeit']
};

function normalizeTicketFormLabel(value) {
  return String(value || '').trim().replace(/\?+$/, '').toLowerCase();
}

function withoutQuestionMark(value) {
  return String(value || '').trim().replace(/\?+$/, '').trim();
}

export function germanizeTicketFormLabel(value) {
  const raw = withoutQuestionMark(value);
  const compact = raw.replace(/\s+/g, ' ');
  if (/^رقم\s*ال?هاتف/.test(compact)) return 'Telefonnummer des Kunden';
  return raw;
}

export function hasArabicScript(value) {
  return /[\u0600-\u06FF]/.test(String(value || ''));
}

const TICKET_FORM_PLACEHOLDER_LABELS = new Set([
  'zusatzfeld',
  'neue frage',
  'new question',
  'سؤال جديد'
]);

export function isUsableTicketFormLabel(value) {
  const label = germanizeTicketFormLabel(value);
  if (!label || hasArabicScript(label)) return false;
  return !TICKET_FORM_PLACEHOLDER_LABELS.has(normalizeTicketFormLabel(label));
}

export function ticketFormCustomLabel(config, field) {
  const pack = config?.labels?.[field] && typeof config.labels[field] === 'object' ? config.labels[field] : {};
  const added = customQuestions(config).find((item) => item.id === field);
  for (const candidate of [pack.de, added?.label]) {
    const label = germanizeTicketFormLabel(String(candidate || '').trim());
    if (isUsableTicketFormLabel(label)) return label;
  }
  return '';
}

export function ticketFormFieldLabel(field, fallback, config, locale = 'de') {
  if (TICKET_FORM_LABELS[field]) return TICKET_FORM_LABELS[field];
  const pack = config?.labels?.[field] && typeof config.labels[field] === 'object' ? config.labels[field] : {};
  const loc = QUESTION_CHAT_LOCALES.some((item) => item.id === locale) ? locale : 'de';
  let custom = String(pack[loc] || '').trim();
  if (loc === 'de') custom = ticketFormCustomLabel(config, field);
  const legacy = LEGACY_TICKET_FORM_LABELS[field];
  if (legacy && legacy.includes(normalizeTicketFormLabel(custom))) custom = '';
  const next = germanizeTicketFormLabel(custom || fallback);
  return loc === 'de' && !isUsableTicketFormLabel(next) ? '' : next;
}

export const AUTO_QUESTION_TICKET_FIELDS = [
  { id: '', label: 'Kein Ticketfeld' },
  { id: 'o2Kunde', label: TICKET_FORM_LABELS.o2Kunde },
  { id: 'rufnummer', label: TICKET_FORM_LABELS.rufnummer },
  { id: 'stadt', label: TICKET_FORM_LABELS.stadt },
  { id: 'angebot', label: TICKET_FORM_LABELS.angebot },
  { id: 'produktNotiz', label: TICKET_FORM_LABELS.produktNotiz },
  { id: 'marketingNotiz', label: TICKET_FORM_LABELS.marketingNotiz },
  { id: 'terminDatum', label: TICKET_FORM_LABELS.terminDatum },
  { id: 'terminZeit', label: TICKET_FORM_LABELS.terminZeit },
  { id: 'customerName', label: 'Name' }
];

export function normalizeOfferUrl(raw) {
  const url = String(raw || '').trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (/^www\./i.test(url) || /^[\w.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(url)) return `https://${url}`;
  return url;
}

export function questionOptionLinks(field, config) {
  const map = config?.links?.[field];
  if (!map || typeof map !== 'object' || Array.isArray(map)) return {};
  const out = {};
  Object.entries(map).forEach(([key, value]) => {
    const name = String(key || '').trim();
    const href = offerLocale(value, 'de').url;
    if (name && href) out[name] = href;
  });
  return out;
}

function emptyOfferLocale() {
  return { url: '', image: '' };
}

export function offerLocale(value, locale) {
  const loc = locale === 'ar' ? 'ar' : 'de';
  const entry = normalizeOfferEntry(value);
  const chosen = entry[loc];
  if (chosen.url || chosen.image) return chosen;
  return entry.de;
}

export function normalizeOfferEntry(value) {
  const pack = (url, image) => ({
    url: normalizeOfferUrl(url),
    image: String(image || '').trim()
  });
  if (typeof value === 'string') {
    const url = normalizeOfferUrl(value);
    return { de: pack(url, ''), ar: pack(url, '') };
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { de: emptyOfferLocale(), ar: emptyOfferLocale() };
  }
  if (value.de || value.ar) {
    return {
      de: pack(value.de?.url, value.de?.image),
      ar: pack(value.ar?.url, value.ar?.image)
    };
  }
  const shared = pack(value.url, value.image);
  return { de: shared, ar: { ...shared } };
}

export function angebotMentionItems(config, locale = 'de') {
  const options = questionDropdownOptions('angebot', config) || [];
  const links = config?.links?.angebot && typeof config.links.angebot === 'object' ? config.links.angebot : {};
  const order = locale === 'ar' ? ['ar', 'de'] : ['de', 'ar'];
  return options.flatMap((label) => {
    const entry = normalizeOfferEntry(links[label]);
    return order.map((loc) => ({
      label,
      locale: loc,
      url: entry[loc].url || '',
      image: entry[loc].image || ''
    }));
  }).filter((item) => item.label);
}

export function mentionAt(text, cursor) {
  const value = String(text || '');
  const pos = Number.isFinite(cursor) ? cursor : value.length;
  const before = value.slice(0, Math.max(0, pos));
  const match = before.match(/(^|[\s])@([^\s@]*)$/);
  if (!match) return null;
  const query = match[2] || '';
  return { start: before.length - query.length - 1, query };
}

export function filterAngebotMentions(config, query, locale = 'de') {
  const q = String(query || '').trim().toLowerCase();
  return angebotMentionItems(config, locale).filter((item) => {
    if (!q) return true;
    return item.label.toLowerCase().includes(q) || item.locale.includes(q);
  });
}

function storedQuestionLabel(field, locale, config) {
  const custom = String(config?.labels?.[field]?.[locale] || '').trim();
  if (!custom) return '';
  const legacy = LEGACY_TICKET_FORM_LABELS[field];
  if (legacy && legacy.includes(normalizeTicketFormLabel(custom))) return '';
  return custom;
}

function withoutNiedrigPriority(field, list) {
  if (field !== 'priority' || !Array.isArray(list)) return list;
  const next = list.filter((item) => String(item).trim().toLowerCase() !== 'niedrig');
  return next.length ? next : [...TICKET_PRIORITY_OPTIONS];
}

export function questionDropdownOptions(field, config) {
  const added = customQuestions(config).find((item) => item.id === field);
  if (added) {
    if (added.type !== 'dropdown') return null;
    const list = config?.options?.[field];
    const options = Array.isArray(list) && list.length ? list.map((item) => String(item)) : ['Option 1'];
    return withoutNiedrigPriority(field, options);
  }
  const custom = config?.options?.[field];
  if (Array.isArray(custom) && custom.length) {
    return withoutNiedrigPriority(field, custom.map((item) => String(item)));
  }
  return DROPDOWN_DEFAULTS[field] ? withoutNiedrigPriority(field, [...DROPDOWN_DEFAULTS[field]]) : null;
}

export function localizedTemplateQuestions(locale, config) {
  const loc = QUESTION_CHAT_LOCALES.some((item) => item.id === locale) ? locale : 'de';
  const order = visibleQuestionOrder(config);
  return TEMPLATE_QUESTIONS
    .filter((q) => !isQuestionHiddenForLocale(config, q.field, loc))
    .map((q) => ({
      field: q.field,
      label: storedQuestionLabel(q.field, loc, config) || q[loc]?.label || q.de.label,
      text: config?.texts?.[q.field]?.[loc] || q[loc]?.text || q.de.text
    }))
    .concat(
      customQuestions(config)
        .filter((item) => customQuestionVisibleInLocale(config, item.id, loc))
        .map((item) => ({
          field: item.id,
          label: questionLocaleValue(config?.labels, item.id, loc)
            || NEW_QUESTION_PLACEHOLDER[loc]
            || NEW_QUESTION_PLACEHOLDER.de,
          text: questionLocaleValue(config?.texts, item.id, loc),
          audience: isAlissarOnlyQuestion(item) ? 'alissar' : 'all'
        }))
    )
    .sort((a, b) => order.indexOf(a.field) - order.indexOf(b.field));
}

export function templateQuestionText(field, locale) {
  const q = TEMPLATE_QUESTIONS.find((item) => item.field === field);
  if (!q) return '';
  const loc = QUESTION_CHAT_LOCALES.some((item) => item.id === locale) ? locale : 'de';
  return q[loc]?.text || q.de?.text || '';
}

export function templateFieldMatchingDraft(draft, config) {
  const text = String(draft || '').trim();
  if (!text) return '';
  for (const q of TEMPLATE_QUESTIONS) {
    const custom = config?.texts?.[q.field] || {};
    const candidates = [q.de?.text, q.ar?.text, q.en?.text, custom.de, custom.ar, custom.en];
    if (candidates.filter(Boolean).includes(text)) return q.field;
  }
  for (const item of customQuestions(config)) {
    const custom = config?.texts?.[item.id] || {};
    const candidates = [custom.de, custom.ar, custom.en, item.label];
    if (candidates.filter(Boolean).includes(text)) return item.id;
  }
  return '';
}

export const LEAD_STORAGE_KEY = 'az-callcenter-inbox-v4';
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
  return isArchivedTicketStatus(migrateLeadTicketStatus(entry?.ticketStatus));
}

export function isManualLeadTicket(ticket) {
  return normalizeSocialChannel(ticket?.channel) === MANUAL_TICKET_CHANNEL;
}

export function isLeadInNeu(entry) {
  if (isLeadArchived(entry)) return false;
  if (isManualLeadTicket(entry)) return true;
  return shopAssignsTicket(entry?.shop);
}

export function leadStatusBadge(status) {
  return normalizeLeadStatus(status) === 'Orten' ? 'orten' : 'callcenter';
}

export const KONTAKTVERSUCH_MIN = 1;
export const KONTAKTVERSUCH_MAX = 20;

export function kontaktversuchBearbeiterKey(n) {
  return n === 1 ? 'kundenbesuch1Bearbeiter' : `kontakt${n}Bearbeiter`;
}

export function kontaktversuchDatumKey(n) {
  return `kontakt${n}Datum`;
}

export function kontaktversuchUhrzeitKey(n) {
  return `kontakt${n}Uhrzeit`;
}

export function kontaktversuchZeitKey(n) {
  return `kontakt${n}Zeit`;
}

export function kontaktversuchZeitAtKey(n) {
  return `kontakt${n}ZeitAt`;
}

/** YYYY-MM-DD in Europe/Berlin, für date-Inputs. */
export function berlinCalendarDate(now = new Date()) {
  return now.toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' });
}

/** HH:MM in Europe/Berlin, für time-Inputs. */
export function berlinClockTime(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23'
  }).formatToParts(now);
  const hour = parts.find((part) => part.type === 'hour')?.value || '00';
  const minute = parts.find((part) => part.type === 'minute')?.value || '00';
  return `${hour}:${minute}`;
}

export function kontaktversuchGroup(n) {
  const zeitLabel = n === 1 ? 'Zeit bis Aktion' : 'Zeit bis Aktion des letzten Versuchs';
  return {
    n,
    title: `Kontaktversuch ${n}`,
    fields: [
      { key: kontaktversuchBearbeiterKey(n), label: 'Bearbeiter', type: 'text', autoName: true },
      { key: `kontakt${n}ShopNotiz`, label: 'Shop Notiz', type: 'text' },
      { key: kontaktversuchDatumKey(n), label: 'Datum', type: 'date', locked: true },
      { key: kontaktversuchUhrzeitKey(n), label: 'Zeit', type: 'time', locked: true },
      { key: kontaktversuchZeitKey(n), label: zeitLabel, type: 'text', autoZeit: true, locked: true }
    ]
  };
}

export function offenFollowupGroups(count = KONTAKTVERSUCH_MIN) {
  const n = Math.min(
    KONTAKTVERSUCH_MAX,
    Math.max(KONTAKTVERSUCH_MIN, Number(count) || KONTAKTVERSUCH_MIN)
  );
  return Array.from({ length: n }, (_, i) => kontaktversuchGroup(i + 1));
}

export const OFFEN_FOLLOWUP_GROUPS = offenFollowupGroups(KONTAKTVERSUCH_MIN);

export function isKontaktversuchField(key) {
  const k = String(key || '');
  return k === 'kontaktversuchCount'
    || /^kundenbesuch\d+Bearbeiter$/.test(k)
    || /^kontakt\d+(Bearbeiter|ShopNotiz|Datum|Uhrzeit|Zeit|ZeitAt)$/.test(k);
}

function kontaktversuchGroupHasFollowupData(ticket, n) {
  return kontaktversuchGroup(n).fields.some((field) => {
    if (field.autoName) return false;
    return String(ticket?.[field.key] || '').trim();
  });
}

export function kontaktversuchCountFor(ticket) {
  let filled = KONTAKTVERSUCH_MIN;
  for (let n = KONTAKTVERSUCH_MIN + 1; n <= KONTAKTVERSUCH_MAX; n += 1) {
    if (kontaktversuchGroupHasFollowupData(ticket, n)) filled = n;
  }
  const stored = parseInt(ticket?.kontaktversuchCount, 10);
  if (Number.isFinite(stored) && stored === filled + 1) filled = stored;
  return Math.min(KONTAKTVERSUCH_MAX, Math.max(KONTAKTVERSUCH_MIN, filled));
}

export function offenFollowupGroupsForTicket(ticket) {
  return offenFollowupGroups(kontaktversuchCountFor(ticket));
}

export function offenFollowupFieldKeys(ticket) {
  return offenFollowupGroupsForTicket(ticket).flatMap((group) => [
    ...group.fields.map((field) => field.key),
    kontaktversuchZeitAtKey(group.n)
  ]);
}

export function kontaktversuchFieldLabel(key) {
  if (key === 'kontaktversuchCount') return 'Kontaktversuche';
  const visit = String(key || '').match(/^kundenbesuch(\d+)Bearbeiter$/);
  if (visit) return `Kontaktversuch ${visit[1]} Bearbeiter`;
  const match = String(key || '').match(/^kontakt(\d+)(Bearbeiter|ShopNotiz|Datum|Uhrzeit|Zeit)$/);
  if (!match) return '';
  const labels = {
    Bearbeiter: 'Bearbeiter',
    ShopNotiz: 'Shop Notiz',
    Datum: 'Datum',
    Uhrzeit: 'Zeit',
    Zeit: match[1] === '1' ? 'Zeit bis Aktion' : 'Zeit bis Aktion des letzten Versuchs'
  };
  return `Kontaktversuch ${match[1]} ${labels[match[2]]}`;
}

function emptyKontaktversuchFields() {
  const fields = {
    kundenbesuch2Bearbeiter: '',
    kundenbesuch3Bearbeiter: '',
    kontaktversuchCount: KONTAKTVERSUCH_MIN
  };
  for (const field of offenFollowupGroups(KONTAKTVERSUCH_MIN).flatMap((group) => group.fields)) {
    fields[field.key] = '';
  }
  return fields;
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
    mocKn: '',
    geoeffnetAt: '',
    lastOpenedAt: '',
    dokumente: [],
    dokumenteHidden: [],
    ...emptyKontaktversuchFields(),
    mitarbeiterName: '',
    mitarbeiterNames: [],
    shopMitarbeiter: '',
    shopMitarbeiterNames: [],
    kundenbesuchDatum: '',
    shop: '',
    ticketStatus: VORVERTRAG_TICKET_STATUS_DEFAULT,
    priority: TICKET_PRIORITY_DEFAULT,
    sprache: TICKET_LANGUAGE_DEFAULT_NEU,
    nachrichtArt: '',
    editLog: []
  };
}

const TICKET_FORM_PRESERVE_KEYS = [
  'sprache',
  'rufnummer',
  'customerName',
  'o2Kunde',
  'angebot',
  'produktNotiz',
  'stadt',
  'marketingNotiz',
  'terminDatum',
  'terminZeit',
  'mocKn',
  'geoeffnetAt',
  'lastOpenedAt',
  'priority',
  'nachrichtArt',
  'shop',
  'mitarbeiterName',
  'mitarbeiterNames',
  'shopMitarbeiter',
  'shopMitarbeiterNames',
  'kundenbesuchDatum',
  'kontaktversuchCount'
];

function mergeCustomAnswers(prev, hydrated) {
  const local = prev?.customAnswers && typeof prev.customAnswers === 'object' ? prev.customAnswers : {};
  const remote = hydrated?.customAnswers && typeof hydrated.customAnswers === 'object' ? hydrated.customAnswers : {};
  const next = { ...local };
  Object.entries(remote).forEach(([id, value]) => {
    if (String(value ?? '').trim()) next[id] = value;
  });
  Object.keys(prev || {}).forEach((key) => {
    if (!isCustomTicketField(key)) return;
    const remoteVal = String(hydrated?.[key] ?? next[key] ?? '').trim();
    const localVal = String(prev[key] ?? '').trim();
    if (!remoteVal && localVal) next[key] = prev[key];
  });
  return next;
}

/** WhatsApp-Abruf darf einen gerade gesetzten Status, Ticketfelder oder Kontaktversuch nicht zurücksetzen. */
export function preserveOpenTicketEdits(prev, hydrated) {
  if (!prev) return hydrated;
  const next = { ...hydrated };
  const prevLog = Array.isArray(prev.editLog) ? prev.editLog : [];
  const remoteLog = Array.isArray(hydrated?.editLog) ? hydrated.editLog : [];
  const keepLocalStaff = prevLog.length > remoteLog.length;
  next.editLog = prevLog.length >= remoteLog.length ? prevLog : remoteLog;
  const followupKeys = new Set([
    ...offenFollowupFieldKeys(prev),
    ...offenFollowupFieldKeys(hydrated),
    ...Object.keys(prev || {}).filter(isKontaktversuchField),
    ...Object.keys(hydrated || {}).filter(isKontaktversuchField)
  ]);
  for (const key of [...followupKeys, ...TICKET_FORM_PRESERVE_KEYS]) {
    if (key === 'kontaktversuchCount' || key === 'shopMitarbeiterNames' || key === 'mitarbeiterNames') continue;
    const remote = String(hydrated?.[key] ?? '').trim();
    const local = String(prev?.[key] ?? '').trim();
    if (!remote && local) next[key] = prev[key];
  }
  next.kontaktversuchCount = Math.max(kontaktversuchCountFor(prev), kontaktversuchCountFor(next));
  if (keepLocalStaff) {
    next.shopMitarbeiterNames = storedShopMitarbeiterNames(prev);
    next.shopMitarbeiter = sanitizeMitarbeiterName(prev.shopMitarbeiter)
      || next.shopMitarbeiterNames[0]
      || '';
    next.mitarbeiterNames = storedMitarbeiterNames(prev);
    next.mitarbeiterName = sanitizeMitarbeiterName(prev.mitarbeiterName)
      || next.mitarbeiterNames[0]
      || '';
  } else {
    const remoteShop = storedShopMitarbeiterNames(hydrated);
    const localShop = storedShopMitarbeiterNames(prev);
    const shopNames = remoteShop.length ? remoteShop : localShop;
    next.shopMitarbeiterNames = shopNames;
    next.shopMitarbeiter = sanitizeMitarbeiterName(hydrated?.shopMitarbeiter)
      || sanitizeMitarbeiterName(prev.shopMitarbeiter)
      || shopNames[0]
      || '';
    const remoteStaff = storedMitarbeiterNames(hydrated);
    const localStaff = storedMitarbeiterNames(prev);
    const staffNames = remoteStaff.length ? remoteStaff : localStaff;
    next.mitarbeiterNames = staffNames;
    next.mitarbeiterName = sanitizeMitarbeiterName(hydrated?.mitarbeiterName)
      || sanitizeMitarbeiterName(prev.mitarbeiterName)
      || staffNames[0]
      || '';
  }
  next.dokumenteHidden = sanitizeDokumenteHidden([
    ...(Array.isArray(prev.dokumenteHidden) ? prev.dokumenteHidden : []),
    ...(Array.isArray(hydrated?.dokumenteHidden) ? hydrated.dokumenteHidden : [])
  ]);
  next.dokumente = mergeTicketDokumente(prev.dokumente, hydrated.dokumente)
    .filter((item) => !isDokumentHidden(item, next.dokumenteHidden));
  Object.keys(prev).forEach((key) => {
    if (!isCustomTicketField(key)) return;
    const remote = String(hydrated?.[key] ?? '').trim();
    const local = String(prev[key] ?? '').trim();
    if (!remote && local) next[key] = prev[key];
  });
  const customAnswers = mergeCustomAnswers(prev, hydrated);
  if (Object.keys(customAnswers).length) {
    next.customAnswers = customAnswers;
    Object.entries(customAnswers).forEach(([id, value]) => {
      if (!String(next[id] ?? '').trim() && String(value ?? '').trim()) next[id] = value;
    });
  }
  if (normalizeLeadStatus(hydrated?.ticketStatus)) {
    const localStatus = migrateLeadTicketStatus(prev.ticketStatus);
    if (localStatus && localStatus !== VORVERTRAG_TICKET_STATUS_DEFAULT) {
      next.ticketStatus = localStatus;
    }
  }
  return next;
}

export function ticketFormAnswers(ticket, config) {
  const base = formFromLead(ticket);
  const ids = new Set([
    ...customQuestions(config).map((item) => item.id),
    ...customFieldIdsFromTicket(ticket)
  ]);
  ids.forEach((id) => {
    base[id] = ticket?.[id] || ticket?.customAnswers?.[id] || '';
  });
  return base;
}

export function liveTicketFormPatch(ticket) {
  const payload = {};
  for (const key of TICKET_FORM_PRESERVE_KEYS) {
    if (ticket?.[key] !== undefined && ticket?.[key] !== null) payload[key] = ticket[key];
  }
  const customAnswers = {
    ...(ticket?.customAnswers && typeof ticket.customAnswers === 'object' ? ticket.customAnswers : {})
  };
  Object.keys(ticket || {}).forEach((key) => {
    if (!isCustomTicketField(key)) return;
    customAnswers[key] = ticket[key] ?? customAnswers[key] ?? '';
  });
  if (Object.keys(customAnswers).length) payload.customAnswers = customAnswers;
  return payload;
}

export function formFromLead(entry) {
  return {
    customerName: entry?.customerName || '',
    rufnummer: entry?.rufnummer || '',
    o2Kunde: String(entry?.o2Kunde || '').trim(),
    angebot: entry?.angebot || '',
    produktNotiz: entry?.produktNotiz || '',
    stadt: entry?.stadt || '',
    marketingNotiz: entry?.marketingNotiz || '',
    terminDatum: entry?.terminDatum || '',
    terminZeit: entry?.terminZeit || '',
    mocKn: entry?.mocKn || '',
    marketingErstkontakt: marketingErstkontaktValue(entry),
    shop: entry?.shop || '',
    ticketStatus: migrateLeadTicketStatus(entry?.ticketStatus),
    priority: String(entry?.priority ?? '').trim() ? normalizeTicketPriority(entry.priority) : '',
    sprache: String(entry?.sprache ?? '').trim() ? normalizeTicketLanguage(entry.sprache) : '',
    nachrichtArt: normalizeNachrichtArt(entry?.nachrichtArt)
  };
}

const LEAD_FIELD_LABELS = {
  customerName: 'Kunde Name',
  rufnummer: 'WhatsApp-Nummer',
  o2Kunde: 'O2 Kunde',
  angebot: 'Angebote',
  produktNotiz: 'Produkt Notiz',
  stadt: 'Stadt',
  marketingNotiz: 'Marketing Notiz',
  terminDatum: 'Gewünschte Datum',
  terminZeit: 'Gewünschte Rückrufzeit',
  mocKn: 'Moc KN',
  marketingErstkontakt: 'Marketing-Kontaktzeitraum',
  geoeffnetAt: 'Ticket geöffnet',
  kundenbesuch1Bearbeiter: 'Kontaktversuch 1 Bearbeiter',
  kundenbesuch2Bearbeiter: 'Kontaktversuch 2 Bearbeiter',
  kundenbesuch3Bearbeiter: 'Kontaktversuch 3 Bearbeiter',
  kontaktversuchCount: 'Kontaktversuche',
  shop: 'Filiale',
  ticketStatus: 'Status',
  kundenbesuchDatum: 'Datum erreicht',
  priority: 'Priorität',
  sprache: 'Sprache',
  mitarbeiterName: 'Marketing Mitarbeiter',
  shopMitarbeiter: 'Bearbeiter'
};

function formatLeadLogValue(value) {
  const text = String(value ?? '').trim();
  return text === '' ? '—' : text.slice(0, 160);
}

export function leadFieldChange(ticket, field, nextValue) {
  const from = formatLeadLogValue(ticket?.[field]);
  const to = formatLeadLogValue(nextValue);
  if (from === to) return null;
  const label = LEAD_FIELD_LABELS[field]
    || kontaktversuchFieldLabel(field)
    || ticketFormFieldLabel(field, '', loadQuestionConfig())
    || field;
  return { field: label, from, to };
}

export function collectLeadFieldChanges(original, working) {
  const keys = new Set([
    ...TICKET_FORM_PRESERVE_KEYS,
    ...offenFollowupFieldKeys(original),
    ...offenFollowupFieldKeys(working),
    'customerName',
    'shop',
    'shopMitarbeiter',
    'kontaktversuchCount'
  ]);
  Object.keys(working || {}).forEach((key) => {
    if (isCustomTicketField(key)) keys.add(key);
  });
  Object.keys(working?.customAnswers || {}).forEach((key) => keys.add(key));
  const skip = new Set(['mitarbeiterNames', 'shopMitarbeiterNames', 'geoeffnetAt', 'lastOpenedAt']);
  const changes = [];
  keys.forEach((key) => {
    if (skip.has(key)) return;
    const fromVal = original?.[key] ?? original?.customAnswers?.[key];
    const toVal = working?.[key] ?? working?.customAnswers?.[key];
    const change = leadFieldChange({ [key]: fromVal }, key, toVal);
    if (change) changes.push(change);
  });
  const docsFrom = JSON.stringify(original?.dokumente || []);
  const docsTo = JSON.stringify(working?.dokumente || []);
  if (docsFrom !== docsTo) {
    changes.push({ field: 'Dokumente', from: '—', to: 'aktualisiert' });
  }
  return changes;
}

export function appendLeadEditLog(ticket, { editorName, action = 'updated', changes }) {
  const valid = (changes || []).filter((c) => c && c.from !== c.to);
  if (!valid.length) return ticket;
  const now = new Date().toISOString();
  const editor = String(editorName || '').trim() || 'Unbekannt';
  const log = Array.isArray(ticket?.editLog) ? [...ticket.editLog] : [];
  const last = log[0];
  const canMerge =
    last &&
    last.editorName === editor &&
    last.action === action &&
    valid.length === 1 &&
    Array.isArray(last.changes) &&
    last.changes.length === 1 &&
    last.changes[0].field === valid[0].field &&
    Date.parse(now) - (Date.parse(last.timestamp || 0) || 0) < 4000;

  if (canMerge) {
    const mergedChange = { ...last.changes[0], to: valid[0].to };
    const merged = {
      ...last,
      timestamp: now,
      changes: [mergedChange],
      actionLabel:
        action === 'status_changed'
          ? `Status: ${mergedChange.from} → ${mergedChange.to}`
          : last.actionLabel || 'Bearbeitet'
    };
    return { ...ticket, editLog: [merged, ...log.slice(1)].slice(0, 200) };
  }

  const actionLabel =
    action === 'status_changed' && valid[0]
      ? `Status: ${valid[0].from} → ${valid[0].to}`
      : 'Bearbeitet';

  return {
    ...ticket,
    editLog: [
      {
        id: `lead-log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: now,
        editorName: editor,
        action,
        actionLabel,
        changes: valid
      },
      ...log
    ].slice(0, 200)
  };
}

export const CALLCENTER_SHOP = 'Call Center';
export const NACHRICHTEN_ERLEDIGT = 'Erledigt';
export const NACHRICHTEN_KEIN_VERKAUF = 'Kein Verkauf';

export function isNachrichtenArchiveChoice(value) {
  return value === NACHRICHTEN_ERLEDIGT || value === NACHRICHTEN_KEIN_VERKAUF;
}

export function shopOptionsForOrten() {
  return [...ORTEN_SHOP_OPTIONS];
}

export function shopOptionsForNachrichten() {
  return [CALLCENTER_SHOP, ...ORTEN_SHOP_OPTIONS, NACHRICHTEN_ERLEDIGT, NACHRICHTEN_KEIN_VERKAUF];
}

export function shopOptionsForTicketing() {
  return [CALLCENTER_SHOP, ...ORTEN_SHOP_OPTIONS];
}

export function shopFitsOrten(shop) {
  return ORTEN_SHOP_OPTIONS.includes(String(shop ?? '').trim());
}

export function isCallcenterShop(shop) {
  const s = String(shop ?? '').trim().toLowerCase().replace(/\s+/g, '');
  return s === 'callcenter';
}

export function normalizeNachrichtShop(shop) {
  const s = String(shop ?? '').trim();
  if (!s) return '';
  if (isCallcenterShop(s)) return CALLCENTER_SHOP;
  if (ORTEN_SHOP_OPTIONS.includes(s)) return s;
  return '';
}

export function shopAssignsTicket(shop) {
  return Boolean(normalizeNachrichtShop(shop));
}

function compactShopKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/strasse/g, 'str')
    .replace(/straße/g, 'str')
    .replace(/str\./g, 'str')
    .replace(/[^a-z0-9]/g, '');
}

const FILIALE_GROUP_BY_KEY = (() => {
  const map = new Map();
  const byId = new Map(NACHRICHTEN_FILIALE_GROUPS.map((group) => [group.id, group]));
  const add = (raw, group) => {
    const key = compactShopKey(raw);
    if (key && group) map.set(key, group);
  };
  NACHRICHTEN_FILIALE_GROUPS.forEach((group) => {
    add(group.id, group);
    add(group.shop, group);
    add(group.label, group);
  });
  Object.entries(EINSATZORT_LEGACY_MAP).forEach(([short, shop]) => {
    add(short, NACHRICHTEN_FILIALE_GROUPS.find((group) => group.shop === shop));
    add(shop, NACHRICHTEN_FILIALE_GROUPS.find((group) => group.shop === shop));
  });
  add('sonnenallee', byId.get('sonnenallee16'));
  add('sonn', byId.get('sonnenallee16'));
  add('callcenter', byId.get('callcenter'));
  add('cc', byId.get('callcenter'));
  add('km169', byId.get('km169'));
  add('km127', byId.get('km127'));
  add('k127', byId.get('km127'));
  add('km50', byId.get('km50'));
  add('turm', byId.get('turmstr47'));
  add('haupt', byId.get('hauptstr156'));
  add('kitz', byId.get('kitzingstr'));
  add('kitzing', byId.get('kitzingstr'));
  add('kitzingstr79', byId.get('kitzingstr'));
  add('kitzingstrasse79', byId.get('kitzingstr'));
  return map;
})();

export function filialeGroupChannelId(group) {
  return group?.id ? `shop:${group.id}` : '';
}

export function filialeGroupByChannel(channel) {
  const id = String(channel || '');
  if (!id.startsWith('shop:')) return null;
  const key = id.slice(5);
  return NACHRICHTEN_FILIALE_GROUPS.find((group) => group.id === key) || null;
}

export function filialeGroupForShop(shop) {
  if (!String(shop ?? '').trim()) return null;
  const normalized = normalizeNachrichtShop(shop);
  if (normalized) {
    const exact = NACHRICHTEN_FILIALE_GROUPS.find((group) => group.shop === normalized);
    if (exact) return exact;
  }
  return FILIALE_GROUP_BY_KEY.get(compactShopKey(shop)) || null;
}

export function filialeGroupForTicket(ticket) {
  return filialeGroupForShop(ticket?.shop) || filialeGroupForShop(ticket?.filiale);
}

export function isTicketInFilialeGroup(ticket) {
  return Boolean(filialeGroupForTicket(ticket));
}

export function ticketMatchesNachrichtenChannel(ticket, channel) {
  if (isLeadArchived(ticket)) return false;
  const group = filialeGroupByChannel(channel);
  const ticketGroup = filialeGroupForTicket(ticket);
  if (group) {
    if (!ticketGroup) return false;
    return ticketGroup.id === group.id;
  }
  if (ticketGroup || shopAssignsTicket(ticket?.shop) || shopAssignsTicket(ticket?.filiale)) {
    return false;
  }
  if (channel === 'all') return true;
  return normalizeSocialChannel(ticket.channel) === channel;
}

export function shopOptionLabel(shop) {
  const s = String(shop ?? '').trim();
  if (isCallcenterShop(s)) return CALLCENTER_SHOP;
  if (s === 'Sonnenallee 16') return 'Sonnenallee';
  return s;
}

const INVALID_MITARBEITER_NAMES = new Set([
  'admin',
  'Administrator',
  'Büro Mitarbeiter',
  'Marketing',
  'Callcenter',
  'Call Center',
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
  if (v.length < 3) return '';
  if (INVALID_MITARBEITER_NAMES.has(v)) return '';
  if (/^mitarbeiter(\s|$)/i.test(v)) return '';
  if (/^büro(\s|$)/i.test(v)) return '';
  if (ORTEN_SHOP_OPTIONS.includes(v)) return '';
  if (isCallcenterShop(v)) return '';
  return v;
}

function prependMitarbeiterName(names, first) {
  const out = [];
  const add = (value) => {
    const name = sanitizeMitarbeiterName(value);
    if (name && !out.includes(name)) out.push(name);
  };
  add(first);
  (Array.isArray(names) ? names : []).forEach(add);
  return out;
}

function uniqueStoredNames(values) {
  const names = [];
  (Array.isArray(values) ? values : [values]).forEach((value) => {
    const name = sanitizeMitarbeiterName(value);
    if (name && !names.includes(name)) names.push(name);
  });
  return names;
}

export function storedMitarbeiterNames(entry) {
  return uniqueStoredNames([
    entry?.mitarbeiterName,
    ...(Array.isArray(entry?.mitarbeiterNames) ? entry.mitarbeiterNames : [])
  ]);
}

export function storedShopMitarbeiterNames(entry) {
  return uniqueStoredNames([
    entry?.shopMitarbeiter,
    ...(Array.isArray(entry?.shopMitarbeiterNames) ? entry.shopMitarbeiterNames : [])
  ]);
}

export function collectMitarbeiterNames(entry) {
  const names = storedMitarbeiterNames(entry);
  const add = (value) => {
    const name = sanitizeMitarbeiterName(value);
    if (name && !names.includes(name)) names.push(name);
  };
  (Array.isArray(entry?.messages) ? entry.messages : []).forEach((message) => {
    if (message?.from === 'agent') add(message.authorName);
  });
  add(entry?.createdBy?.name);
  add(entry?.createdBy?.userName);
  add(entry?.eingabeDetails?.mitarbeiter);
  return names;
}

export function withMitarbeiter(ticket, name) {
  const nextName = sanitizeMitarbeiterName(name);
  const names = prependMitarbeiterName(storedMitarbeiterNames(ticket), nextName);
  return {
    ...ticket,
    mitarbeiterName: nextName || names[0] || sanitizeMitarbeiterName(ticket?.mitarbeiterName) || '',
    mitarbeiterNames: names
  };
}

export function assignMitarbeiter(ticket, name) {
  const names = storedMitarbeiterNames(ticket);
  const nextName = sanitizeMitarbeiterName(name);
  if (nextName && !names.includes(nextName)) return ticket;
  return {
    ...ticket,
    mitarbeiterName: nextName || names[0] || '',
    mitarbeiterNames: names
  };
}

export function rememberMitarbeiter(ticket, name) {
  const nextName = sanitizeMitarbeiterName(name);
  const current = sanitizeMitarbeiterName(ticket?.mitarbeiterName);
  const names = prependMitarbeiterName(storedMitarbeiterNames(ticket), nextName);
  return {
    ...ticket,
    mitarbeiterName: current || nextName || names[0] || '',
    mitarbeiterNames: names
  };
}

export function collectShopMitarbeiterNames(entry) {
  return storedShopMitarbeiterNames(entry);
}

export function withShopMitarbeiter(ticket, name) {
  const nextName = sanitizeMitarbeiterName(name);
  const names = prependMitarbeiterName(collectShopMitarbeiterNames(ticket), nextName);
  return {
    ...ticket,
    shopMitarbeiter: nextName || names[0] || sanitizeMitarbeiterName(ticket?.shopMitarbeiter) || '',
    shopMitarbeiterNames: names
  };
}

export function assignShopMitarbeiter(ticket, name) {
  const names = storedShopMitarbeiterNames(ticket);
  const nextName = sanitizeMitarbeiterName(name);
  if (nextName && !names.includes(nextName)) return ticket;
  return {
    ...ticket,
    shopMitarbeiter: nextName || names[0] || '',
    shopMitarbeiterNames: names
  };
}

export function lastMessageAt(ticket) {
  const last = ticket?.messages?.[ticket.messages.length - 1];
  return last?.at || ticket?.createdAt || '';
}

export function bringTicketToFront(tickets, id, at = new Date().toISOString()) {
  const list = Array.isArray(tickets) ? tickets : [];
  const idx = list.findIndex((t) => t.id === id);
  if (idx < 0) return list;
  const bumped = { ...list[idx], lastOpenedAt: at };
  if (idx === 0 && String(list[0]?.lastOpenedAt || '') === at) return list;
  return [bumped, ...list.filter((t) => t.id !== id)];
}

export function compareOffenEntries(a, b, editId = '') {
  if (editId) {
    if (a?.id === editId && b?.id !== editId) return -1;
    if (b?.id === editId && a?.id !== editId) return 1;
  }
  const ao = Date.parse(a?.lastOpenedAt || '') || 0;
  const bo = Date.parse(b?.lastOpenedAt || '') || 0;
  if (ao !== bo) return bo - ao;
  return 0;
}

export function publicWhatsAppSrc(src) {
  const s = String(src || '').trim();
  if (!s) return '';
  const prefix = '/uploads/whatsapp/';
  if (s.startsWith(prefix)) return `/api/whatsapp/files/${s.slice(prefix.length)}`;
  if (/^[A-Za-z0-9._-]+\.(jpe?g|png|gif|webp|pdf|bin)$/i.test(s)) return `/api/whatsapp/files/${s}`;
  return s;
}

function dokumentSrc(item) {
  if (typeof item === 'string') return publicWhatsAppSrc(item);
  return publicWhatsAppSrc(item?.src || item?.url || item?.href);
}

function dokumentKind(item) {
  const mime = String(item?.mime || '').toLowerCase();
  const name = `${item?.name || ''} ${item?.src || ''}`.toLowerCase();
  if (mime.includes('pdf') || name.includes('.pdf')) return 'pdf';
  if (mime.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|heic)$/i.test(name)) return 'image';
  return '';
}

export function sanitizeDokumenteHidden(list) {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const src = publicWhatsAppSrc(raw);
    if (!src || seen.has(src)) continue;
    seen.add(src);
    out.push(src);
  }
  return out.slice(0, 80);
}

export function isDokumentHidden(item, hidden) {
  const set = new Set(sanitizeDokumenteHidden(hidden));
  if (!set.size) return false;
  const src = dokumentSrc(item);
  const id = String(item?.id || '').trim();
  return Boolean((src && set.has(src)) || (id && (set.has(id) || set.has(publicWhatsAppSrc(id)))));
}

export function sanitizeTicketDokumente(list) {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const src = dokumentSrc(raw);
    if (!src || seen.has(src)) continue;
    const kind = raw?.kind === 'pdf' || raw?.kind === 'image' ? raw.kind : dokumentKind(raw);
    if (kind !== 'pdf' && kind !== 'image') continue;
    seen.add(src);
    out.push({
      id: String(raw?.id || src).slice(0, 120),
      src,
      name: String(raw?.name || (kind === 'pdf' ? 'Dokument.pdf' : 'Bild')).trim().slice(0, 120) || (kind === 'pdf' ? 'Dokument.pdf' : 'Bild'),
      mime: String(raw?.mime || (kind === 'pdf' ? 'application/pdf' : 'image/jpeg')).slice(0, 80),
      kind,
      source: raw?.source === 'chat' ? 'chat' : 'upload',
      at: String(raw?.at || raw?.uploadedAt || '').trim(),
      uploadedBy: String(raw?.uploadedBy || '').trim()
    });
  }
  return out.slice(0, 60);
}

export function mergeTicketDokumente(prev, remote) {
  return sanitizeTicketDokumente([
    ...(Array.isArray(prev) ? prev : []),
    ...(Array.isArray(remote) ? remote : [])
  ]);
}

export function ticketDokumente(ticket) {
  const fromChat = [];
  for (const message of Array.isArray(ticket?.messages) ? ticket.messages : []) {
    const at = String(message?.at || '').trim();
    const images = Array.isArray(message?.images) ? message.images : [];
    if (images.length) {
      for (const img of images) {
        fromChat.push({
          ...(typeof img === 'object' && img ? img : { src: img }),
          kind: 'image',
          mime: img?.mime || 'image/jpeg',
          source: 'chat',
          at
        });
      }
    } else if (message?.image) {
      fromChat.push({
        id: `${message.id || 'msg'}-img`,
        src: message.image,
        kind: 'image',
        mime: 'image/jpeg',
        source: 'chat',
        at
      });
    }
    for (const file of Array.isArray(message?.files) ? message.files : []) {
      fromChat.push({ ...file, source: 'chat', at });
    }
  }
  return sanitizeTicketDokumente([
    ...fromChat,
    ...(Array.isArray(ticket?.dokumente) ? ticket.dokumente : [])
  ]).filter((item) => !isDokumentHidden(item, ticket?.dokumenteHidden));
}

function validIsoTime(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  return Number.isNaN(Date.parse(raw)) ? '' : raw;
}

export function firstCustomerMessageAt(ticket) {
  const messages = Array.isArray(ticket?.messages) ? ticket.messages : [];
  const first = messages.find((m) => m?.from === 'customer' && validIsoTime(m?.at));
  return validIsoTime(first?.at) || validIsoTime(ticket?.createdAt);
}

export function firstStaffOpenAt(ticket) {
  const stored = validIsoTime(ticket?.geoeffnetAt);
  if (stored) return stored;
  const log = Array.isArray(ticket?.editLog) ? ticket.editLog : [];
  for (let i = log.length - 1; i >= 0; i -= 1) {
    const stamp = validIsoTime(log[i]?.timestamp);
    if (stamp) return stamp;
  }
  const messages = Array.isArray(ticket?.messages) ? ticket.messages : [];
  const agent = messages.find((m) => (
    m?.from === 'agent'
    && m?.auto !== 'welcome'
    && m?.auto !== 'followup'
    && validIsoTime(m?.at)
  ));
  return validIsoTime(agent?.at);
}

export function ensureTicketGeoeffnetAt(ticket, now = new Date()) {
  return firstStaffOpenAt(ticket) || (now.toISOString ? now.toISOString() : new Date().toISOString());
}

export function formatDurationDe(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '';
  const hours = Math.round((ms / 3600000) * 10) / 10;
  return String(hours);
}

function kontaktversuchAktionStartAt(ticket, n) {
  if (n > 1) {
    const prevAt = validIsoTime(ticket?.[kontaktversuchZeitAtKey(n - 1)]);
    if (prevAt) return prevAt;
  }
  return firstStaffOpenAt(ticket) || validIsoTime(ticket?.createdAt);
}

export function kontaktversuchZeitValue(ticket, n, now = new Date()) {
  const start = Date.parse(kontaktversuchAktionStartAt(ticket, n) || ensureTicketGeoeffnetAt(ticket, now));
  const endAt = validIsoTime(ticket?.[kontaktversuchZeitAtKey(n)]);
  const end = endAt ? Date.parse(endAt) : (now.getTime ? now.getTime() : Date.now());
  if (!Number.isFinite(start) || !Number.isFinite(end)) return '';
  return formatDurationDe(end - start);
}

export function marketingErstkontaktValue(ticket) {
  const start = Date.parse(firstCustomerMessageAt(ticket) || '');
  const opened = firstStaffOpenAt(ticket);
  const end = opened ? Date.parse(opened) : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return '';
  return formatDurationDe(end - start);
}

export function countUnreadLeadTickets(tickets) {
  return (tickets || []).filter((t) => {
    if (!t?.unread) return false;
    if (isManualLeadTicket(t) || isLeadArchived(t)) return false;
    return true;
  }).length;
}

function pad3(n) {
  return String(n).padStart(3, '0');
}

function shortDateStamp(date = new Date()) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear()).slice(-2);
  return `${d}${m}${y}`;
}

function compressLeadDateKey(dateKey) {
  const key = String(dateKey ?? '');
  if (key.length === 8) return `${key.slice(0, 4)}${key.slice(6, 8)}`;
  return key;
}

function parseLeadId(id) {
  const s = String(id ?? '').trim();
  let m = s.match(/^(FB|FA|IG|TT|TK|CC|WA)-(\d{6})-(\d{1,3})$/i);
  if (m) {
    return {
      prefix: m[1].toUpperCase() === 'FA' ? 'FB' : m[1].toUpperCase(),
      dateKey: m[2],
      seq: Number.parseInt(m[3], 10)
    };
  }
  m = s.match(/^(FB|FA|IG|TT|TK|CC|WA)(\d{6})(\d{3,})$/i);
  if (m) {
    return {
      prefix: m[1].toUpperCase() === 'FA' ? 'FB' : m[1].toUpperCase(),
      dateKey: m[2],
      seq: Number.parseInt(m[3], 10)
    };
  }
  m = s.match(/^(CC|WA|FB|FA|IG|TT|TK)-(\d{8})-(\d+)$/i);
  if (m) {
    return {
      prefix: m[1].toUpperCase() === 'FA' ? 'FB' : m[1].toUpperCase(),
      dateKey: compressLeadDateKey(m[2]),
      seq: Number.parseInt(m[3], 10)
    };
  }
  return null;
}

function formatLeadId(prefix, dateKey, seq) {
  const p = String(prefix).toUpperCase() === 'FA' ? 'FB' : String(prefix).toUpperCase();
  return `${p}-${compressLeadDateKey(dateKey)}-${pad3(seq)}`;
}

export function displayTicketId(ticket) {
  const nr = String(ticket?.ticketNr || '').trim();
  if (parseLeadId(nr)) return nr;
  const parsed = parseLeadId(ticket?.id);
  if (parsed) return formatLeadId(parsed.prefix, parsed.dateKey, parsed.seq);
  return String(ticket?.id || '');
}

export function normalizeSocialChannel(value) {
  const v = String(value ?? '').trim().toLowerCase();
  if (v === 'whatsapp' || v === 'wa') return 'whatsapp';
  if (v === 'instagram' || v === 'ig') return 'instagram';
  if (v === 'tiktok' || v === 'tt') return 'tiktok';
  if (v === 'ticket' || v === 'tk' || v === 'intern' || v === 'telefon') return MANUAL_TICKET_CHANNEL;
  if (v === 'facebook' || v === 'fb') return 'facebook';
  return 'facebook';
}

export function looksLikePhoneNumber(value) {
  const s = String(value ?? '').trim();
  if (!s || s.startsWith('@')) return false;
  return s.replace(/\D/g, '').length >= 8;
}

export function phoneDigits(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  let digits = s.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  digits = digits.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `49${digits.slice(1)}`;
  return digits;
}

export function leadPhoneNumber(ticket) {
  const ruf = String(ticket?.rufnummer || '').trim();
  if (looksLikePhoneNumber(ruf)) return ruf;
  const handle = String(ticket?.handle || '').trim();
  if (looksLikePhoneNumber(handle)) return handle;
  const wa = String(ticket?.waId || '').replace(/\D/g, '');
  if (wa.length >= 8) return wa;
  return '';
}

export function telHrefFromPhone(raw) {
  const digits = phoneDigits(raw);
  return digits ? `tel:+${digits}` : null;
}

export function whatsappHrefFromPhone(raw) {
  const digits = phoneDigits(raw);
  return digits ? `https://wa.me/${digits}` : null;
}

export function channelShort(channel) {
  const id = normalizeSocialChannel(channel);
  if (id === MANUAL_TICKET_CHANNEL) return 'TK';
  return SOCIAL_CHANNELS.find((c) => c.id === id)?.short || 'FB';
}

export function channelLabel(channel) {
  const id = normalizeSocialChannel(channel);
  if (id === MANUAL_TICKET_CHANNEL) return 'Ticket';
  return SOCIAL_CHANNELS.find((c) => c.id === id)?.label || 'Facebook';
}

export function createManualLeadTicket({ tickets = [], agentName = '', now = new Date() } = {}) {
  const createdAt = now.toISOString ? now.toISOString() : new Date().toISOString();
  const id = nextLeadId(tickets, now instanceof Date ? now : new Date(), MANUAL_TICKET_CHANNEL);
  return withShopMitarbeiter({
    ...emptyLeadForm(),
    id,
    ticketNr: id,
    channel: MANUAL_TICKET_CHANNEL,
    customerName: MANUAL_TICKET_NAME,
    handle: '',
    unread: false,
    createdAt,
    geoeffnetAt: createdAt,
    lastOpenedAt: createdAt,
    messages: [],
    source: 'manual',
    shop: '',
    ticketStatus: 'Offen'
  }, agentName);
}

export function migrateLeadId(ticket) {
  const channel = normalizeSocialChannel(ticket?.channel);
  const short = channelShort(channel);
  const parsed = parseLeadId(ticket?.id);
  if (!parsed) return String(ticket?.id || '');
  return formatLeadId(short, parsed.dateKey, parsed.seq);
}

export function nextLeadId(tickets = [], date = new Date(), channel = 'facebook') {
  const short = channelShort(channel);
  const dateKey = shortDateStamp(date);
  let max = 0;
  tickets.forEach((t) => {
    const parsed = parseLeadId(t?.id);
    if (!parsed || parsed.prefix !== short.toUpperCase() || parsed.dateKey !== dateKey) return;
    if (Number.isFinite(parsed.seq) && parsed.seq > max) max = parsed.seq;
  });
  return formatLeadId(short, dateKey, max + 1);
}

const DEMO_LEAD_IDS = new Set([
  'FB310826001',
  'IG310826002',
  'FB310826003',
  'TT310826004',
  'FB310826005',
  'IG310826006',
  'WA310826007'
]);

const CUSTOMER_VOICE_DEMO_ID = 'cc-007-voice';

function makeDemoVoiceSrc(seconds = 2) {
  const sampleRate = 8000;
  const samples = Math.floor(sampleRate * seconds);
  const dataSize = samples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const write = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  write(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < samples; i += 1) {
    const t = i / sampleRate;
    const env = Math.min(1, i / 200, (samples - i) / 400);
    const sample = Math.sin(2 * Math.PI * 440 * t) * 0.32 * env;
    view.setInt16(44 + i * 2, Math.round(sample * 32767), true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function hydrateVoiceMessage(message) {
  if (!message) return message;
  if (Array.isArray(message.voices) && message.voices.some((voice) => voice && voice.src)) return message;
  if (!message.voiceDemo) return message;
  const duration = Math.max(1, Number(message.duration) || 2);
  return {
    ...message,
    voices: [{
      id: `${message.id || 'voice'}-src`,
      src: makeDemoVoiceSrc(duration),
      duration
    }]
  };
}

function isDemoLeadTicket(ticket) {
  const id = String(ticket?.id || '');
  if (isLiveWhatsAppTicket(ticket) || id.startsWith('WA-')) return false;
  if (DEMO_LEAD_IDS.has(id)) return true;
  const messages = Array.isArray(ticket?.messages) ? ticket.messages : [];
  if (!messages.length) return false;
  return messages.every((message) => {
    const messageId = String(message?.id || '');
    return message?.voiceDemo || messageId === CUSTOMER_VOICE_DEMO_ID || /^cc-00\d/.test(messageId);
  });
}

function withoutDemoMessages(ticket) {
  const messages = (Array.isArray(ticket?.messages) ? ticket.messages : []).filter((message) => {
    const messageId = String(message?.id || '');
    return messageId !== CUSTOMER_VOICE_DEMO_ID && !message?.voiceDemo && !/^cc-00\d/.test(messageId);
  });
  return { ...ticket, messages };
}

export function leadToNeuEntry(lead) {
  const channel = normalizeSocialChannel(lead.channel);
  return {
    id: migrateLeadId({ ...lead, channel }),
    ticketNr: String(lead?.ticketNr || '').trim(),
    source: 'lead',
    channel,
    customerName: lead.customerName,
    handle: lead.handle,
    rufnummer: lead.rufnummer,
    waId: lead.waId,
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
    createdAt: lead.createdAt || (Array.isArray(lead.messages) ? lead.messages[0]?.at : '') || '',
    ticketStatus: migrateLeadTicketStatus(lead.ticketStatus),
    priority: normalizeTicketPriority(lead.priority),
    sprache: leadSprache(lead.sprache),
    nachrichtArt: normalizeNachrichtArt(lead.nachrichtArt),
    mitarbeiterName: sanitizeMitarbeiterName(lead.mitarbeiterName) || storedMitarbeiterNames(lead)[0] || '',
    mitarbeiterNames: storedMitarbeiterNames(lead),
    shopMitarbeiter: sanitizeMitarbeiterName(lead.shopMitarbeiter) || storedShopMitarbeiterNames(lead)[0] || '',
    shopMitarbeiterNames: storedShopMitarbeiterNames(lead),
    kundenbesuchDatum: String(lead?.kundenbesuchDatum || '').trim(),
    lastOpenedAt: String(lead?.lastOpenedAt || '').trim(),
    editLog: Array.isArray(lead.editLog) ? lead.editLog : []
  };
}

function hydrateLeadTicket(t) {
  const channel = normalizeSocialChannel(t?.channel);
  const withChannel = { ...t, channel };
  return {
    ...emptyLeadForm(),
    ...withChannel,
    id: migrateLeadId(withChannel),
    ticketNr: String(t?.ticketNr || '').trim(),
    channel,
    messages: (Array.isArray(t?.messages) ? t.messages : [])
      .filter((message) => !isPendingOutgoingMessage(message))
      .map(hydrateVoiceMessage),
    ticketStatus: migrateLeadTicketStatus(t?.ticketStatus),
    priority: normalizeTicketPriority(t?.priority),
    sprache: leadSprache(t?.sprache),
    nachrichtArt: normalizeNachrichtArt(t?.nachrichtArt),
    shop: normalizeNachrichtShop(t?.shop) || t?.shop || '',
    mitarbeiterName: sanitizeMitarbeiterName(t?.mitarbeiterName) || storedMitarbeiterNames(t)[0] || '',
    shopMitarbeiter: sanitizeMitarbeiterName(t?.shopMitarbeiter) || storedShopMitarbeiterNames(t)[0] || '',
    shopMitarbeiterNames: storedShopMitarbeiterNames(t),
    mocKn: String(t?.mocKn || '').trim(),
    geoeffnetAt: String(t?.geoeffnetAt || '').trim(),
    lastOpenedAt: String(t?.lastOpenedAt || '').trim(),
    dokumente: sanitizeTicketDokumente(t?.dokumente)
      .filter((item) => !isDokumentHidden(item, t?.dokumenteHidden)),
    dokumenteHidden: sanitizeDokumenteHidden(t?.dokumenteHidden),
    kundenbesuchDatum: String(t?.kundenbesuchDatum || '').trim(),
    kontaktversuchCount: kontaktversuchCountFor(t),
    mitarbeiterNames: storedMitarbeiterNames(withChannel),
    editLog: Array.isArray(t?.editLog) ? t.editLog : [],
    liveWhatsApp: Boolean(t?.liveWhatsApp || t?.waId),
    waId: String(t?.waId || '').trim(),
    inboxGroup: String(t?.inboxGroup || '').trim(),
    customAnswers: t?.customAnswers && typeof t.customAnswers === 'object' && !Array.isArray(t.customAnswers)
      ? t.customAnswers
      : {}
  };
}

export function loadLeadTickets() {
  try {
    const raw = localStorage.getItem(LEAD_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map(hydrateLeadTicket)
          .filter((ticket) => !isDemoLeadTicket(ticket))
          .map(withoutDemoMessages)
          .map(withFirstMessageAutoReply);
      }
    }
  } catch {
    /* Store ungültig */
  }
  return [];
}

function toStoredInboxTicket(ticket) {
  const messages = Array.isArray(ticket?.messages) ? ticket.messages : [];
  const last = messages[messages.length - 1];
  return {
    ...ticket,
    messagesLite: true,
    messageCount: messages.length,
    messages: last ? [{
      id: last.id,
      from: last.from,
      at: last.at,
      text: String(last.text || '').slice(0, 280),
      auto: last.auto || '',
      hasImages: Boolean((last.images && last.images.length) || last.image || last.hasImages),
      hasVoice: Boolean((last.voices && last.voices.length) || last.voice || last.hasVoice),
      hasFiles: Boolean((last.files && last.files.length) || last.hasFiles),
      hasVideos: Boolean((last.videos && last.videos.length) || last.hasVideos)
    }] : []
  };
}

export function saveLeadTickets(tickets) {
  try {
    localStorage.setItem(
      LEAD_STORAGE_KEY,
      JSON.stringify((tickets || []).map(toStoredInboxTicket))
    );
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
