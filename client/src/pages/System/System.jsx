import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  canAccessTicketingSystem,
  canEditTicketingFragen,
  canManageAutoAbfrage,
  canManageTicketingSystem,
  canSeeTicketingAnweisung,
  canViewTicketingOffen,
  canWriteTicketingAnweisung
} from '../../utils/roles';
import {
  listVorvertraegeApi,
  createVorvertragApi,
  updateVorvertragApi,
  updateVorvertragTicketStatusApi,
  getInboxAnweisungApi
} from '../../services/vorvertrag.service';
import { listWhatsAppTicketsApi, patchWhatsAppTicketApi } from '../../services/whatsapp.service';
import { getSocket } from '../../services/socket';
import VorvertragForm, {
  emptyVorvertragForm,
  formFromEntry,
  buildVorvertragPayload
} from './VorvertragForm';
import MnpForm, {
  emptyMnpForm,
  formFromMnpEntry,
  buildMnpPayload
} from './MnpForm';
import VorvertragEntryCard from './VorvertragEntryCard';
import LeadNachrichtHistory from './LeadNachrichtHistory';
import { useVorvertragImeiCatalog } from './useVorvertragImeiCatalog';
import { emptyMnpDetails } from './mnpConstants';
import { isMnpOnlyEntry } from './vorvertragEntryType';
import { FILIALE_OPTIONS, userFilialeFromEinsatzOrt } from '../../constants/einsatzorte';
import {
  isArchivedTicketStatus,
  isVorvertragArchived,
  normalizeVorvertragTicketStatus,
  VORVERTRAG_TICKET_STATUS_OPTIONS
} from './vorvertragTicketStatus';
import { entryMatchesCustomerNameSearch } from './vorvertragCustomerUtils';
import { TICKET_PRIORITY_OPTIONS, normalizeTicketPriority } from './ticketPriority';
import { TICKET_LANGUAGE_OPTIONS, normalizeTicketLanguage } from './ticketLanguage';
import CallcenterNachrichten from './CallcenterNachrichten';
import AutoAbfrage from './AutoAbfrage';
import { useTicketQuestionConfig } from './useTicketQuestionConfig';
import {
  collectShopMitarbeiterNames,
  countUnreadLeadTickets,
  isLeadArchived,
  isLeadEntry,
  isLeadInNeu,
  leadToNeuEntry,
  isLiveWhatsAppTicket,
  loadLeadTickets,
  mergeWhatsAppTickets,
  migrateLeadTicketStatus,
  offenFollowupFieldKeys,
  kontaktversuchCountFor,
  saveLeadTickets,
  sanitizeMitarbeiterName,
  withMitarbeiter,
  withShopMitarbeiter,
  appendLeadEditLog,
  leadFieldChange,
  isCustomTicketField,
  liveTicketFormPatch,
  bringTicketToFront,
  compareOffenEntries,
  shopOptionsForTicketing,
  questionDropdownOptions,
  LEAD_ANGEBOT_OPTIONS,
  LEAD_O2_OPTIONS,
  isStadtFilterOption
} from './callcenterLeadData';
import './System.scss';

const TOAST_MS = 4500;

function TicketingPhoneTabs({
  active,
  onSelect,
  ungelesenCount = 0,
  gelesenCount = 0,
  offenCount = 0,
  archivCount = 0,
  canSeeOffen = false,
  canSeeArchiv = false
}) {
  const tabClass = (id) => `system-phone-tab${active === id ? ' system-phone-tab--active' : ''}`;
  return (
    <div className="system-phone-tabs" role="tablist" aria-label="Ungelesen, Gelesen, Geöffnete Tickets oder Archiv">
      <button
        type="button"
        role="tab"
        aria-selected={active === 'ungelesen'}
        className={tabClass('ungelesen')}
        onClick={() => onSelect('ungelesen')}
      >
        Ungelesen
        {ungelesenCount > 0 ? <span className="system-phone-tab-count">{ungelesenCount}</span> : null}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === 'gelesen'}
        className={tabClass('gelesen')}
        onClick={() => onSelect('gelesen')}
      >
        Gelesen
        {gelesenCount > 0 ? <span className="system-phone-tab-count">{gelesenCount}</span> : null}
      </button>
      {canSeeOffen ? (
        <button
          type="button"
          role="tab"
          aria-selected={active === 'offen'}
          className={tabClass('offen')}
          onClick={() => onSelect('offen')}
        >
          Geöffnete Tickets
          {offenCount > 0 ? <span className="system-phone-tab-count">{offenCount}</span> : null}
        </button>
      ) : null}
      {canSeeArchiv ? (
        <button
          type="button"
          role="tab"
          aria-selected={active === 'archiv'}
          className={tabClass('archiv')}
          onClick={() => onSelect('archiv')}
        >
          Archiv
          {archivCount > 0 ? <span className="system-phone-tab-count">{archivCount}</span> : null}
        </button>
      ) : null}
    </div>
  );
}

