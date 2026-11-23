import { readJsonStore, updateJsonStore } from './jsonClusterStore.js';
import { stadtForTicket } from './stadtDeutsch.js';
import { loadTicketQuestionConfig } from './ticketQuestionConfig.js';

export const AUTO_FLOW_FILE = 'auto-question-flow.json';

const LOCALES = ['de', 'ar', 'en'];
export const KNOWN_TICKET_FIELDS = new Set([
  'o2Kunde',
  'angebot',
  'produktNotiz',
  'stadt',
  'marketingNotiz',
  'rufnummer',
  'terminDatum',
  'terminZeit',
  'customerName'
]);

const ID_RE = /^[A-Za-z][A-Za-z0-9_-]{0,40}$/;
const REPLY_RE = /^[A-Za-z0-9:._-]{1,200}$/;

function clip(value, max) {
  return String(value || '').trim().slice(0, max);
}

function textPack(raw, fallback = '') {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const de = clip(src.de || fallback, 1000);
  return {
    de,
    ar: clip(src.ar, 1000) || de,
    en: clip(src.en, 1000) || de
  };
}

function optionalTextPack(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    de: clip(src.de, 1000),
    ar: clip(src.ar, 1000),
    en: clip(src.en, 1000)
  };
}

function packHasText(pack) {
  const src = pack && typeof pack === 'object' ? pack : {};
  return LOCALES.some((loc) => Boolean(String(src[loc] || '').trim()));
}

function enabledFlag(source, key, pack) {
  if (source?.[key] === true) return true;
  if (source?.[key] === false) return false;
  return packHasText(pack);
}

export function defaultAutoQuestionFlow() {
  return {
    waitSeconds: 60,
    followupWaitHours: 23,
    followupEnabled: false,
    followupText: { de: '', ar: '', en: '' },
    abholbereitEnabled: false,
    abholbereitText: { de: '', ar: '', en: '' },
    erledigtEnabled: false,
    erledigtText: { de: '', ar: '', en: '' },
    finaleEnabled: false,
    finaleText: { de: '', ar: '', en: '' },
    startId: 'o2Kunde',
    questions: [
      {
        id: 'o2Kunde',
        label: 'O2 Kunde?',
        kind: 'choice',
        saveAs: 'o2Kunde',
        text: {
          de: 'Sind Sie bereits O2-Kunde?',
          ar: 'هل أنت عميل O2 حالياً؟',
          en: 'Are you already an O2 customer?'
        },
        options: [
          {
            value: 'Ja',
            replyId: 'o2:Ja',
            prompt: false,
            title: { de: 'Ja', ar: 'نعم', en: 'Yes' },
            next: ['stadt']
          },
          {
            value: 'Nein',
            replyId: 'o2:Nein',
            prompt: false,
            title: { de: 'Nein', ar: 'لا', en: 'No' },
            next: ['stadt']
          }
        ],
        next: []
      },
      {
        id: 'angebot',
        label: 'Produkt?',
        kind: 'choice',
        saveAs: 'angebot',
        text: {
          de: 'Welches Angebot oder Produkt möchten Sie?',
          ar: 'أي عرض أو منتج ترغب به؟',
          en: 'Which offer or product would you like?'
        },
        options: [
          'Gold',
          'Sonstiges',
          'S26 Ultra',
          'IP 17 Pro Max',
          'DSL',
          'SIM Only'
        ].map((name) => ({
          value: name,
          replyId: `angebot:${name.replace(/[^A-Za-z0-9]+/g, '')}`,
          prompt: false,
          title: { de: name, ar: name, en: name },
          next: []
        })),
        next: []
      },
      {
        id: 'stadt',
        label: 'Stadt?',
        kind: 'choice',
        saveAs: 'stadt',
        text: {
          de: 'In welcher Stadt sind Sie?',
          ar: 'في أي مدينة أنت؟',
          en: 'Which city are you in?'
        },
        options: [
          {
            value: 'Berlin',
            replyId: 'stadt:Berlin',
            prompt: false,
            title: { de: 'Berlin', ar: 'برلين', en: 'Berlin' },
            next: []
          },
          {
            value: 'außerhalb Berlin',
            replyId: 'stadt:out',
            prompt: false,
            title: { de: 'außerhalb Berlin', ar: 'خارج برلين', en: 'outside Berlin' },
            next: []
          },
          {
            value: '',
            replyId: 'stadt:custom',
            prompt: true,
            title: { de: 'selbst schreiben', ar: 'اكتب بنفسك', en: 'type yourself' },
            next: ['stadtText']
          }
        ],
        next: []
      },
      {
        id: 'stadtText',
        label: 'Stadt schreiben',
        kind: 'text',
        saveAs: 'stadt',
        text: {
          de: 'Bitte schreiben Sie den Städtenamen.',
          ar: 'يرجى كتابة اسم المدينة.',
          en: 'Please type the city name.'
        },
        options: [],
        next: []
      }
    ]
  };
}

