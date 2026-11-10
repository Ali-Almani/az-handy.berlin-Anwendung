const PREFIX = {
  whatsapp: 'WA',
  facebook: 'FB',
  instagram: 'IG',
  tiktok: 'TT',
  ticket: 'TK'
};

function pad3(n) {
  return String(n).padStart(3, '0');
}

export function prefixForChannel(channel) {
  const id = String(channel || '').trim().toLowerCase();
  if (id === 'wa' || id === 'whatsapp') return PREFIX.whatsapp;
  if (id === 'fb' || id === 'fa' || id === 'facebook') return PREFIX.facebook;
  if (id === 'ig' || id === 'instagram') return PREFIX.instagram;
  if (id === 'tt' || id === 'tiktok') return PREFIX.tiktok;
  if (id === 'tk' || id === 'ticket') return PREFIX.ticket;
  return PREFIX.whatsapp;
}

export function berlinDateKey(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) {
    return berlinDateKey(new Date().toISOString());
  }
  const parts = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  }).formatToParts(d);
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${get('day')}${get('month')}${get('year')}`;
}

export function parseDailyTicketNr(id) {
  const s = String(id ?? '').trim();
  let m = s.match(/^(WA|FB|FA|IG|TT|TK|CC)-(\d{6})-(\d{1,3})$/i);
  if (m) {
    return {
      prefix: m[1].toUpperCase() === 'FA' ? 'FB' : m[1].toUpperCase(),
      dateKey: m[2],
      seq: Number.parseInt(m[3], 10)
    };
  }
  m = s.match(/^(WA|FB|FA|IG|TT|TK|CC)(\d{6})(\d{3,})$/i);
  if (m) {
    return {
      prefix: m[1].toUpperCase() === 'FA' ? 'FB' : m[1].toUpperCase(),
      dateKey: m[2],
      seq: Number.parseInt(m[3], 10)
    };
  }
  return null;
}

export function formatDailyTicketNr(prefix, dateKey, seq) {
  const p = String(prefix || 'WA').toUpperCase() === 'FA' ? 'FB' : String(prefix || 'WA').toUpperCase();
  return `${p}-${String(dateKey || berlinDateKey()).slice(0, 6)}-${pad3(seq)}`;
}

export function nextDailyTicketNr(tickets, channel, at) {
  const prefix = prefixForChannel(channel);
  const dateKey = berlinDateKey(at);
  let max = 0;
  for (const ticket of Array.isArray(tickets) ? tickets : []) {
    const parsed = parseDailyTicketNr(ticket?.ticketNr || ticket?.id);
    if (!parsed || parsed.prefix !== prefix || parsed.dateKey !== dateKey) continue;
    if (Number.isFinite(parsed.seq) && parsed.seq > max) max = parsed.seq;
  }
  return formatDailyTicketNr(prefix, dateKey, max + 1);
}

export function ensureDailyTicketNrs(tickets, channel = 'whatsapp') {
  const list = Array.isArray(tickets) ? tickets : [];
  const prefix = prefixForChannel(channel);
  const used = new Map();
  const result = list.slice();
  let changed = false;

  for (const ticket of result) {
    const parsed = parseDailyTicketNr(ticket?.ticketNr);
    if (!parsed || parsed.prefix !== prefix) continue;
    const set = used.get(parsed.dateKey) || new Set();
    set.add(parsed.seq);
    used.set(parsed.dateKey, set);
  }

  const pending = result
    .map((ticket, index) => ({ ticket, index }))
    .filter(({ ticket }) => {
      const parsed = parseDailyTicketNr(ticket?.ticketNr);
      return !(parsed && parsed.prefix === prefix);
    })
    .sort((a, b) => {
      const atA = String(a.ticket?.createdAt || a.ticket?.messages?.[0]?.at || '');
      const atB = String(b.ticket?.createdAt || b.ticket?.messages?.[0]?.at || '');
      return atA.localeCompare(atB);
    });

  for (const { ticket, index } of pending) {
    const dateKey = berlinDateKey(ticket?.createdAt || ticket?.messages?.[0]?.at);
    const set = used.get(dateKey) || new Set();
    let seq = 1;
    while (set.has(seq)) seq += 1;
    set.add(seq);
    used.set(dateKey, set);
    result[index] = { ...ticket, ticketNr: formatDailyTicketNr(prefix, dateKey, seq) };
    changed = true;
  }

  return { tickets: result, changed };
}
