import { formatEinsatzOrt } from '../../constants/einsatzorte';
import { mnpDetailsFromEingabe } from './mnpConstants';
import { isMnpOnlyEntry } from './vorvertragEntryType';
import {
  isLeadEntry,
  LEAD_STATUS_OPTIONS,
  leadStatusBadge,
  normalizeLeadStatus
} from './callcenterLeadData';
import {
  normalizeVorvertragTicketStatus,
  VORVERTRAG_TICKET_STATUS_OPTIONS,
  vorvertragTicketStatusBadge
} from './vorvertragTicketStatus';

function MetaChip({ children, accent }) {
  return (
    <span className={`vorvertrag-ticket-chip${accent ? ' vorvertrag-ticket-chip--accent' : ''}`}>
      {children}
    </span>
  );
}

function mitarbeiterName(entry) {
  const candidate =
    entry?.mitarbeiterName ||
    entry?.createdBy?.name ||
    entry?.createdBy?.userName ||
    entry?.lastEditedBy?.name ||
    entry?.lastEditedBy?.userName ||
    '';
  const value = String(candidate).trim();
  if (!value) return '';
  const roleLike = [
    'admin',
    'Administrator',
    'Büro Mitarbeiter',
    'Marketing',
    'Callcenter',
    'Shops',
    'Buchhaltung',
    'Einkauf',
    'Partner',
    'Teamleiter shop',
    'Mitarbeiter shop',
    'Mitarbeiter'
  ];
  if (roleLike.includes(value) || /^mitarbeiter(\s|$)/i.test(value)) return '';
  return value;
}

function formatDatum(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '—';
  const parts = raw.split('-');
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return raw;
}

export default function VorvertragEntryCard({
  entry,
  onEdit,
  onStatusChange,
  statusSaving = false,
  highlighted = false
}) {
  const e = entry?.eingabeDetails || {};
  const mnp = mnpDetailsFromEingabe(e);
  const mnpOnly = isMnpOnlyEntry(entry);
  const nameFromMnp = [mnp.kundenVorname, mnp.kundenNachname].filter(Boolean).join(' ');
  const nameFromEntry = [entry?.kundeVorname, entry?.kundeNachname].filter(Boolean).join(' ');
  const lead = isLeadEntry(entry);
  const name = lead
    ? (entry?.rufnummer || entry?.angebot || 'Ohne Rufnummer')
    : (nameFromEntry || nameFromMnp || 'Ohne Kundenname');
  const mitarbeiter = mitarbeiterName(entry);
  const ticketStatus = lead
    ? (normalizeLeadStatus(entry?.ticketStatus) || LEAD_STATUS_OPTIONS[0])
    : normalizeVorvertragTicketStatus(entry?.ticketStatus);
  const statusOptions = lead ? LEAD_STATUS_OPTIONS : VORVERTRAG_TICKET_STATUS_OPTIONS;
  const badgeMod = lead ? leadStatusBadge(ticketStatus) : vorvertragTicketStatusBadge(ticketStatus);
  const filiale = formatEinsatzOrt(entry?.filiale);

  return (
    <tr
      className={`vorvertrag-ticket-row${highlighted ? ' vorvertrag-ticket-row--highlight' : ''}`}
      data-entry-id={entry?.id}
    >
      <td className="vorvertrag-ticket-row__id">{entry?.id || '—'}</td>
      <td className="vorvertrag-ticket-row__kunde">{name}</td>
      <td className="vorvertrag-ticket-row__datum">{formatDatum(entry?.datum)}</td>
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
      <td className="vorvertrag-ticket-row__status">
        <div className="vorvertrag-ticket-row__status-inner">
          <span
            className={`vorvertrag-ticket-badge vorvertrag-ticket-badge--${badgeMod}`}
          >
            {ticketStatus}
          </span>
          <select
            className="form-input vorvertrag-ticket-row__status-select"
            value={ticketStatus}
            disabled={statusSaving}
            onChange={(ev) => onStatusChange?.(entry, ev.target.value)}
            aria-label={`Status für ${name}`}
          >
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </td>
      <td className="vorvertrag-ticket-row__mitarbeiter">{mitarbeiter || '—'}</td>
      <td className="vorvertrag-ticket-row__actions">
        <button type="button" className="btn btn--secondary btn--small" onClick={() => onEdit?.(entry)}>
          Bearbeiten
        </button>
      </td>
    </tr>
  );
}