function cleanNext(list, ids, selfId) {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const id = String(raw || '').trim();
    if (!id || id === selfId || !ids.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function resolvedOptionTitle(option, locale) {
  const title = option?.title || {};
  const loc = LOCALES.includes(locale) ? locale : 'de';
  return String(title[loc] || title.de || option?.value || '').trim();
}

export function normalizeAutoQuestionFlow(raw, { strict = false } = {}) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const incoming = Array.isArray(source.questions) ? source.questions : [];
  const questions = [];
  const seenIds = new Set();

  for (const item of incoming.slice(0, 30)) {
    if (!item || typeof item !== 'object') continue;
    const id = String(item.id || '').trim();
    if (!ID_RE.test(id) || seenIds.has(id)) {
      if (strict) return { flow: null, error: 'Jede Frage braucht eine eigene gültige Kennung.' };
      continue;
    }
    seenIds.add(id);
    const kind = item.kind === 'text' ? 'text' : 'choice';
    const label = clip(item.label, 80) || id;
    let saveAs = String(item.saveAs || '').trim();
    const customSave = /^cq-[A-Za-z0-9_-]{1,40}$/.test(saveAs);
    if (saveAs && !KNOWN_TICKET_FIELDS.has(saveAs) && !customSave) {
      if (strict) return { flow: null, error: `Unbekanntes Ticketfeld bei „${label}“.` };
      saveAs = '';
    }
    if (!saveAs && KNOWN_TICKET_FIELDS.has(id)) saveAs = id;
    const options = [];
    if (kind === 'choice') {
      const rawOptions = Array.isArray(item.options) ? item.options.slice(0, 10) : [];
      rawOptions.forEach((opt, index) => {
        if (!opt || typeof opt !== 'object') return;
        const prompt = Boolean(opt.prompt);
        const value = prompt ? '' : clip(opt.value, 80);
        if (!prompt && !value) return;
        const replyId = REPLY_RE.test(String(opt.replyId || ''))
          ? String(opt.replyId)
          : `opt:${id}:${index}`;
        options.push({
          value,
          replyId,
          prompt,
          title: {
            de: clip(opt.title?.de || value, 80),
            ar: clip(opt.title?.ar, 80),
            en: clip(opt.title?.en, 80)
          },
          next: Array.isArray(opt.next) ? opt.next : []
        });
      });
    }
    questions.push({
      id,
      label,
      kind,
      saveAs,
      text: textPack(item.text, label),
      options,
      next: Array.isArray(item.next) ? item.next : []
    });
  }

  if (!questions.length) {
    if (strict) return { flow: null, error: 'Mindestens eine Frage ist nötig.' };
    return { flow: defaultAutoQuestionFlow(), error: '' };
  }

  const ids = new Set(questions.map((q) => q.id));
  for (const question of questions) {
    question.next = cleanNext(question.next, ids, question.id);
    question.options = question.options.map((opt) => ({
      ...opt,
      next: cleanNext(opt.next, ids, question.id)
    }));
    if (question.kind === 'choice' && question.options.length < 1) {
      if (strict) return { flow: null, error: `„${question.label}“ braucht mindestens einen Dropdown-Wert.` };
    }
    if (question.kind === 'choice' && question.options.length > 10) {
      question.options = question.options.slice(0, 10);
    }
    if (strict && question.kind === 'choice') {
      const limit = question.options.length <= 3 ? 20 : 24;
      for (const opt of question.options) {
        for (const locale of LOCALES) {
          const title = resolvedOptionTitle(opt, locale);
          if (!title) return { flow: null, error: `„${question.label}“ hat einen leeren Wert.` };
          if (title.length > limit) {
            return {
              flow: null,
              error: question.options.length <= 3
                ? `Button-Text ist länger als 20 Zeichen: „${title}“.`
                : `Listen-Text ist länger als 24 Zeichen: „${title}“.`
            };
          }
        }
        const titles = LOCALES.map((locale) => resolvedOptionTitle(opt, locale));
        const dup = question.options.filter((other) => other !== opt && LOCALES.some((locale) => {
          const a = resolvedOptionTitle(opt, locale);
          const b = resolvedOptionTitle(other, locale);
          return a && a === b;
        }));
        if (dup.length) {
          return { flow: null, error: `Dieselben Button-Texte gehen nicht: „${titles[0]}“.` };
        }
      }
    }
  }

  let waitSeconds = Math.round(Number(source.waitSeconds));
  if (!Number.isFinite(waitSeconds)) waitSeconds = 60;
  if (strict && (waitSeconds < 5 || waitSeconds > 600)) {
    return { flow: null, error: 'Wartezeit zwischen 5 und 600 Sekunden.' };
  }
  waitSeconds = Math.min(600, Math.max(5, waitSeconds));

  let followupWaitHours = Math.round(Number(source.followupWaitHours));
  if (!Number.isFinite(followupWaitHours)) followupWaitHours = 23;
  if (strict && (followupWaitHours < 1 || followupWaitHours > 23)) {
    return { flow: null, error: 'Erinnerung zwischen 1 und 23 Stunden.' };
  }
  followupWaitHours = Math.min(23, Math.max(1, followupWaitHours));
  const followupText = optionalTextPack(source.followupText);
  const abholbereitText = optionalTextPack(source.abholbereitText);
  const erledigtText = optionalTextPack(source.erledigtText);
  const finaleText = optionalTextPack(source.finaleText);
  const followupEnabled = enabledFlag(source, 'followupEnabled', followupText);
  const abholbereitEnabled = enabledFlag(source, 'abholbereitEnabled', abholbereitText);
  const erledigtEnabled = enabledFlag(source, 'erledigtEnabled', erledigtText);
  const finaleEnabled = enabledFlag(source, 'finaleEnabled', finaleText);

  let startId = String(source.startId || '').trim();
  if (!ids.has(startId)) startId = questions[0].id;
  if (strict && !ids.has(String(source.startId || '').trim())) {
    return { flow: null, error: 'Die erste Frage fehlt.' };
  }

  return {
    flow: {
      waitSeconds,
      followupWaitHours,
      followupEnabled,
      followupText,
      abholbereitEnabled,
      abholbereitText,
      erledigtEnabled,
      erledigtText,
      finaleEnabled,
      finaleText,
      startId,
      questions
    },
    error: ''
  };
}

export function loadAutoQuestionFlow() {
  const stored = readJsonStore(AUTO_FLOW_FILE, null);
  if (!stored || typeof stored !== 'object' || !Array.isArray(stored.questions) || !stored.questions.length) {
    return defaultAutoQuestionFlow();
  }
  return normalizeAutoQuestionFlow(stored).flow;
}

export function saveAutoQuestionFlow(raw) {
  const { flow, error } = normalizeAutoQuestionFlow(raw, { strict: true });
  if (error) return { flow: null, error };
  updateJsonStore(AUTO_FLOW_FILE, defaultAutoQuestionFlow(), (state) => {
    for (const key of Object.keys(state)) delete state[key];
    Object.assign(state, flow);
  });
  return { flow, error: '' };
}

export function flowWaitMs(flow = loadAutoQuestionFlow()) {
  const n = Math.round(Number(flow?.waitSeconds));
  const seconds = Number.isFinite(n) ? Math.min(600, Math.max(5, n)) : 60;
  return seconds * 1000;
}

export function followupWaitMs(flow = loadAutoQuestionFlow()) {
  const n = Math.round(Number(flow?.followupWaitHours));
  const hours = Number.isFinite(n) ? Math.min(23, Math.max(1, n)) : 23;
  return hours * 60 * 60 * 1000;
}

export function followupTextForLocale(flow, locale) {
  if (flow?.followupEnabled === false) return '';
  return localeTextPack(flow?.followupText, locale);
}

export function statusAutoTextForLocale(flow, status, locale) {
  const name = String(status || '').trim();
  if (name === 'Erledigt') {
    if (flow?.erledigtEnabled === false) return '';
    return localeTextPack(flow?.erledigtText, locale);
  }
  if (name === 'Abholbereit') {
    if (flow?.abholbereitEnabled === false) return '';
    return localeTextPack(flow?.abholbereitText, locale);
  }
  return '';
}

export function finaleTextForLocale(flow, locale) {
  if (flow?.finaleEnabled === false) return '';
  return localeTextPack(flow?.finaleText, locale);
}

export function displayTicketId(ticket) {
  const nr = String(ticket?.ticketNr || '').trim();
  if (nr) return nr;
  return String(ticket?.id || '').trim();
}

export function fillTicketPlaceholders(text, ticket) {
  const id = displayTicketId(ticket);
  return String(text || '').replace(/\{(?:ticket[-_ ]?(?:id|nr)|id)\}/gi, id);
}

export const TICKET_ID_NOTICE = {
  de: 'Deine Ticketnummer lautet {ID}.\nBitte bewahre sie auf und gib sie bei jeder erneuten Kontaktaufnahme an.',
  ar: 'رقم تذكرتك هو {ID}.\nيرجى الاحتفاظ به وذكره عند كل تواصل جديد.',
  en: 'Your ticket number is {ID}.\nPlease keep it and give it whenever you contact us again.'
};

export function ticketIdNoticeForLocale(locale) {
  const loc = LOCALES.includes(locale) ? locale : 'de';
  return TICKET_ID_NOTICE[loc] || TICKET_ID_NOTICE.de;
}

export function isClosingAckText(value) {
  const t = String(value || '').toLowerCase();
  return t.includes('angaben erhalten')
    || t.includes('schnellstmöglich')
    || t.includes('we will get back')
    || t.includes('details received')
    || t.includes('تم استلام')
    || t.includes('سنتواصل');
}

export function isClosingAckQuestion(question) {
  return [question?.label, question?.text?.de, question?.text?.ar, question?.text?.en]
    .some((value) => isClosingAckText(value));
}

function questionSearchText(question) {
  return [
    question?.id,
    question?.label,
    question?.saveAs,
    question?.text?.de,
    question?.text?.ar,
    question?.text?.en
  ].map((value) => String(value || '').toLowerCase()).join('\n');
}

export function isCustomerPhoneQuestion(question) {
  const hay = questionSearchText(question);
  if (/whatsapp/.test(hay)) return false;
  return /telefonnummer/.test(hay)
    || /phone number/.test(hay)
    || (/رقم/.test(hay) && /هاتف/.test(hay));
}

export function kundenTelefonFieldId() {
  const custom = loadTicketQuestionConfig()?.config?.custom || [];
  const found = custom.find((item) => {
    const label = String(item?.label || '').trim().replace(/\?+$/, '').toLowerCase();
    return label === 'telefonnummer des kunden' || label === 'telefonnummer';
  });
  if (found?.id) return found.id;
  const tel = custom.find((item) => item?.type === 'tel');
  return tel?.id || '';
}

function localeTextPack(pack, locale) {
  const src = pack && typeof pack === 'object' ? pack : {};
  const loc = LOCALES.includes(locale) ? locale : 'de';
  return String(src[loc] || src.de || src.ar || src.en || '').trim();
}

export function findFlowQuestion(flow, id) {
  return (flow?.questions || []).find((q) => q.id === id) || null;
}

export function matchFlowOption(question, replyId, text) {
  const options = question?.options || [];
  const id = String(replyId || '').trim();
  if (id) {
    const byReply = options.find((opt) => opt.replyId === id);
    if (byReply) return byReply;
    const indexMatch = id.match(/^opt:[^:]+:(\d+)$/);
    if (indexMatch) {
      const opt = options[Number(indexMatch[1])];
      if (opt) return opt;
    }
  }
  const needle = String(text || id || '').trim().toLowerCase();
  if (!needle) return null;
  return options.find((opt) => {
    const titles = [opt.value, opt.replyId, opt.title?.de, opt.title?.ar, opt.title?.en]
      .map((v) => String(v || '').trim().toLowerCase())
      .filter(Boolean);
    return titles.includes(needle);
  }) || null;
}

export function savesCity(question) {
  return question?.saveAs === 'stadt' || question?.id === 'stadt' || question?.id === 'stadtText';
}

export function normalizeFlowAnswer(question, raw) {
  const text = String(raw || '').trim().slice(0, 80);
  if (!text) return '';
  if (savesCity(question)) return (stadtForTicket(text) || text).slice(0, 80);
  return text;
}

export function queueAfter(branch, remaining) {
  const first = Array.isArray(branch) ? branch : [];
  const rest = Array.isArray(remaining) ? remaining : [];
  const seen = new Set();
  const out = [];
  for (const id of [...first, ...rest]) {
    const key = String(id || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= 20) break;
  }
  return out;
}
