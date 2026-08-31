import { useEffect, useMemo, useRef, useState } from 'react';
import {
  SOCIAL_CHANNELS,
  SOCIAL_QUICK_REPLIES,
  SOCIAL_TICKET_STATUS_OPTIONS,
  countUnreadSocialTickets,
  lastMessageAt,
  loadSocialTickets,
  resetSocialTickets,
  saveSocialTickets
} from './socialZentraleDemoData';
import './SocialZentrale.scss';

const channelLabel = (id) => SOCIAL_CHANNELS.find((c) => c.id === id)?.label || id;

function formatListTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

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

function ChannelIcon({ channel }) {
  if (channel === 'whatsapp') {
    return (
      <svg className="sz-channel-icon" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M19.05 4.91A9.82 9.82 0 0012.04 2C6.55 2 2.08 6.46 2.08 11.94c0 1.76.46 3.48 1.34 5L2 22l5.2-1.36a9.9 9.9 0 004.84 1.23h.01c5.49 0 9.96-4.46 9.96-9.94a9.86 9.86 0 00-2.96-7.02zm-7 15.24h-.01a8.23 8.23 0 01-4.19-1.15l-.3-.18-3.08.81.82-3-.2-.31a8.2 8.2 0 01-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.42 5.83c0 4.55-3.7 8.24-8.24 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.4-.12-.56.12-.17.25-.64.8-.79.97-.14.17-.3.19-.55.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.3.37-.44.12-.15.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.09 0 1.24.9 2.43 1.03 2.6.12.17 1.78 2.72 4.3 3.81.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.17-.48-.29z"
        />
      </svg>
    );
  }
  if (channel === 'instagram') {
    return (
      <svg className="sz-channel-icon" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm10 2H7a3 3 0 00-3 3v10a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3zm-5 3.5A4.5 4.5 0 1112 16a4.5 4.5 0 010-9zm0 2A2.5 2.5 0 1014.5 12 2.5 2.5 0 0012 7.5zM17.5 6a1 1 0 11-1 1 1 1 0 011-1z"
        />
      </svg>
    );
  }
  return (
    <svg className="sz-channel-icon" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M14.5 3.5v11.1a3.4 3.4 0 11-2.9-3.35V8.2c1.9.4 3.5 1.5 4.5 3.1V6.4c1 .5 1.9 1.2 2.6 2.1V3.5h-4.2zM9.2 14.6a3.4 3.4 0 11-3.4-3.4 3.4 3.4 0 013.4 3.4z"
      />
    </svg>
  );
}

