import { readJsonStore, updateJsonStore } from './jsonClusterStore.js';
import { stadtForTicket } from './stadtDeutsch.js';

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

export function defaultAutoQuestionFlow() {
  return {
    waitSeconds: 60,
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
    if (saveAs && !KNOWN_TICKET_FIELDS.has(saveAs)) {
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
          title: textPack(opt.title, value),
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

  let startId = String(source.startId || '').trim();
  if (!ids.has(startId)) startId = questions[0].id;
  if (strict && !ids.has(String(source.startId || '').trim())) {
    return { flow: null, error: 'Die erste Frage fehlt.' };
  }

  return { flow: { waitSeconds, startId, questions }, error: '' };
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
