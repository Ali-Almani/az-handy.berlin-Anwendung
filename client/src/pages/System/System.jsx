import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isAdmin } from '../../utils/roles';
import {
  listVorvertraegeApi,
  createVorvertragApi,
  updateVorvertragApi,
  updateVorvertragTicketStatusApi
} from '../../services/vorvertrag.service';
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
import { useVorvertragImeiCatalog } from './useVorvertragImeiCatalog';
import { emptyMnpDetails } from './mnpConstants';
import { isMnpOnlyEntry } from './vorvertragEntryType';
import { FILIALE_OPTIONS, userFilialeFromEinsatzOrt } from '../../constants/einsatzorte';
import { isVorvertragArchived, normalizeVorvertragTicketStatus } from './vorvertragTicketStatus';
import { entryMatchesCustomerNameSearch } from './vorvertragCustomerUtils';
import CallcenterNachrichten from './CallcenterNachrichten';
import {
  countUnreadLeadTickets,
  isLeadArchived,
  isLeadEntry,
  isLeadInNeu,
  leadToNeuEntry,
  loadLeadTickets,
  migrateLeadTicketStatus,
  saveLeadTickets
} from './callcenterLeadData';
import './System.scss';

const TOAST_MS = 4500;

const System = () => {
  const { user } = useAuth();
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
  const [archivSearch, setArchivSearch] = useState('');
  const [statusSavingId, setStatusSavingId] = useState('');
  const [leadTickets, setLeadTickets] = useState(() => loadLeadTickets());
  const [openLeadId, setOpenLeadId] = useState('');

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

  const leadOffenEntries = useMemo(
    () => leadTickets.filter(isLeadInNeu).map(leadToNeuEntry),
    [leadTickets]
  );
  const leadArchivEntries = useMemo(
    () => leadTickets.filter(isLeadArchived).map(leadToNeuEntry),
    [leadTickets]
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
    if (listTab === 'offen') return [...leadOffenEntries, ...vv];
    if (listTab === 'archiv') {
      const leads = archivSearch.trim()
        ? leadArchivEntries.filter((entry) => entryMatchesCustomerNameSearch(entry, archivSearch))
        : leadArchivEntries;
      return [...leads, ...vv];
    }
    return vv;
  }, [entries, listTab, archivSearch, leadOffenEntries, leadArchivEntries]);

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

  const activeEditLog = useMemo(() => {
    if (mode !== 'edit' || !activeId) return [];
    return entries.find((entry) => entry.id === activeId)?.editLog || [];
  }, [mode, activeId, entries]);

  const {
    imeis,
    loading: geraeteLoading,
    error: geraeteError
  } = useVorvertragImeiCatalog(Boolean(user && isAdmin(user)));

  useEffect(() => {
    saveLeadTickets(leadTickets);
  }, [leadTickets]);

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
    if (user && isAdmin(user)) loadList();
  }, [user, loadList]);

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

  const startEdit = (entry) => {
    if (isLeadEntry(entry)) {
      setOpenLeadId(entry.id);
      setListTab('nachrichten');
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
    setForm(emptyVorvertragForm());
    setGeraetSeed('');
    setMode('new');
    setFormKind('vorvertrag');
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
            ? {
                ...t,
                ticketStatus: nextLead,
                mitarbeiterName: defaultMitarbeiter || t.mitarbeiterName
              }
            : t
        )
      );
      if (nextLead === 'Erledigt') {
        setListTab('archiv');
      } else {
        setListTab('offen');
      }
      setHighlightedId(id);
      return;
    }

    const nextStatus = normalizeVorvertragTicketStatus(ticketStatus);
    if (normalizeVorvertragTicketStatus(entry?.ticketStatus) === nextStatus) return;

    setStatusSavingId(id);
    setError('');
    try {
      await updateVorvertragTicketStatusApi(id, nextStatus);
      await loadList({ silent: true });
      if (nextStatus === 'Erledigt') {
        setListTab('archiv');
      } else {
        setListTab('offen');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Status konnte nicht gespeichert werden.');
    } finally {
      setStatusSavingId('');
    }
  };

  if (!user || !isAdmin(user)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="system-page container">
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
        </button>
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
          Offen ({offenCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={listTab === 'erstellen'}
          className={`system-tab${listTab === 'erstellen' ? ' system-tab--active' : ''}`}
          onClick={() => setListTab('erstellen')}
        >
          Ticketing erstellen
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={listTab === 'archiv'}
          className={`system-tab${listTab === 'archiv' ? ' system-tab--active' : ''}`}
          onClick={() => setListTab('archiv')}
        >
          Archiv ({archivCount})
        </button>
      </div>

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
          onStatusApplied={(id) => {
            setOpenLeadId('');
            setListTab('offen');
            if (id) setHighlightedId(id);
          }}
          onOpened={() => setOpenLeadId('')}
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
      <section className="vorvertrag-table-section" ref={cardsSectionRef}>
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
                  <th>Filiale</th>
                  <th>Typ</th>
                  <th>Status</th>
                  <th>Mitarbeiter</th>
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
                    statusSaving={statusSavingId === entry.id}
                    highlighted={highlightedId === entry.id}
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