const SocialZentrale = ({ agentName, onUnreadChange }) => {
  const [tickets, setTickets] = useState(() => loadSocialTickets());
  const [channel, setChannel] = useState('all');
  const [statusFilter, setStatusFilter] = useState('open');
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const threadRef = useRef(null);
  const composerRef = useRef(null);

  useEffect(() => {
    saveSocialTickets(tickets);
    onUnreadChange?.(countUnreadSocialTickets(tickets));
  }, [tickets, onUnreadChange]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets
      .filter((t) => (channel === 'all' ? true : t.channel === channel))
      .filter((t) => {
        if (statusFilter === 'open') return t.ticketStatus !== 'Erledigt';
        if (statusFilter === 'done') return t.ticketStatus === 'Erledigt';
        return true;
      })
      .filter((t) => {
        if (!q) return true;
        const hay = `${t.id} ${t.customerName} ${t.handle} ${t.messages.map((m) => m.text).join(' ')}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => String(lastMessageAt(b)).localeCompare(String(lastMessageAt(a))));
  }, [tickets, channel, statusFilter, search]);

  const active = tickets.find((t) => t.id === activeId) || null;

  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [active?.id, active?.messages?.length]);

  const unreadByChannel = useMemo(() => {
    const counts = { all: 0, whatsapp: 0, instagram: 0, tiktok: 0 };
    tickets.forEach((t) => {
      if (!t.unread || t.ticketStatus === 'Erledigt') return;
      counts.all += 1;
      counts[t.channel] = (counts[t.channel] || 0) + 1;
    });
    return counts;
  }, [tickets]);

  const openTicket = (id) => {
    setActiveId(id);
    setDraft('');
    setMobileShowChat(true);
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, unread: false } : t)));
  };

  const backToList = () => {
    setMobileShowChat(false);
  };

  const patchTicket = (id, updater) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? updater(t) : t)));
  };

  const handleStatus = (id, ticketStatus) => {
    patchTicket(id, (t) => ({
      ...t,
      ticketStatus,
      unread: ticketStatus === 'Erledigt' ? false : t.unread
    }));
  };

  const sendReply = () => {
    if (!active || sending) return;
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    const at = new Date().toISOString();
    const message = {
      id: `local-${Date.now()}`,
      from: 'agent',
      authorName: agentName || 'Zentrale',
      text,
      at,
      demoLocal: true
    };
    window.setTimeout(() => {
      patchTicket(active.id, (t) => ({
        ...t,
        unread: false,
        ticketStatus: t.ticketStatus === 'Offen' ? 'In Bearbeitung' : t.ticketStatus,
        messages: [...t.messages, message]
      }));
      setDraft('');
      setSending(false);
      composerRef.current?.focus();
    }, 280);
  };

  const handleComposerKey = (ev) => {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      sendReply();
    }
  };

  const handleReset = () => {
    const next = resetSocialTickets();
    setTickets(next);
    setActiveId(null);
    setDraft('');
    setMobileShowChat(false);
  };

  return (
    <section
      className={`sz${mobileShowChat && active ? ' sz--chat-open' : ''}`}
      aria-label="Nachrichten-Zentrale"
    >
      <p className="sz-demo-banner" role="note">
        Frontend-Demo: Beispieldaten für WhatsApp, Instagram und TikTok. Antworten bleiben nur in
        diesem Browser – die Kanäle werden später per API angebunden.
        <button type="button" className="sz-demo-reset" onClick={handleReset}>
          Demo zurücksetzen
        </button>
      </p>

      <div className="sz-layout">
        <aside className="sz-list-pane">
          <div className="sz-filters">
            <div className="sz-channel-row" role="tablist" aria-label="Kanäle">
              <button
                type="button"
                role="tab"
                aria-selected={channel === 'all'}
                className={`sz-chip${channel === 'all' ? ' sz-chip--active' : ''}`}
                onClick={() => setChannel('all')}
              >
                Alle
                {unreadByChannel.all > 0 ? (
                  <span className="sz-chip-count">{unreadByChannel.all}</span>
                ) : null}
              </button>
              {SOCIAL_CHANNELS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={channel === c.id}
                  className={`sz-chip sz-chip--${c.id}${channel === c.id ? ' sz-chip--active' : ''}`}
                  onClick={() => setChannel(c.id)}
                >
                  <ChannelIcon channel={c.id} />
                  {c.label}
                  {unreadByChannel[c.id] > 0 ? (
                    <span className="sz-chip-count">{unreadByChannel[c.id]}</span>
                  ) : null}
                </button>
              ))}
            </div>
            <div className="sz-filter-row">
              <label className="visually-hidden" htmlFor="sz-search">
                Tickets suchen
              </label>
              <input
                id="sz-search"
                type="search"
                className="form-input sz-search"
                value={search}
                onChange={(ev) => setSearch(ev.target.value)}
                placeholder="Name, Handle oder ID…"
                autoComplete="off"
              />
              <select
                className="form-input sz-status-filter"
                value={statusFilter}
                onChange={(ev) => setStatusFilter(ev.target.value)}
                aria-label="Status filtern"
              >
                <option value="open">Offen</option>
                <option value="all">Alle Status</option>
                <option value="done">Erledigt</option>
              </select>
            </div>
          </div>

          <ul className="sz-ticket-list">
            {filtered.length === 0 ? (
              <li className="sz-empty">Keine Nachrichten für diesen Filter.</li>
            ) : (
              filtered.map((t) => {
                const last = t.messages[t.messages.length - 1];
                const selected = t.id === activeId;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      className={`sz-ticket${selected ? ' sz-ticket--active' : ''}${t.unread ? ' sz-ticket--unread' : ''}`}
                      onClick={() => openTicket(t.id)}
                    >
                      <span className={`sz-ticket-channel sz-ticket-channel--${t.channel}`} title={channelLabel(t.channel)}>
                        <ChannelIcon channel={t.channel} />
                      </span>
                      <span className="sz-ticket-body">
                        <span className="sz-ticket-top">
                          <span className="sz-ticket-name">{t.customerName}</span>
                          <time className="sz-ticket-time" dateTime={lastMessageAt(t)}>
                            {formatListTime(lastMessageAt(t))}
                          </time>
                        </span>
                        <span className="sz-ticket-meta">
                          <span className="sz-ticket-id">{t.id}</span>
                          <span className="sz-ticket-handle">{t.handle}</span>
                        </span>
                        <span className="sz-ticket-preview">{last?.text || '—'}</span>
                      </span>
                      {t.unread ? <span className="sz-unread-dot" aria-label="ungelesen" /> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        <div className="sz-chat-pane">
          {!active ? (
            <div className="sz-chat-placeholder">
              <p>Ticket wählen – jede eingehende Nachricht ist ein Vorgang. Antworten Sie direkt aus der Zentrale.</p>
            </div>
          ) : (
            <>
              <header className="sz-chat-head">
                <button type="button" className="sz-back" onClick={backToList}>
                  ← Liste
                </button>
                <span className={`sz-ticket-channel sz-ticket-channel--${active.channel}`}>
                  <ChannelIcon channel={active.channel} />
                </span>
                <div className="sz-chat-head-text">
                  <h2 className="sz-chat-title">{active.customerName}</h2>
                  <p className="sz-chat-sub">
                    <span className="sz-ticket-id">{active.id}</span>
                    {' · '}
                    {channelLabel(active.channel)}
                    {' · '}
                    {active.handle}
                  </p>
                </div>
                <label className="sz-status-label">
                  Status
                  <select
                    className="form-input sz-status-select"
                    value={active.ticketStatus}
                    onChange={(ev) => handleStatus(active.id, ev.target.value)}
                  >
                    {SOCIAL_TICKET_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </header>

              <div className="sz-thread" ref={threadRef}>
                {active.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`sz-bubble sz-bubble--${m.from}${m.demoLocal ? ' sz-bubble--demo' : ''}`}
                  >
                    <p className="sz-bubble-author">
                      {m.from === 'agent' ? m.authorName || 'Zentrale' : active.customerName}
                    </p>
                    <p className="sz-bubble-text">{m.text}</p>
                    <time className="sz-bubble-time" dateTime={m.at}>
                      {formatChatTime(m.at)}
                      {m.demoLocal ? ' · Demo' : ''}
                    </time>
                  </div>
                ))}
              </div>

              <div className="sz-composer">
                <div className="sz-quick">
                  {SOCIAL_QUICK_REPLIES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      className="sz-quick-btn"
                      onClick={() => setDraft(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <div className="sz-composer-row">
                  <label className="visually-hidden" htmlFor="sz-reply">
                    Antwort
                  </label>
                  <textarea
                    id="sz-reply"
                    ref={composerRef}
                    className="form-input sz-composer-input"
                    rows={2}
                    value={draft}
                    onChange={(ev) => setDraft(ev.target.value)}
                    onKeyDown={handleComposerKey}
                    placeholder={`Antwort an ${active.customerName} über ${channelLabel(active.channel)}…`}
                    disabled={sending || active.ticketStatus === 'Erledigt'}
                  />
                  <button
                    type="button"
                    className="btn btn--primary sz-send"
                    onClick={sendReply}
                    disabled={sending || !draft.trim() || active.ticketStatus === 'Erledigt'}
                  >
                    {sending ? 'Senden…' : 'Senden'}
                  </button>
                </div>
                {active.ticketStatus === 'Erledigt' ? (
                  <p className="sz-composer-hint">Ticket erledigt – zum Antworten Status wieder öffnen.</p>
                ) : (
                  <p className="sz-composer-hint">Enter sendet, Umschalt+Enter neue Zeile. Noch ohne Kanal-API.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default SocialZentrale;
