import { readJsonStore, updateJsonStore } from './jsonClusterStore.js';

export const INBOX_GROUPS_FILE = 'whatsapp-inbox-groups.json';
export const DEFAULT_DISPLAY_WA_ID = '4930585812888';
export const MAX_INBOX_GROUPS = 10;

export function defaultInboxGroups() {
  return {
    displayWaId: DEFAULT_DISPLAY_WA_ID,
    groups: [
      { id: 'kundenservice', name: 'kundenservice', viewerIds: [] }
    ]
  };
}

function clipName(name) {
  return String(name || '').replace(/\s+/g, ' ').trim().slice(0, 40);
}

function slugId(name) {
  const slug = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug || `g${Date.now().toString(36)}`;
}

function uniqueId(name, used) {
  let id = slugId(name);
  if (!/^[a-z][a-z0-9_-]{0,39}$/.test(id)) id = `g${Date.now().toString(36)}`;
  if (!used.has(id)) return id;
  let i = 2;
  while (used.has(`${id}-${i}`)) i += 1;
  return `${id}-${i}`.slice(0, 40);
}

function userIdKey(user) {
  return String(user?.id ?? user?.userId ?? '').trim();
}

function isAdminUser(user) {
  const r = String(user?.role ?? user?.get?.('role') ?? user?.dataValues?.role ?? '')
    .replace(/\u00a0/g, ' ')
    .trim();
  return r === 'Administrator' || r === 'admin' || r.toLowerCase().includes('admin');
}

export function inboxGroupLink(displayWaId, name) {
  const phone = String(displayWaId || DEFAULT_DISPLAY_WA_ID).replace(/\D/g, '') || DEFAULT_DISPLAY_WA_ID;
  return `https://wa.me/${phone}?text=${encodeURIComponent(clipName(name))}`;
}

export function normalizeInboxGroups(raw, { strict = false } = {}) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const displayWaId = String(src.displayWaId || DEFAULT_DISPLAY_WA_ID).replace(/\D/g, '') || DEFAULT_DISPLAY_WA_ID;
  const incoming = Array.isArray(src.groups) ? src.groups : [];
  if (strict && incoming.length > MAX_INBOX_GROUPS) {
    return { config: null, error: 'Höchstens 10 Gruppen.' };
  }
  const groups = [];
  const names = new Set();
  const ids = new Set();
  for (const item of incoming.slice(0, MAX_INBOX_GROUPS)) {
    const name = clipName(item?.name);
    if (name.length < 2) {
      if (strict) return { config: null, error: 'Gruppenname mindestens 2 Zeichen.' };
      continue;
    }
    const nameKey = name.toLowerCase();
    if (names.has(nameKey)) {
      if (strict) return { config: null, error: `Name „${name}“ gibt es schon.` };
      continue;
    }
    let id = String(item?.id || '').trim().slice(0, 40);
    if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/.test(id) || ids.has(id)) {
      id = uniqueId(name, ids);
    }
    names.add(nameKey);
    ids.add(id);
    const viewerIds = [...new Set(
      (Array.isArray(item?.viewerIds) ? item.viewerIds : [])
        .map((value) => String(value ?? '').trim())
        .filter(Boolean)
    )].slice(0, 80);
    groups.push({ id, name, viewerIds });
  }
  if (!groups.length && !strict) {
    return { config: defaultInboxGroups(), error: '' };
  }
  return { config: { displayWaId, groups }, error: '' };
}

export function loadInboxGroups() {
  const stored = readJsonStore(INBOX_GROUPS_FILE, null);
  if (!stored || typeof stored !== 'object') return defaultInboxGroups();
  return normalizeInboxGroups(stored).config;
}

export function saveInboxGroups(raw) {
  const { config, error } = normalizeInboxGroups(raw, { strict: true });
  if (error) return { config: null, error };
  updateJsonStore(INBOX_GROUPS_FILE, defaultInboxGroups(), (state) => {
    for (const key of Object.keys(state)) delete state[key];
    Object.assign(state, config);
  });
  return { config, error: '' };
}

export function findInboxGroup(groups, groupId) {
  const id = String(groupId || '').trim();
  if (!id) return null;
  return (groups || []).find((group) => group.id === id) || null;
}

export function matchInboxGroup(text, groups = loadInboxGroups().groups) {
  const t = String(text || '').trim().toLowerCase();
  if (!t) return null;
  const sorted = [...(groups || [])].sort((a, b) => String(b.name || '').length - String(a.name || '').length);
  return sorted.find((group) => {
    const name = String(group.name || '').trim().toLowerCase();
    if (!name) return false;
    return t === name || t.startsWith(`${name} `) || t.startsWith(`${name}\n`);
  }) || null;
}

export function userCanViewGroup(user, group) {
  if (!group) return false;
  if (isAdminUser(user)) return true;
  const uid = userIdKey(user);
  if (!uid) return false;
  return (group.viewerIds || []).some((id) => String(id) === uid);
}

export function userCanViewInboxTicket(user, ticket, groups = loadInboxGroups().groups) {
  const gid = String(ticket?.inboxGroup || '').trim();
  if (!gid) return true;
  return userCanViewGroup(user, findInboxGroup(groups, gid));
}

export function filterInboxTickets(tickets, user, groups = loadInboxGroups().groups) {
  return (Array.isArray(tickets) ? tickets : []).filter((ticket) => userCanViewInboxTicket(user, ticket, groups));
}

export function presentInboxGroups(user, config = loadInboxGroups()) {
  return {
    displayWaId: config.displayWaId,
    groups: (config.groups || []).map((group) => ({
      id: group.id,
      name: group.name,
      viewerIds: group.viewerIds || [],
      link: inboxGroupLink(config.displayWaId, group.name),
      canView: userCanViewGroup(user, group)
    }))
  };
}
