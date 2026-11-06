import { questionDropdownOptions } from './callcenterLeadData';
import { getAutoQuestionFlowApi, saveAutoQuestionFlowApi } from '../../services/whatsapp.service';

const PRODUKT_TEXT = {
  de: 'Welches Angebot oder Produkt möchten Sie?',
  ar: 'أي عرض أو منتج ترغب به؟',
  en: 'Which offer or product would you like?'
};

export function isProduktQuestion(question) {
  return question?.id === 'angebot' || question?.saveAs === 'angebot';
}

export function produktOptionKey(flow) {
  const question = (flow?.questions || []).find(isProduktQuestion);
  return (question?.options || []).map((opt) => String(opt?.value || '')).join('\n');
}

function uniqueTitle(name, used, max) {
  const base = String(name || '').trim();
  let title = base.slice(0, max);
  if (!used.has(title)) {
    used.add(title);
    return title;
  }
  for (let n = 2; n < 30; n += 1) {
    const suffix = String(n);
    const cut = `${base.slice(0, Math.max(1, max - suffix.length))}${suffix}`;
    if (!used.has(cut)) {
      used.add(cut);
      return cut;
    }
  }
  used.add(title);
  return title;
}

export function applyProduktOptions(flow, names) {
  const source = flow && typeof flow === 'object' ? flow : { questions: [] };
  const wanted = [];
  const seen = new Set();
  (Array.isArray(names) ? names : []).forEach((raw) => {
    const name = String(raw || '').trim().slice(0, 80);
    const key = name.toLowerCase();
    if (!name || seen.has(key) || wanted.length >= 10) return;
    seen.add(key);
    wanted.push(name);
  });
  if (!wanted.length) return source;

  const questions = (source.questions || []).map((q) => ({
    ...q,
    options: (q.options || []).map((opt) => ({ ...opt, title: { ...(opt.title || {}) }, next: [...(opt.next || [])] }))
  }));
  const index = questions.findIndex(isProduktQuestion);
  const prev = index >= 0 ? questions[index] : null;
  const prevByValue = new Map((prev?.options || []).map((opt) => [String(opt.value || ''), opt]));
  const usedTitles = new Set();
  const usedIds = new Set();
  const maxTitle = wanted.length <= 3 ? 20 : 24;
  const options = wanted.map((name, optionIndex) => {
    const old = prevByValue.get(name);
    let replyId = '';
    if (old?.replyId && /^[A-Za-z0-9:._-]{1,200}$/.test(old.replyId) && !usedIds.has(old.replyId)) {
      replyId = old.replyId;
    } else {
      const slug = name.normalize('NFKD').replace(/[^A-Za-z0-9]+/g, '').slice(0, 36);
      replyId = `angebot:${slug || optionIndex}`;
      let n = 2;
      while (usedIds.has(replyId)) {
        replyId = `angebot:${slug || 'p'}${n}`;
        n += 1;
      }
    }
    usedIds.add(replyId);
    const title = uniqueTitle(name, usedTitles, maxTitle);
    return {
      value: name,
      replyId,
      prompt: false,
      title: { de: title, ar: title, en: title },
      next: Array.isArray(old?.next) ? old.next : []
    };
  });
  const question = {
    ...(prev || {}),
    id: prev?.id || 'angebot',
    label: prev?.label || 'Produkt?',
    kind: 'choice',
    saveAs: 'angebot',
    text: {
      de: prev?.text?.de || PRODUKT_TEXT.de,
      ar: prev?.text?.ar || PRODUKT_TEXT.ar,
      en: prev?.text?.en || PRODUKT_TEXT.en
    },
    options,
    next: []
  };
  if (index >= 0) questions[index] = question;
  else {
    const after = questions.findIndex((q) => q.id === 'o2Kunde');
    questions.splice(after >= 0 ? after + 1 : questions.length, 0, question);
  }
  return { ...source, questions };
}

export async function syncProduktQuestion(names, { onlyIfMissing = false } = {}) {
  const res = await getAutoQuestionFlowApi();
  if (!res?.flow) return null;
  const exists = (res.flow.questions || []).some(isProduktQuestion);
  if (onlyIfMissing && exists) return res.flow;
  const next = applyProduktOptions(res.flow, names);
  if (exists && produktOptionKey(res.flow) === produktOptionKey(next)) return res.flow;
  const saved = await saveAutoQuestionFlowApi(next);
  return saved?.flow || next;
}

export function ticketProduktNames(config) {
  return questionDropdownOptions('angebot', config) || [];
}
