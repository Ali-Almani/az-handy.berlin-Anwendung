import { useEffect, useMemo, useRef, useState } from 'react';
import { formatEinsatzOrt } from '../../constants/einsatzorte';
import {
  LEAD_ANGEBOT_OPTIONS,
  LEAD_O2_OPTIONS,
  LEAD_STADT_OPTIONS,
  LEAD_STATUS_OPTIONS,
  emptyLeadForm,
  formFromLead,
  leadStatusBadge,
  nextLeadId,
  normalizeLeadStatus,
  shopOptionsForLeads
} from './callcenterLeadData';
import './System.scss';

function formatDatum(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '—';
  const parts = raw.split('-');
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return raw;
}

const CallcenterNachrichten = ({
  agentName,
  tickets,
  onTicketsChange,
  openTicketId,
  filialeOptions,
  onStatusApplied,
  onOpened
}) => {
  const formRef = useRef(null);
  const shops = useMemo(() => shopOptionsForLeads(filialeOptions), [filialeOptions]);
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState('new');
  const [activeId, setActiveId] = useState('');
  const [form, setForm] = useState(emptyLeadForm);
  const [search, setSearch] = useState('');

  const list = tickets || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q
      ? list.filter((t) => {
          const hay = [
            t.id,
            t.rufnummer,
            t.o2Kunde,
            t.angebot,
            t.produktNotiz,
            t.stadt,
            t.marketingNotiz,
            t.shop,
            t.ticketStatus
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return hay.includes(q);
        })
      : list;
    return [...rows].sort((a, b) => String(b.id).localeCompare(String(a.id)));
  }, [list, search]);

  const patch = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const startNew = () => {
    setMode('new');
    setActiveId('');
    setForm(emptyLeadForm());
    setShowForm(true);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const startEdit = (entry) => {
    setMode('edit');
    setActiveId(entry.id);
    setForm(formFromLead(entry));
    setShowForm(true);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  useEffect(() => {
    if (!openTicketId) return;
    const match = list.find((t) => t.id === openTicketId);
    if (match) startEdit(match);
    onOpened?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTicketId]);

  const cancelForm = () => {
    setShowForm(false);
    setActiveId('');
    setForm(emptyLeadForm());
    setMode('new');
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    const ticketStatus = normalizeLeadStatus(form.ticketStatus);
    if (!ticketStatus) return;
    const payload = {
      rufnummer: String(form.rufnummer || '').trim(),
      o2Kunde: form.o2Kunde === 'Ja' ? 'Ja' : 'Nein',
      angebot: String(form.angebot || '').trim(),
      produktNotiz: String(form.produktNotiz || '').trim(),
      stadt: String(form.stadt || '').trim(),
      marketingNotiz: String(form.marketingNotiz || '').trim(),
      terminDatum: form.terminDatum || '',
      terminZeit: form.terminZeit || '',
      shop: form.shop || '',
      ticketStatus,
      mitarbeiterName: agentName || ''
    };

    if (mode === 'edit' && activeId) {
      onTicketsChange?.((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, ...payload } : t))
      );
      cancelForm();
      onStatusApplied?.(activeId);
    } else {
      const id = nextLeadId(list);
      onTicketsChange?.((prev) => [
        {
          id,
          createdAt: new Date().toISOString(),
          ...payload
        },
        ...prev
      ]);
      cancelForm();
      onStatusApplied?.(id);
    }
  };

  const handleStatus = (id, ticketStatus) => {
    const next = normalizeLeadStatus(ticketStatus);
    if (!next) return;
    onTicketsChange?.((prev) => prev.map((t) => (t.id === id ? { ...t, ticketStatus: next } : t)));
    onStatusApplied?.(id);
  };

  return (
    <section className="lead-nachrichten" aria-label="Nachrichten">
      <div className="system-toolbar">
        <button type="button" className="btn btn--primary" onClick={startNew} disabled={showForm}>
          Neue Nachricht
        </button>
      </div>

      {showForm ? (
        <form ref={formRef} className="vorvertrag-panel vorvertrag-form-panel" onSubmit={handleSubmit}>
          <div className="vorvertrag-form-panel__head">
            <div className="vorvertrag-form-panel__title">
              <h2>{mode === 'edit' ? 'Nachricht bearbeiten' : 'Neue Nachricht'}</h2>
              {mode === 'edit' && activeId ? <p className="vorvertrag-ticket-id">{activeId}</p> : null}
            </div>
            <button type="button" className="btn btn--secondary btn--small" onClick={cancelForm}>
              Abbrechen
            </button>
          </div>

          <div className="vorvertrag-form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="lead-rufnummer">Rufnummer</label>
              <input
                id="lead-rufnummer"
                className="form-input"
                type="tel"
                value={form.rufnummer}
                onChange={(ev) => patch('rufnummer', ev.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="lead-o2">O2 Kunde?</label>
              <select
                id="lead-o2"
                className="form-input"
                value={form.o2Kunde}
                onChange={(ev) => patch('o2Kunde', ev.target.value)}
              >
                {LEAD_O2_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="lead-angebot">Angebot / Produkt</label>
              <select
                id="lead-angebot"
                className="form-input"
                value={form.angebot}
                onChange={(ev) => patch('angebot', ev.target.value)}
              >
                <option value="">—</option>
                {LEAD_ANGEBOT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="lead-produkt-notiz">Produkt Notiz</label>
              <input
                id="lead-produkt-notiz"
                className="form-input"
                value={form.produktNotiz}
                onChange={(ev) => patch('produktNotiz', ev.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="lead-stadt">Stadt</label>
              <select
                id="lead-stadt"
                className="form-input"
                value={form.stadt}
                onChange={(ev) => patch('stadt', ev.target.value)}
              >
                <option value="">—</option>
                {LEAD_STADT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="lead-marketing">Marketing Notiz</label>
              <input
                id="lead-marketing"
                className="form-input"
                value={form.marketingNotiz}
                onChange={(ev) => patch('marketingNotiz', ev.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="lead-termin-datum">Termin Datum</label>
              <input
                id="lead-termin-datum"
                className="form-input"
                type="date"
                value={form.terminDatum}
                onChange={(ev) => patch('terminDatum', ev.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="lead-termin-zeit">Termin Zeit</label>
              <input
                id="lead-termin-zeit"
                className="form-input"
                type="time"
                value={form.terminZeit}
                onChange={(ev) => patch('terminZeit', ev.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="lead-shop">Shop</label>
              <select
                id="lead-shop"
                className="form-input vorvertrag-filiale-select"
                value={form.shop}
                onChange={(ev) => patch('shop', ev.target.value)}
              >
                <option value="">—</option>
                {shops.map((opt) => (
                  <option key={opt} value={opt}>{formatEinsatzOrt(opt) === '–' ? opt : formatEinsatzOrt(opt)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="lead-status">Status</label>
              <select
                id="lead-status"
                className="form-input"
                value={form.ticketStatus}
                onChange={(ev) => patch('ticketStatus', ev.target.value)}
                required
              >
                {LEAD_STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="system-toolbar" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
            <button type="submit" className="btn btn--primary">
              {mode === 'edit' ? 'Speichern' : 'Ticket anlegen'}
            </button>
          </div>
        </form>
      ) : null}

      <section className="vorvertrag-table-section">
        <div className="system-archiv-search">
          <label htmlFor="lead-suche" className="form-label">Suchen</label>
          <input
            id="lead-suche"
            type="search"
            className="form-input"
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
            placeholder="Rufnummer, Produkt, Stadt, Shop oder ID…"
            autoComplete="off"
          />
        </div>
        {filtered.length === 0 ? (
          <p className="vorvertrag-empty">Keine Nachrichten.</p>
        ) : (
          <div className="vorvertrag-table-wrapper">
            <table className="vorvertrag-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Rufnummer</th>
                  <th>O2 Kunde?</th>
                  <th>Angebot / Produkt</th>
                  <th>Produkt Notiz</th>
                  <th>Stadt</th>
                  <th>Marketing Notiz</th>
                  <th>Termin Datum</th>
                  <th>Termin Zeit</th>
                  <th>Shop</th>
                  <th>Status</th>
                  <th>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const status = normalizeLeadStatus(t.ticketStatus);
                  return (
                    <tr key={t.id} className="vorvertrag-ticket-row">
                      <td className="vorvertrag-ticket-row__id">{t.id}</td>
                      <td>{t.rufnummer || '—'}</td>
                      <td>{t.o2Kunde || '—'}</td>
                      <td>{t.angebot || '—'}</td>
                      <td>{t.produktNotiz || '—'}</td>
                      <td>{t.stadt || '—'}</td>
                      <td>{t.marketingNotiz || '—'}</td>
                      <td className="vorvertrag-ticket-row__datum">{formatDatum(t.terminDatum)}</td>
                      <td>{t.terminZeit || '—'}</td>
                      <td className="vorvertrag-ticket-row__filiale">
                        {t.shop ? (
                          <span className="vorvertrag-ticket-chip vorvertrag-ticket-chip--accent">
                            {formatEinsatzOrt(t.shop) === '–' ? t.shop : formatEinsatzOrt(t.shop)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="vorvertrag-ticket-row__status">
                        <div className="vorvertrag-ticket-row__status-inner">
                          <span
                            className={`vorvertrag-ticket-badge vorvertrag-ticket-badge--${leadStatusBadge(status)}`}
                          >
                            {status}
                          </span>
                          <select
                            className="form-input vorvertrag-ticket-row__status-select"
                            value={status}
                            onChange={(ev) => handleStatus(t.id, ev.target.value)}
                            aria-label={`Status für ${t.id}`}
                          >
                            {LEAD_STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="vorvertrag-ticket-row__actions">
                        <button
                          type="button"
                          className="btn btn--secondary btn--small"
                          onClick={() => startEdit(t)}
                        >
                          Bearbeiten
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
};

export default CallcenterNachrichten;
