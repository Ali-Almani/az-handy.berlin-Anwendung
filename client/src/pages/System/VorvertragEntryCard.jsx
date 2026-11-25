import { mnpDetailsFromEingabe } from './mnpConstants';
import { isMnpOnlyEntry } from './vorvertragEntryType';
import {
  collectMitarbeiterNames,
  collectShopMitarbeiterNames,
  displayTicketId,
  isLeadEntry,
  migrateLeadTicketStatus,
  sanitizeMitarbeiterName,
  compactShopLabel,
  displayTicketShop1,
  displayTicketShop2
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
  if (isLeadEntry(entry)) {
    const names = [];
    const add = (value) => {
      const name = sanitizeMitarbeiterName(value);
      if (name && !names.includes(name)) names.push(name);
    };
    add(entry?.mitarbeiterName);
    (Array.isArray(entry?.mitarbeiterNames) ? entry.mitarbeiterNames : []).forEach(add);
    return names;
  }
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
      key={names[0]}
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

function uniqueTicketStaffNames(list) {
  const names = [];
  (list || []).forEach((value) => {
    const name = sanitizeMitarbeiterName(value);
    if (name && !names.includes(name)) names.push(name);
  });
  return names;
}

function StaffNameEditor({
  value,
  ticketNames,
  ariaLabel,
  disabled,
  onChange
}) {
  const ticket = uniqueTicketStaffNames([...(ticketNames || []), value]);
  const current = sanitizeMitarbeiterName(value) || ticket[0] || '';
  if (!ticket.length) return '—';
  if (ticket.length === 1) return ticket[0];
  return (
    <select
      className="form-input vorvertrag-ticket-row__status-select vorvertrag-ticket-row__mitarbeiter-select"
      value={current}
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={(ev) => ev.stopPropagation()}
      onChange={(ev) => onChange?.(ev.target.value)}
    >
      {ticket.map((name) => (
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
  onDelete,
  canDelete = false,
  onStatusChange,
  onKundenbesuchDatumChange,
  statusSaving = false,
  highlighted = false,
  fallbackMitarbeiter = '',
  showPriority = true,
  showSprache = true,
  canEditStaffNames = false,
  onStaffNameChange
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
  const filiale = String(entry?.filiale || entry?.shop || '').trim();
  const shop1 = displayTicketShop1(entry);
  const shop2 = displayTicketShop2(entry);

  return (
    <tr
      className={`vorvertrag-ticket-row${highlighted ? ' vorvertrag-ticket-row--highlight' : ''}`}
      data-entry-id={entry?.id}
    >
      <td className="vorvertrag-ticket-row__id">{displayTicketId(entry) || '—'}</td>
      <td className="vorvertrag-ticket-row__datum">{formatDatum(entry?.datum)}</td>
      <td className="vorvertrag-ticket-row__zeit">{formatGeoeffnetZeit(entry?.createdAt)}</td>
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
      <td
        className="vorvertrag-ticket-row__mitarbeiter"
        title={entry?.mitarbeiterName || mitarbeiter[0] || ''}
      >
        {canEditStaffNames && lead ? (
          <StaffNameEditor
            value={entry?.mitarbeiterName}
            ticketNames={mitarbeiter}
            ariaLabel="Marketing Mitarbeiter"
            disabled={statusSaving}
            onChange={(value) => onStaffNameChange?.(entry, 'mitarbeiterName', value)}
          />
        ) : (
          <MitarbeiterNamesSelect names={mitarbeiter} />
        )}
      </td>
      <td
        className="vorvertrag-ticket-row__shop-mitarbeiter"
        title={entry?.shopMitarbeiter || shopMitarbeiter[0] || ''}
      >
        {canEditStaffNames && lead ? (
          <StaffNameEditor
            value={entry?.shopMitarbeiter}
            ticketNames={shopMitarbeiter}
            ariaLabel="Bearbeiter"
            disabled={statusSaving}
            onChange={(value) => onStaffNameChange?.(entry, 'shopMitarbeiter', value)}
          />
        ) : (
          <MitarbeiterNamesSelect names={shopMitarbeiter} ariaLabel="Bearbeiter" />
        )}
      </td>
      <td className="vorvertrag-ticket-row__filiale">
        {filiale ? <MetaChip accent>{compactShopLabel(filiale)}</MetaChip> : '—'}
      </td>
      <td className="vorvertrag-ticket-row__shop-hist">
        {shop1 ? <MetaChip accent>{compactShopLabel(shop1)}</MetaChip> : '—'}
      </td>
      <td className="vorvertrag-ticket-row__shop-hist">
        {shop2 ? <MetaChip accent>{compactShopLabel(shop2)}</MetaChip> : '—'}
      </td>
      <td className={`vorvertrag-ticket-row__actions${canDelete ? '' : ' vorvertrag-ticket-row__actions--solo'}`}>
        <div className="vorvertrag-ticket-row__action-btns">
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
          {canDelete ? (
            <button
              type="button"
              className="vorvertrag-ticket-row__edit-icon vorvertrag-ticket-row__edit-icon--danger"
              onClick={() => onDelete?.(entry)}
              aria-label={`Löschen: ${name}`}
              title="Löschen"
            >
              <svg viewBox="0 0 24 24" aria-hidden>
                <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
