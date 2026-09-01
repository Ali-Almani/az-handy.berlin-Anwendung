import VorvertragEditLog from './VorvertragEditLog';
import { channelLabel } from './callcenterLeadData';

function formatChatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function LeadNachrichtHistory({ ticket, onClose, editLog = [] }) {
  const messages = Array.isArray(ticket?.messages) ? ticket.messages : [];
  const customerName = ticket?.customerName || ticket?.rufnummer || 'Kunde';

  return (
    <section className="lead-fragen-panel" aria-label="Nachrichtenverlauf">
      <div className="lead-fragen-panel__head">
        <div>
          <h3 className="lead-fragen-panel__title">Nachrichtenverlauf</h3>
          <p className="lead-fragen-panel__sub">
            {ticket?.id}
            {' · '}
            {channelLabel(ticket?.channel)}
            {' · '}
            {customerName}
            {ticket?.handle ? ` · ${ticket.handle}` : ''}
          </p>
        </div>
        {onClose ? (
          <button type="button" className="btn btn--secondary btn--small" onClick={onClose}>
            Fertig
          </button>
        ) : null}
      </div>
      <div className="lead-msg-thread">
        {messages.length === 0 ? (
          <p className="lead-msg-thread__empty">Keine Nachrichten.</p>
        ) : (
          messages.map((m) => {
            const fromAgent = m.from === 'agent';
            return (
              <div
                key={m.id || `${m.at}-${m.text}`}
                className={`lead-msg lead-msg--${fromAgent ? 'agent' : 'customer'}`}
              >
                <p className="lead-msg__author">
                  {fromAgent ? m.authorName || 'Zentrale' : customerName}
                </p>
                <p className="lead-msg__text">{m.text}</p>
                {m.at ? (
                  <time className="lead-msg__time" dateTime={m.at}>
                    {formatChatTime(m.at)}
                  </time>
                ) : null}
              </div>
            );
          })
        )}
      </div>
      <VorvertragEditLog items={editLog} />
    </section>
  );
}
