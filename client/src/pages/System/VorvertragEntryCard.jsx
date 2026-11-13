import { formatEinsatzOrt } from '../../constants/einsatzorte';
import { mnpDetailsFromEingabe } from './mnpConstants';
import { isMnpOnlyEntry } from './vorvertragEntryType';
import {
  collectMitarbeiterNames,
  collectShopMitarbeiterNames,
  displayTicketId,
  isLeadEntry,
  migrateLeadTicketStatus,
  sanitizeMitarbeiterName
} from './callcenterLeadData';
import {
  normalizeVorvertragTicketStatus,
  VORVERTRAG_TICKET_STATUS_OPTIONS,
  vorvertragTicketStatusBadge
} from './vorvertragTicketStatus';
import { normalizeTicketPriority, ticketPriorityBadge } from './ticketPriority';
import { normalizeTicketLanguage } from './ticketLanguage';

function MetaChip({ children, accent }) {
  return (
    <span className={`vorvertrag-ticket-chip${accent ? ' vorvertrag-ticket-chip--accent' : ''}`}>
      {children}
    </span>
  );
}

function mitarbeiterNames(entry, fallbackName = '') {
  const e = entry?.eingabeDetails || {};
  const mnp = mnpDetailsFromEingabe(e);
  const names = collectMitarbeiterNames({
    ...entry,
    mitarbeiterName: entry?.mitarbeiterName || mnp.mitarbeiter || e.mitarbeiter
  });
  const fallback = sanitizeMitarbeiterName(fallbackName);
  if (fallback && !names.includes(fallback) && names.length === 0) names.push(fallback);
  return names;
}

function MitarbeiterNamesSelect({ names, ariaLabel = 'Marketing Mitarbeiter' }) {
  if (!names.length) return '—';
  if (names.length === 1) return names[0];
  return (
    <select
      className="form-input vorvertrag-ticket-row__status-select vorvertrag-ticket-row__mitarbeiter-select"
      defaultValue={names[0]}
      aria-label={ariaLabel}
      onClick={(ev) => ev.stopPropagation()}
    >
      {names.map((name) => (
        <option key={name} value={name}>{name}</option>
      ))}
    </select>
  );
}

function formatDatum(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '—';
  const parts = raw.split('-');
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return raw;
}

function formatGeoeffnetZeit(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin'
  });
}

function StatusSelect({ value, name, disabled, onChange }) {
  return (
    <select
      className="form-input vorvertrag-ticket-row__status-select"
      value={value}
      disabled={disabled}
      onChange={onChange}
      aria-label={`Status für ${name}`}
    >
      {VORVERTRAG_TICKET_STATUS_OPTIONS.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}

export default function VorvertragEntryCard({
  entry,
  onEdit,
  onStatusChange,
  onKundenbesuchDatumChange,
  statusSaving = false,
  highlighted = false,
  fallbackMitarbeiter = '',
  showPriority = true,
  showSprache = true
}) {
  const e = entry?.eingabeDetails || {};
  const mnp = mnpDetailsFromEingabe(e);
  const mnpOnly = isMnpOnlyEntry(entry);
  const nameFromMnp = [mnp.kundenVorname, mnp.kundenNachname].filter(Boolean).join(' ');
  const nameFromEntry = [entry?.kundeVorname, entry?.kundeNachname].filter(Boolean).join(' ');
  const lead = isLeadEntry(entry);
  const name = lead
    ? (entry?.customerName || entry?.rufnummer || entry?.angebot || 'Ohne Namen')
    : (nameFromEntry || nameFromMnp || 'Ohne Kundenname');
  const mitarbeiter = mitarbeiterNames(entry, fallbackMitarbeiter);
  const shopMitarbeiter = collectShopMitarbeiterNames(entry);
  const ticketStatus = lead
    ? migrateLeadTicketStatus(entry?.ticketStatus)
    : normalizeVorvertragTicketStatus(entry?.ticketStatus);
  const badgeMod = vorvertragTicketStatusBadge(ticketStatus);
  const priority = normalizeTicketPriority(entry?.priority);
  const priorityMod = ticketPriorityBadge(priority);
  const sprache = normalizeTicketLanguage(entry?.sprache);
  const filiale = formatEinsatzOrt(entry?.filiale);

  return (
    <tr
      className={`vorvertrag-ticket-row${highlighted ? ' vorvertrag-ticket-row--highlight' : ''}`}
      data-entry-id={entry?.id}
    >
      <td className="vorvertrag-ticket-row__id">{displayTicketId(entry) || '—'}</td>
      <td className="vorvertrag-ticket-row__kunde">{name}</td>
      <td className="vorvertrag-ticket-row__datum">{formatDatum(entry?.datum)}</td>
      <td className="vorvertrag-ticket-row__zeit">{formatGeoeffnetZeit(entry?.createdAt)}</td>
      <td className="vorvertrag-ticket-row__filiale">
        {filiale ? <MetaChip accent>{filiale}</MetaChip> : '—'}
      </td>
      <td className="vorvertrag-ticket-row__typ">
        {lead ? (
          <MetaChip accent>{entry?.angebot || 'Nachricht'}</MetaChip>
        ) : mnpOnly ? (
          <MetaChip accent>MNP</MetaChip>
        ) : (
          'Vorvertrag'
        )}
      </td>
      {showPriority ? (
        <td className="vorvertrag-ticket-row__priority">
          <span className={`vorvertrag-ticket-badge vorvertrag-ticket-badge--prio-${priorityMod}`}>
            {priority}
          </span>
        </td>
      ) : null}
      {showSprache ? (
        <td className="vorvertrag-ticket-row__sprache">
          <MetaChip>{sprache}</MetaChip>
        </td>
      ) : null}
      <td className="vorvertrag-ticket-row__status">
        <div className={`vorvertrag-ticket-row__status-inner vorvertrag-ticket-row__status-inner--${badgeMod}`}>
          <StatusSelect
            value={ticketStatus}
            name={name}
            disabled={statusSaving}
            onChange={(ev) => onStatusChange?.(entry, ev.target.value)}
          />
          {ticketStatus === 'Kundenbesuch' ? (
            <label className="vorvertrag-ticket-row__kundenbesuch-datum">
              <input
                className="form-input"
                type="date"
                value={String(entry?.kundenbesuchDatum || '').trim()}
                disabled={statusSaving}
                aria-label={`Datum für ${name}`}
                onClick={(ev) => ev.stopPropagation()}
                onChange={(ev) => onKundenbesuchDatumChange?.(entry, ev.target.value)}
              />
            </label>
          ) : null}
        </div>
      </td>
      <td className="vorvertrag-ticket-row__mitarbeiter">
        <MitarbeiterNamesSelect names={mitarbeiter} />
      </td>
      <td className="vorvertrag-ticket-row__shop-mitarbeiter">
        <MitarbeiterNamesSelect names={shopMitarbeiter} ariaLabel="Bearbeiter" />
      </td>
      <td className="vorvertrag-ticket-row__actions">
        <button
          type="button"
          className="vorvertrag-ticket-row__edit-icon"
          onClick={() => onEdit?.(entry)}
          aria-label={`Bearbeiten: ${name}`}
          title="Bearbeiten"
        >
          <svg viewBox="0 0 24 24" aria-hidden>
            <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
        </button>
      </td>
    </tr>
  );
}