function TicketingSectionMenu({
  listTab,
  setListTab,
  leadUnread,
  anweisungUnread,
  canManageAuto
}) {
  const [open, setOpen] = useState(false);
  const choose = (tab) => {
    setOpen(false);
    setListTab(tab);
  };
  const itemClass = (tab) => `system-section-menu-item${listTab === tab ? ' system-section-menu-item--active' : ''}`;

  return (
    <div className="system-section-menu">
      {open ? (
        <button
          type="button"
          className="system-section-menu-backdrop"
          aria-label="Menü schließen"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <button
        type="button"
        className="system-section-menu-btn"
        aria-label="Bereiche"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <path fill="currentColor" d="M12 8a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
        {anweisungUnread ? <span className="system-section-menu-dot" /> : null}
      </button>
      {open ? (
        <div className="system-section-menu-panel" role="menu">
          <button type="button" role="menuitem" className={itemClass('nachrichten')} onClick={() => choose('nachrichten')}>
            Nachrichten{leadUnread > 0 ? ` (${leadUnread})` : ''}
            {anweisungUnread ? <span className="system-tab-count">Anweisung</span> : null}
          </button>
          {canManageAuto ? (
            <button type="button" role="menuitem" className={itemClass('auto')} onClick={() => choose('auto')}>
              Automatisierte Abfrage
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const EMPTY_OFFEN_FILTER = {
  datum: '',
  filiale: '',
  o2Kunde: '',
  stadt: '',
  typ: '',
  priority: '',
  sprache: '',
  status: '',
  bearbeiter: ''
};

function entryFilialeValue(entry) {
  return String(entry?.filiale || entry?.shop || '').trim();
}

function entryTicketStatus(entry) {
  return isLeadEntry(entry)
    ? migrateLeadTicketStatus(entry?.ticketStatus)
    : normalizeVorvertragTicketStatus(entry?.ticketStatus);
}

function countByKeys(list, getKeys) {
  const map = new Map();
  for (const entry of list) {
    const raw = getKeys(entry);
    const keys = [...new Set((Array.isArray(raw) ? raw : [raw]).map((value) => String(value || '').trim()).filter(Boolean))];
    const unique = keys.length ? keys : [''];
    unique.forEach((key) => map.set(key, (map.get(key) || 0) + 1));
  }
  return map;
}

function withTicketCount(label, count) {
  return `${label} (${count})`;
}

function uniqueFilterValues(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'de'));
}

function matchesOffenFilter(entry, filter) {
  if (filter.datum && String(entry?.datum || '').slice(0, 10) !== filter.datum) return false;
  if (filter.filiale && entryFilialeValue(entry) !== filter.filiale) return false;
  if (filter.o2Kunde && String(entry?.o2Kunde || '').trim() !== filter.o2Kunde) return false;
  if (filter.stadt && String(entry?.stadt || '').trim() !== filter.stadt) return false;
  if (filter.typ && String(entry?.angebot || '').trim() !== filter.typ) return false;
  if (filter.priority && normalizeTicketPriority(entry?.priority) !== filter.priority) return false;
  if (filter.sprache && normalizeTicketLanguage(entry?.sprache) !== filter.sprache) return false;
  if (filter.status && entryTicketStatus(entry) !== filter.status) return false;
  if (filter.bearbeiter && !collectShopMitarbeiterNames(entry).includes(filter.bearbeiter)) return false;
  return true;
}

const System = () => {
  const { user } = useAuth();
  const [questionConfig, setQuestionConfig] = useTicketQuestionConfig({
    persist: canEditTicketingFragen(user)
  });
  const formRef = useRef(null);
  const cardsSectionRef = useRef(null);
  const [filialeOptions, setFilialeOptions] = useState(FILIALE_OPTIONS);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [form, setForm] = useState(emptyVorvertragForm);
  const [geraetSeed, setGeraetSeed] = useState('');
  const [mode, setMode] = useState('new');
  const [formKind, setFormKind] = useState('vorvertrag');
  const [listTab, setListTab] = useState('nachrichten');
  const [inboxTab, setInboxTab] = useState('ungelesen');
  const [archivSearch, setArchivSearch] = useState('');
  const [offenFilter, setOffenFilter] = useState(EMPTY_OFFEN_FILTER);
  const [statusSavingId, setStatusSavingId] = useState('');
  const [leadTickets, setLeadTickets] = useState(() => loadLeadTickets());
  const [openLeadId, setOpenLeadId] = useState('');
  const [leadEditId, setLeadEditId] = useState('');
  const [anweisungUnread, setAnweisungUnread] = useState(false);

  const defaultMitarbeiter = useMemo(() => {
    const name = String(user?.name ?? '').trim();
    return name || String(user?.email ?? '').trim();
  }, [user?.name, user?.email]);

  const navbarFiliale = useMemo(
    () => userFilialeFromEinsatzOrt(user?.einsatz_ort),
    [user?.einsatz_ort]
  );

  const leadUnread = useMemo(
    () => countUnreadLeadTickets(leadTickets),
    [leadTickets]
  );
  const leadGelesenCount = useMemo(
    () => leadTickets.filter((ticket) => !ticket?.unread).length,
    [leadTickets]
  );

  const leadOffenEntries = useMemo(
    () => leadTickets.filter(isLeadInNeu).map(leadToNeuEntry),
    [leadTickets]
  );
  const leadArchivEntries = useMemo(
    () => leadTickets.filter(isLeadArchived).map(leadToNeuEntry),
    [leadTickets]
  );

  const offenEntriesAll = useMemo(
    () => [...leadOffenEntries, ...entries.filter((entry) => !isVorvertragArchived(entry))],
    [leadOffenEntries, entries]
  );

  const filteredEntries = useMemo(() => {
    const vv = entries.filter((entry) => {
      const archived = isVorvertragArchived(entry);
      const inTab = listTab === 'archiv' ? archived : !archived;
      if (!inTab) return false;
      if (listTab === 'archiv' && archivSearch.trim()) {
        return entryMatchesCustomerNameSearch(entry, archivSearch);
      }
      return true;
    });
    if (listTab === 'offen') {
      return offenEntriesAll
        .filter((entry) => matchesOffenFilter(entry, offenFilter))
        .slice()
        .sort((a, b) => compareOffenEntries(a, b, leadEditId));
    }
    if (listTab === 'archiv') {
      const leads = archivSearch.trim()
        ? leadArchivEntries.filter((entry) => entryMatchesCustomerNameSearch(entry, archivSearch))
        : leadArchivEntries;
      return [...leads, ...vv];
    }
    return vv;
  }, [entries, listTab, archivSearch, leadOffenEntries, leadArchivEntries, offenEntriesAll, offenFilter, leadEditId]);

  const offenFilialeOptions = useMemo(() => {
    const set = new Set([...shopOptionsForTicketing(), ...filialeOptions]);
    offenEntriesAll.forEach((entry) => {
      const value = entryFilialeValue(entry);
      if (value) set.add(value);
    });
    return [...set].filter((opt) => String(opt).trim().toLowerCase() !== 'zentrale');
  }, [filialeOptions, offenEntriesAll]);

  const offenStatusOptions = useMemo(() => {
    const counts = countByKeys(offenEntriesAll, entryTicketStatus);
    return VORVERTRAG_TICKET_STATUS_OPTIONS.map((opt) => ({
      value: opt,
      count: counts.get(opt) || 0
    }));
  }, [offenEntriesAll]);

  const offenBearbeiterOptions = useMemo(() => (
    [...countByKeys(offenEntriesAll, collectShopMitarbeiterNames).entries()]
      .filter(([value, count]) => value && count)
      .sort((a, b) => a[0].localeCompare(b[0], 'de'))
      .map(([value, count]) => ({ value, count }))
  ), [offenEntriesAll]);

  const offenTypOptions = useMemo(
    () => questionDropdownOptions('angebot', questionConfig) || [...LEAD_ANGEBOT_OPTIONS],
    [questionConfig]
  );

  const offenO2Options = useMemo(() => {
    const fromConfig = questionDropdownOptions('o2Kunde', questionConfig) || [...LEAD_O2_OPTIONS];
    const fromTickets = offenEntriesAll.map((entry) => entry?.o2Kunde);
    return uniqueFilterValues([...fromConfig, ...fromTickets]);
  }, [questionConfig, offenEntriesAll]);

  const offenStadtOptions = useMemo(() => {
    const fromConfig = questionDropdownOptions('stadt', questionConfig) || [];
    const fromTickets = offenEntriesAll.map((entry) => entry?.stadt);
    return uniqueFilterValues([...fromConfig, ...fromTickets]).filter(isStadtFilterOption);
  }, [questionConfig, offenEntriesAll]);

  const offenCount = useMemo(
    () => entries.filter((entry) => !isVorvertragArchived(entry)).length + leadOffenEntries.length,
    [entries, leadOffenEntries]
  );
  const archivCount = useMemo(
    () => entries.filter((entry) => isVorvertragArchived(entry)).length + leadArchivEntries.length,
    [entries, leadArchivEntries]
  );

  const archivedEntries = useMemo(
    () => entries.filter((entry) => isVorvertragArchived(entry)),
    [entries]
  );

  const editingLead = useMemo(
    () => leadTickets.find((t) => t.id === leadEditId) || null,
    [leadTickets, leadEditId]
  );

  const activeEditLog = useMemo(() => {
    if (mode !== 'edit' || !activeId) return [];
    return entries.find((entry) => entry.id === activeId)?.editLog || [];
  }, [mode, activeId, entries]);

  const {
    imeis,
    loading: geraeteLoading,
    error: geraeteError
  } = useVorvertragImeiCatalog(Boolean(user && canManageTicketingSystem(user)));

  useEffect(() => {
    saveLeadTickets(leadTickets);
  }, [leadTickets]);

  useEffect(() => {
    let on = true;
    const applyRemote = (remote) => {
      if (!on) return;
      setLeadTickets((prev) => mergeWhatsAppTickets(prev, remote));
    };
    const load = async () => {
      try {
        const res = await listWhatsAppTicketsApi();
        if (!res?.configured) return;
        applyRemote(res.tickets || []);
      } catch {
        /* Demo-Postfach bleibt */
      }
    };
    load();
    const timer = window.setInterval(load, 4000);
    const socket = getSocket();
    const onInbox = (ticket) => {
      if (!ticket?.id) return;
      setLeadTickets((prev) => {
        const cloud = [
          ticket,
          ...prev.filter((t) => isLiveWhatsAppTicket(t) && t.id !== ticket.id && t.waId !== ticket.waId)
        ];
        return mergeWhatsAppTickets(prev, cloud);
      });
    };
    const onDeleted = (payload) => {
      const id = payload?.id;
      if (!id) return;
      setLeadTickets((prev) => prev.filter((t) => t.id !== id));
    };
    socket?.on?.('connect', load);
    socket?.on?.('whatsapp:inbox', onInbox);
    socket?.on?.('whatsapp:deleted', onDeleted);
    return () => {
      on = false;
      window.clearInterval(timer);
      socket?.off?.('connect', load);
      socket?.off?.('whatsapp:inbox', onInbox);
      socket?.off?.('whatsapp:deleted', onDeleted);
    };
  }, []);

  useEffect(() => {
    const name = sanitizeMitarbeiterName(defaultMitarbeiter);
    if (!name) return;
    setLeadTickets((prev) => {
      let changed = false;
      const next = prev.map((t) => {
        if (sanitizeMitarbeiterName(t.mitarbeiterName)) return t;
        changed = true;
        return withMitarbeiter(t, name);
      });
      return changed ? next : prev;
    });
  }, [defaultMitarbeiter]);

  useEffect(() => {
    if (!successToast) return undefined;
    const t = setTimeout(() => setSuccessToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [successToast]);

  useEffect(() => {
    if (!highlightedId) return undefined;
    const t = setTimeout(() => setHighlightedId(null), 3500);
    return () => clearTimeout(t);
  }, [highlightedId]);

  useEffect(() => {
    if (!user || !canSeeTicketingAnweisung(user) || canWriteTicketingAnweisung(user)) {
      setAnweisungUnread(false);
      return undefined;
    }
    let on = true;
    const check = async () => {
      try {
        const res = await getInboxAnweisungApi();
        if (on) setAnweisungUnread(Boolean(res?.unread));
      } catch {
        /* offline */
      }
    };
    check();
    const id = window.setInterval(check, 8000);
    const socket = getSocket();
    const onNew = () => {
      if (on) setAnweisungUnread(true);
    };
    socket?.on?.('ticketing:anweisung', onNew);
    return () => {
      on = false;
      window.clearInterval(id);
      socket?.off?.('ticketing:anweisung', onNew);
    };
  }, [user]);

  const loadList = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await listVorvertraegeApi();
      setEntries(res?.entries ?? []);
      if (Array.isArray(res?.filialeOptions) && res.filialeOptions.length > 0) {
        setFilialeOptions(res.filialeOptions);
      }
      return res?.entries ?? [];
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Laden fehlgeschlagen.');
      return [];
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (canManageTicketingSystem(user)) {
      loadList();
      return;
    }
    setLoading(false);
  }, [user, loadList]);

  useEffect(() => {
    if (!user) return;
    const allowed =
      listTab === 'nachrichten' ||
      (listTab === 'offen' && canViewTicketingOffen(user)) ||
      (listTab === 'auto' && canManageAutoAbfrage(user)) ||
      ((listTab === 'erstellen' || listTab === 'archiv') && canManageTicketingSystem(user));
    if (!allowed) setListTab('nachrichten');
  }, [user, listTab]);

  useEffect(() => {
    if (!showForm || mode !== 'new' || formKind !== 'vorvertrag' || !navbarFiliale) return;
    setForm((prev) => (prev.filiale === navbarFiliale ? prev : { ...prev, filiale: navbarFiliale }));
  }, [showForm, mode, formKind, navbarFiliale]);

  useEffect(() => {
    if (!showForm || mode !== 'new' || formKind !== 'mnp' || !navbarFiliale) return;
    setForm((prev) => (prev.filiale === navbarFiliale ? prev : { ...prev, filiale: navbarFiliale }));
  }, [showForm, mode, formKind, navbarFiliale]);

  const scrollToCard = (id) => {
    if (!id) return;
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-entry-id="${CSS.escape(id)}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const startNew = () => {
    setActiveId(null);
    setFormKind('vorvertrag');
    setForm({
      ...emptyVorvertragForm(),
      filiale: navbarFiliale,
      mnpDetails: {
        ...emptyMnpDetails(),
        mitarbeiter: defaultMitarbeiter,
        neuesVertragsdatum: new Date().toISOString().slice(0, 10)
      }
    });
    setGeraetSeed('');
    setMode('new');
    setShowForm(true);
    setError('');
    setSuccessToast(null);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const startNewMnp = () => {
    setActiveId(null);
    setFormKind('mnp');
    setForm({
      ...emptyMnpForm(),
      filiale: navbarFiliale,
      mnpDetails: {
        ...emptyMnpDetails(),
        mitarbeiter: defaultMitarbeiter,
        neuesVertragsdatum: new Date().toISOString().slice(0, 10)
      }
    });
    setGeraetSeed('');
    setMode('new');
    setShowForm(true);
    setError('');
    setSuccessToast(null);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const goToStatusTab = (targetTab = 'offen') => {
    if (targetTab === 'archiv' && canManageTicketingSystem(user)) {
      setListTab('archiv');
      return;
    }
    if (canViewTicketingOffen(user)) {
      setListTab('offen');
      return;
    }
    setListTab('nachrichten');
  };

  const startEdit = (entry) => {
    if (!isLeadEntry(entry) && !canManageTicketingSystem(user)) return;
    if (isLeadEntry(entry)) {
      const openedAt = new Date().toISOString();
      setLeadEditId(entry.id);
      setHighlightedId(entry.id);
      setShowForm(false);
      setLeadTickets((prev) => {
        const next = bringTicketToFront(prev, entry.id, openedAt);
        const ticket = next.find((t) => t.id === entry.id);
        if (ticket && isLiveWhatsAppTicket(ticket)) {
          patchWhatsAppTicketApi(ticket.id, { lastOpenedAt: openedAt }).catch(() => {});
        }
        return next;
      });
      requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      return;
    }
    const mnpOnly = isMnpOnlyEntry(entry);
    setFormKind(mnpOnly ? 'mnp' : 'vorvertrag');
    setActiveId(entry.id);
    const nextForm = mnpOnly ? formFromMnpEntry(entry) : formFromEntry(entry);
    setForm(nextForm);
    setGeraetSeed(mnpOnly ? '' : nextForm.ausgabeGeraet);
    setMode('edit');
    setShowForm(true);
    setListTab('erstellen');
    setError('');
    setSuccessToast(null);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const cancelForm = () => {
    setShowForm(false);
    setActiveId(null);
    setLeadEditId('');
    setForm(emptyVorvertragForm());
    setGeraetSeed('');
    setMode('new');
    setFormKind('vorvertrag');
  };

  const persistLiveTicket = (ticket) => {
    if (!isLiveWhatsAppTicket(ticket)) return;
    const payload = {
      ticketStatus: ticket.ticketStatus || '',
      ...liveTicketFormPatch(ticket)
    };
    payload.kontaktversuchCount = kontaktversuchCountFor(ticket);
    payload.editLog = Array.isArray(ticket.editLog) ? ticket.editLog : [];
    for (const key of offenFollowupFieldKeys(ticket)) {
      payload[key] = ticket[key] || '';
    }
    patchWhatsAppTicketApi(ticket.id, payload).catch(() => {});
  };

  const patchLeadAnswer = (field, value) => {
    if (!leadEditId) return;
    setLeadTickets((prev) =>
      prev.map((t) => {
        if (t.id !== leadEditId) return t;
        const silent = field === 'geoeffnetAt' || field === 'dokumente' || field === 'dokumenteHidden' || /ZeitAt$/.test(String(field || ''));
        const change = silent ? null : leadFieldChange(t, field, value);
        const extra = isCustomTicketField(field)
          ? { customAnswers: { ...(t.customAnswers || {}), [field]: value } }
          : {};
        const patched = { ...t, [field]: value, ...extra };
        const next = field === 'kontaktversuchCount' || silent
          ? patched
          : field === 'shopMitarbeiter'
            ? withShopMitarbeiter(patched, value)
            : withMitarbeiter(patched, defaultMitarbeiter);
        const saved = change
          ? appendLeadEditLog(next, {
              editorName: sanitizeMitarbeiterName(defaultMitarbeiter),
              changes: [change]
            })
          : next;
        persistLiveTicket(saved);
        return saved;
      })
    );
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => {
      if (field === 'ausgabeGeraet') {
        return { ...prev, ausgabeGeraet: value, ausgabeFarbe: '' };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleFormPatch = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessToast(null);
    try {
      const filialeForSave = mode === 'edit' ? form.filiale : (navbarFiliale || form.filiale);
      if (mode !== 'edit' && !filialeForSave?.trim()) {
        setError('Bitte zuerst eine Filiale in der Navbar wählen.');
        setSaving(false);
        return;
      }
      const payload = formKind === 'mnp'
        ? buildMnpPayload({ ...form, filiale: filialeForSave })
        : buildVorvertragPayload({ ...form, filiale: filialeForSave });
      let savedId = activeId;

      if (mode === 'edit' && activeId) {
        const res = await updateVorvertragApi(activeId, payload);
        savedId = res?.entry?.id || activeId;
        setSuccessToast({
          type: 'success',
          message: formKind === 'mnp'
            ? 'MNP wurde aktualisiert. Der Eintrag in der Liste ist bearbeitbar.'
            : 'Vorvertrag wurde aktualisiert. Der Eintrag in der Liste ist bearbeitbar.'
        });
      } else {
        const res = await createVorvertragApi(payload);
        savedId = res?.entry?.id || null;
        setSuccessToast({
          type: 'success',
          message: formKind === 'mnp'
            ? 'MNP eingereicht. Der Eintrag steht in der Ticketing-Liste.'
            : 'Vorvertrag eingereicht. Der Eintrag steht in der Ticketing-Liste.'
        });
      }

      await loadList({ silent: true });
      cancelForm();
      setListTab('offen');

      if (savedId) {
        setHighlightedId(savedId);
        scrollToCard(savedId);
      } else {
        cardsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (entry, ticketStatus) => {
    const id = entry?.id;
    if (!id) return;

    if (isLeadEntry(entry)) {
      const nextLead = migrateLeadTicketStatus(ticketStatus);
      if (migrateLeadTicketStatus(entry?.ticketStatus) === nextLead) return;
      setLeadTickets((prev) =>
        prev.map((t) =>
          t.id === id
            ? (() => {
                const nextName = sanitizeMitarbeiterName(defaultMitarbeiter);
                const next = withMitarbeiter({
                  ...t,
                  ticketStatus: nextLead
                }, nextName);
                const change = leadFieldChange(t, 'ticketStatus', nextLead);
                const saved = change
                  ? appendLeadEditLog(next, {
                      editorName: nextName,
                      action: 'status_changed',
                      changes: [change]
                    })
                  : next;
                persistLiveTicket(saved);
                return saved;
              })()
            : t
        )
      );
      goToStatusTab(isArchivedTicketStatus(nextLead) ? 'archiv' : 'offen');
      setHighlightedId(id);
      return;
    }

    const nextStatus = normalizeVorvertragTicketStatus(ticketStatus);
    if (normalizeVorvertragTicketStatus(entry?.ticketStatus) === nextStatus) return;

    setStatusSavingId(id);
    setError('');
    setEntries((prev) => prev.map((item) => (
      item.id === id ? { ...item, ticketStatus: nextStatus } : item
    )));
    try {
      await updateVorvertragTicketStatusApi(id, nextStatus);
      await loadList({ silent: true });
      goToStatusTab(isArchivedTicketStatus(nextStatus) ? 'archiv' : 'offen');
    } catch (err) {
      await loadList({ silent: true });
      setError(err.response?.data?.message || err.message || 'Status konnte nicht gespeichert werden.');
    } finally {
      setStatusSavingId('');
    }
  };

  const handleKundenbesuchDatumChange = async (entry, value) => {
    const id = entry?.id;
    if (!id) return;
    const datum = String(value || '').trim().slice(0, 10);

    if (isLeadEntry(entry)) {
      setLeadTickets((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          if (String(t.kundenbesuchDatum || '') === datum) return t;
          const next = { ...t, kundenbesuchDatum: datum };
          const change = leadFieldChange(t, 'kundenbesuchDatum', datum);
          const saved = change
            ? appendLeadEditLog(next, {
                editorName: sanitizeMitarbeiterName(defaultMitarbeiter),
                changes: [change]
              })
            : next;
          persistLiveTicket(saved);
          return saved;
        })
      );
      return;
    }

    if (String(entry?.kundenbesuchDatum || '') === datum) return;
    setStatusSavingId(id);
    setError('');
    setEntries((prev) => prev.map((item) => (
      item.id === id ? { ...item, kundenbesuchDatum: datum } : item
    )));
    try {
      await updateVorvertragTicketStatusApi(id, entry.ticketStatus, { kundenbesuchDatum: datum });
      await loadList({ silent: true });
    } catch (err) {
      await loadList({ silent: true });
      setError(err.response?.data?.message || err.message || 'Datum konnte nicht gespeichert werden.');
    } finally {
      setStatusSavingId('');
    }
  };

  if (!user || !canAccessTicketingSystem(user)) {
    return <Navigate to="/" replace />;
  }

  const canManageVorvertrag = canManageTicketingSystem(user);
  const canSeeOffen = canViewTicketingOffen(user);
  const canEditFragen = canEditTicketingFragen(user);
  const canManageAuto = canManageAutoAbfrage(user);
  const canSeeAnweisung = canSeeTicketingAnweisung(user);
  const canWriteAnweisung = canWriteTicketingAnweisung(user);
  const sectionMenuProps = {
    listTab,
    setListTab,
    leadUnread,
    anweisungUnread: canSeeAnweisung ? anweisungUnread : false,
    canManageAuto
  };

  return (
    <div className={`system-page container${listTab === 'nachrichten' ? ' system-page--nachrichten' : ''}`}>
      <h1 className="system-page-title">Ticketing System</h1>

      <div className="system-tabs" role="tablist" aria-label="Ticketing System Bereiche">
        <button
          type="button"
          role="tab"
          aria-selected={listTab === 'nachrichten'}
          className={`system-tab${listTab === 'nachrichten' ? ' system-tab--active' : ''}`}
          onClick={() => setListTab('nachrichten')}
        >
          Nachrichten{leadUnread > 0 ? ` (${leadUnread})` : ''}
          {canSeeAnweisung && anweisungUnread ? <span className="system-tab-count">Anweisung</span> : null}
        </button>
        {canSeeOffen ? (
          <button
            type="button"
            role="tab"
            aria-selected={listTab === 'offen'}
            className={`system-tab${listTab === 'offen' ? ' system-tab--active' : ''}`}
            onClick={() => {
              setListTab('offen');
              setArchivSearch('');
            }}
          >
            Geöffnete Tickets ({offenCount})
          </button>
        ) : null}
        {canManageVorvertrag ? (
          <button
            type="button"
            role="tab"
            aria-selected={listTab === 'archiv'}
            className={`system-tab${listTab === 'archiv' ? ' system-tab--active' : ''}`}
            onClick={() => setListTab('archiv')}
          >
            Archiv ({archivCount})
          </button>
        ) : null}
        {canManageAuto ? (
          <button
            type="button"
            role="tab"
            aria-selected={listTab === 'auto'}
            className={`system-tab${listTab === 'auto' ? ' system-tab--active' : ''}`}
            onClick={() => setListTab('auto')}
          >
            Automatisierte Abfrage
          </button>
        ) : null}
      </div>

      {listTab !== 'nachrichten' && listTab !== 'offen' && listTab !== 'archiv' ? (
        <div className="system-section-bar">
          <TicketingSectionMenu {...sectionMenuProps} />
        </div>
      ) : null}

      {canSeeAnweisung && anweisungUnread && listTab !== 'nachrichten' && !canWriteAnweisung ? (
        <button
          type="button"
          className="system-toast system-toast--anweisung"
          onClick={() => setListTab('nachrichten')}
        >
          <span className="system-toast__icon" aria-hidden>●</span>
          <span className="system-toast__message">Neue Anweisung in Nachrichten</span>
        </button>
      ) : null}

      {listTab === 'erstellen' ? (
        <div className="system-toolbar">
          <button type="button" className="btn btn--primary" onClick={startNew} disabled={showForm}>
            Neuer Vorvertrag
          </button>
          <button type="button" className="btn btn--secondary" onClick={startNewMnp} disabled={showForm}>
            Neues MNP
          </button>
        </div>
      ) : null}

      {listTab !== 'nachrichten' && successToast ? (
        <div className="system-toast system-toast--success" role="status" aria-live="polite">
          <span className="system-toast__icon" aria-hidden>✓</span>
          <span className="system-toast__message">{successToast.message}</span>
          <button
            type="button"
            className="system-toast__close"
            onClick={() => setSuccessToast(null)}
            aria-label="Benachrichtigung schließen"
          >
            ×
          </button>
        </div>
      ) : null}

      {listTab !== 'nachrichten' && error ? (
        <p className="vorvertrag-error" role="alert">{error}</p>
      ) : null}
      {listTab !== 'nachrichten' && geraeteError ? (
        <p className="vorvertrag-error" role="alert">{geraeteError}</p>
      ) : null}

      {listTab === 'nachrichten' ? (
        <CallcenterNachrichten
          agentName={defaultMitarbeiter}
          tickets={leadTickets}
          onTicketsChange={setLeadTickets}
          openTicketId={openLeadId}
          filialeOptions={filialeOptions}
          questionConfig={questionConfig}
          onQuestionConfigChange={setQuestionConfig}
          canEditFragen={canEditFragen}
          canSeeAnweisung={canSeeAnweisung}
          canWriteAnweisung={canWriteAnweisung}
          onAnweisungUnreadChange={setAnweisungUnread}
          onStatusApplied={(id, targetTab = 'offen') => {
            setOpenLeadId('');
            goToStatusTab(targetTab);
            if (id) setHighlightedId(id);
          }}
          onOpened={() => setOpenLeadId('')}
          canOpenOffen={canSeeOffen}
          canOpenArchiv={canManageVorvertrag}
          offenCount={offenCount}
          archivCount={archivCount}
          inboxTab={inboxTab}
          onInboxTabChange={setInboxTab}
          onOpenOffen={() => {
            setListTab('offen');
            setArchivSearch('');
          }}
          onOpenArchiv={() => setListTab('archiv')}
        />
      ) : null}

      {listTab === 'auto' && canManageAuto ? (
        <AutoAbfrage
          questionConfig={questionConfig}
          onQuestionConfigChange={setQuestionConfig}
        />
      ) : null}

      {listTab === 'erstellen' && showForm ? (
        <div ref={formRef}>
          {formKind === 'mnp' ? (
            <MnpForm
              form={form}
              onPatch={handleFormPatch}
              onSubmit={handleSubmit}
              onCancel={cancelForm}
              filialeOptions={filialeOptions}
              navbarFiliale={navbarFiliale}
              saving={saving}
              mode={mode}
              ticketId={mode === 'edit' ? activeId : ''}
              editLog={activeEditLog}
            />
          ) : (
            <VorvertragForm
              form={form}
              onChange={handleFormChange}
              onPatch={handleFormPatch}
              onSubmit={handleSubmit}
              onCancel={cancelForm}
              filialeOptions={filialeOptions}
              navbarFiliale={navbarFiliale}
              existingEntries={entries}
              archivedEntries={archivedEntries}
              imeis={imeis}
              geraeteLoading={geraeteLoading}
              geraetSeed={geraetSeed}
              saving={saving}
              mode={mode}
              ticketId={mode === 'edit' ? activeId : ''}
              editLog={activeEditLog}
            />
          )}
        </div>
      ) : null}

      {listTab === 'offen' || listTab === 'archiv' ? (
        <TicketingPhoneTabs
          active={listTab}
          ungelesenCount={leadUnread}
          gelesenCount={leadGelesenCount}
          offenCount={offenCount}
          archivCount={archivCount}
          canSeeOffen={canSeeOffen}
          canSeeArchiv={canManageVorvertrag}
          onSelect={(tab) => {
            if (tab === 'ungelesen' || tab === 'gelesen') {
              setInboxTab(tab);
              setListTab('nachrichten');
              setLeadEditId('');
              return;
            }
            if (tab === 'offen') {
              setListTab('offen');
              setArchivSearch('');
              return;
            }
            setListTab('archiv');
          }}
        />
      ) : null}

      {(listTab === 'offen' || listTab === 'archiv') && editingLead ? (
        <div ref={formRef}>
          <LeadNachrichtHistory
            ticket={editingLead}
            onClose={() => setLeadEditId('')}
            editLog={editingLead.editLog}
            onAnswerChange={patchLeadAnswer}
            bearbeiterName={defaultMitarbeiter}
            canDeleteDokumente={canManageTicketingSystem(user)}
            questionConfig={questionConfig}
          />
        </div>
      ) : null}

      {listTab === 'offen' || listTab === 'archiv' ? (
      <section className="vorvertrag-table-section" ref={cardsSectionRef}>
        {listTab === 'offen' ? (
          <div className="system-offen-filters" aria-label="Geöffnete Tickets filtern">
            <label htmlFor="offen-filter-datum">
              Datum
              <input
                id="offen-filter-datum"
                className="form-input"
                type="date"
                value={offenFilter.datum}
                onChange={(ev) => setOffenFilter((prev) => ({ ...prev, datum: ev.target.value }))}
              />
            </label>
            <label htmlFor="offen-filter-filiale">
              Filiale
              <select
                id="offen-filter-filiale"
                className="form-input"
                value={offenFilter.filiale}
                onChange={(ev) => setOffenFilter((prev) => ({ ...prev, filiale: ev.target.value }))}
              >
                <option value="">Alle</option>
                {offenFilialeOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>
            <label htmlFor="offen-filter-o2">
              O2 Kunde
              <select
                id="offen-filter-o2"
                className="form-input"
                value={offenFilter.o2Kunde}
                onChange={(ev) => setOffenFilter((prev) => ({ ...prev, o2Kunde: ev.target.value }))}
              >
                <option value="">Alle</option>
                {offenO2Options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>
            <label htmlFor="offen-filter-stadt">
              Stadt
              <select
                id="offen-filter-stadt"
                className="form-input"
                value={offenFilter.stadt}
                onChange={(ev) => setOffenFilter((prev) => ({ ...prev, stadt: ev.target.value }))}
              >
                <option value="">Alle</option>
                {offenStadtOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>
            <label htmlFor="offen-filter-typ">
              Angebot
              <select
                id="offen-filter-typ"
                className="form-input"
                value={offenFilter.typ}
                onChange={(ev) => setOffenFilter((prev) => ({ ...prev, typ: ev.target.value }))}
              >
                <option value="">Alle</option>
                {offenTypOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>
            <label htmlFor="offen-filter-priority">
              Priorität
              <select
                id="offen-filter-priority"
                className="form-input"
                value={offenFilter.priority}
                onChange={(ev) => setOffenFilter((prev) => ({ ...prev, priority: ev.target.value }))}
              >
                <option value="">Alle</option>
                {TICKET_PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>
            <label htmlFor="offen-filter-sprache">
              Sprache
              <select
                id="offen-filter-sprache"
                className="form-input"
                value={offenFilter.sprache}
                onChange={(ev) => setOffenFilter((prev) => ({ ...prev, sprache: ev.target.value }))}
              >
                <option value="">Alle</option>
                {TICKET_LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>
            <label htmlFor="offen-filter-status">
              Status
              <select
                id="offen-filter-status"
                className="form-input"
                value={offenFilter.status}
                onChange={(ev) => setOffenFilter((prev) => ({ ...prev, status: ev.target.value }))}
              >
                <option value="">{withTicketCount('Alle', offenEntriesAll.length)}</option>
                {offenStatusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{withTicketCount(opt.value, opt.count)}</option>
                ))}
              </select>
            </label>
            <label htmlFor="offen-filter-bearbeiter">
              Bearbeiter
              <select
                id="offen-filter-bearbeiter"
                className="form-input"
                value={offenFilter.bearbeiter}
                onChange={(ev) => setOffenFilter((prev) => ({ ...prev, bearbeiter: ev.target.value }))}
              >
                <option value="">{withTicketCount('Alle', offenEntriesAll.length)}</option>
                {offenBearbeiterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{withTicketCount(opt.value, opt.count)}</option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
        {listTab === 'archiv' ? (
          <div className="system-archiv-search">
            <label htmlFor="archiv-kunde-suche" className="form-label">Kunde oder ID suchen</label>
            <input
              id="archiv-kunde-suche"
              type="search"
              className="form-input"
              value={archivSearch}
              onChange={(ev) => setArchivSearch(ev.target.value)}
              placeholder="Nach Kundenname oder Ticket-ID suchen…"
              autoComplete="off"
            />
          </div>
        ) : null}
        {loading && listTab !== 'archiv' ? (
          <p className="vorvertrag-empty">Laden…</p>
        ) : filteredEntries.length === 0 ? (
          <p className="vorvertrag-empty">
            {listTab === 'archiv' && archivSearch.trim()
              ? 'Keine Treffer für diesen Kundenname oder diese ID im Archiv.'
              : listTab === 'archiv'
                ? 'Keine Einträge im Archiv.'
                : Object.values(offenFilter).some(Boolean)
                  ? 'Keine offenen Einträge für diese Filter.'
                  : 'Keine offenen Einträge.'}
          </p>
        ) : (
          <div className="vorvertrag-table-wrapper">
            <table className="vorvertrag-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Kunde</th>
                  <th>Datum</th>
                  <th>Zeit</th>
                  <th>Filiale</th>
                  <th>Angebot</th>
                  {listTab !== 'archiv' ? <th>Priorität</th> : null}
                  {listTab !== 'archiv' ? <th>Sprache</th> : null}
                  <th>Status</th>
                  <th>Marketing Mitarbeiter</th>
                  <th>Bearbeiter</th>
                  <th>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <VorvertragEntryCard
                    key={entry.id}
                    entry={entry}
                    onEdit={startEdit}
                    onStatusChange={handleStatusChange}
                    onKundenbesuchDatumChange={handleKundenbesuchDatumChange}
                    statusSaving={statusSavingId === entry.id}
                    highlighted={highlightedId === entry.id || leadEditId === entry.id}
                    fallbackMitarbeiter={defaultMitarbeiter}
                    showPriority={listTab !== 'archiv'}
                    showSprache={listTab !== 'archiv'}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      ) : null}
    </div>
  );
};

export default System;
