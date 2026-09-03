import { useEffect, useMemo, useRef, useState } from 'react';
import {
  SOCIAL_CHANNELS,
  QUESTION_CHAT_LOCALES,
  formFromLead,
  appendLeadEditLog,
  leadFieldChange,
  lastMessageAt,
  loadInboxNotiz,
  localizedTemplateQuestions,
  normalizeSocialChannel,
  questionChatLocale,
  saveInboxNotiz,
  shopAssignsTicket,
  shopOptionLabel,
  shopOptionsForNachrichten,
  normalizeNachrichtShop,
  sanitizeMitarbeiterName,
  spracheFromQuestionLocale,
  templateFieldMatchingDraft,
  channelLabel
} from './callcenterLeadData';
import LeadFragenForm from './LeadFragenForm';
import './System.scss';
import './CallcenterNachrichten.scss';

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
  const id = normalizeSocialChannel(channel);
  if (id === 'facebook') {
    return (
      <svg className="sz-channel-icon" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M14 8h3V4.5h-3c-2.5 0-4.5 2-4.5 4.5v2H7v3.5h2.5V21H13v-6.5h2.7l.6-3.5H13V9c0-.6.4-1 1-1z"
        />
      </svg>
    );
  }
  if (id === 'instagram') {
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

function StatusShopSelect({ shop, shops, onChange, ariaLabel }) {
  const value = normalizeNachrichtShop(shop);
  return (
    <select
      className="form-input vorvertrag-ticket-row__status-select"
      value={value}
      onChange={(ev) => onChange?.(ev.target.value)}
      onClick={(ev) => ev.stopPropagation()}
      aria-label={ariaLabel || 'Filiale wählen'}
    >
      <option value="">— Filiale wählen —</option>
      {shops.map((opt) => (
        <option key={opt} value={opt}>{shopOptionLabel(opt)}</option>
      ))}
    </select>
  );
}

const CallcenterNachrichten = ({
  agentName,
  tickets,
  onTicketsChange,
  openTicketId,
  onStatusApplied,
  onOpened
}) => {
  const nachrichtShops = useMemo(() => shopOptionsForNachrichten(), []);
  const [channel, setChannel] = useState('all');
  const [readTab, setReadTab] = useState('ungelesen');
  const [inboxNotiz, setInboxNotiz] = useState(() => loadInboxNotiz());
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const threadRef = useRef(null);
  const composerRef = useRef(null);
  const list = tickets || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list
      .filter((t) => (channel === 'all' ? true : normalizeSocialChannel(t.channel) === channel))
      .filter((t) => {
        if (readTab === 'notiz') return false;
        if (readTab === 'ungelesen') return Boolean(t.unread) || t.id === activeId;
        return !t.unread;
      })
      .filter((t) => {
        if (!q) return true;
        const hay = [
          t.id,
          t.customerName,
          t.handle,
          t.rufnummer,
          t.angebot,
          ...(t.messages || []).map((m) => m.text)
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => String(lastMessageAt(b)).localeCompare(String(lastMessageAt(a))));
  }, [list, channel, readTab, search, activeId]);

  const active = list.find((t) => t.id === activeId) || null;
  const answers = active ? formFromLead(active) : null;
  const showNotiz = readTab === 'notiz';
  const chatLocale = questionChatLocale(active?.sprache);
  const templateQuestions = useMemo(
    () => localizedTemplateQuestions(chatLocale),
    [chatLocale]
  );

  useEffect(() => {
    saveInboxNotiz(inboxNotiz);
  }, [inboxNotiz]);

  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [active?.id, active?.messages?.length]);

  const unreadByChannel = useMemo(() => {
    const counts = { all: 0, facebook: 0, instagram: 0, tiktok: 0 };
    list.forEach((t) => {
      if (!t.unread) return;
      counts.all += 1;
      const ch = normalizeSocialChannel(t.channel);
      counts[ch] = (counts[ch] || 0) + 1;
    });
    return counts;
  }, [list]);

  const readTabCounts = useMemo(() => {
    const inChannel = list.filter((t) => (channel === 'all' ? true : t.channel === channel));
    return {
      ungelesen: inChannel.filter((t) => t.unread).length,
      gelesen: inChannel.filter((t) => !t.unread).length
    };
  }, [list, channel]);

  const patchTicket = (id, updater) => {
    onTicketsChange?.((prev) => prev.map((t) => (t.id === id ? updater(t) : t)));
  };

  const openTicket = (id) => {
    setActiveId(id);
    setDraft('');
    setMobileShowChat(true);
    patchTicket(id, (t) => ({
      ...t,
      unread: false,
      mitarbeiterName: sanitizeMitarbeiterName(t.mitarbeiterName) || sanitizeMitarbeiterName(agentName)
    }));
  };

  useEffect(() => {
    if (!openTicketId) return;
    openTicket(openTicketId);
    onOpened?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTicketId]);

  const handleStatusOrShop = (id, value) => {
    const shop = normalizeNachrichtShop(value);
    if (!shop) return;
    const assignShop = (ticket) => {
      const editor = sanitizeMitarbeiterName(agentName);
      const next = {
        ...ticket,
        shop,
        ticketStatus: 'Offen',
        mitarbeiterName: sanitizeMitarbeiterName(ticket.mitarbeiterName) || editor
      };
      const changes = [
        leadFieldChange(ticket, 'shop', shop),
        leadFieldChange(ticket, 'ticketStatus', 'Offen')
      ].filter(Boolean);
      if (!changes.length) return next;
      return appendLeadEditLog(next, {
        editorName: editor,
        action: changes.some((c) => c.field === 'Status') ? 'status_changed' : 'updated',
        changes
      });
    };
    patchTicket(id, assignShop);
    onStatusApplied?.(id);
  };

  const patchAnswer = (field, value) => {
    if (!active) return;
    patchTicket(active.id, (t) => {
      const change = leadFieldChange(t, field, value);
      const next = { ...t, [field]: value };
      if (!change) return next;
      return appendLeadEditLog(next, {
        editorName: sanitizeMitarbeiterName(agentName),
        changes: [change]
      });
    });
  };

  const handleQuestionLocale = (locale) => {
    if (!active) return;
    patchAnswer('sprache', spracheFromQuestionLocale(locale));
    const field = templateFieldMatchingDraft(draft);
    if (!field) return;
    const next = localizedTemplateQuestions(locale).find((q) => q.field === field);
    if (next?.text) setDraft(next.text);
  };

  const sendText = (text) => {
    if (!active || sending) return;
    const body = String(text || '').trim();
    if (!body) return;
    setSending(true);
    const message = {
      id: `local-${Date.now()}`,
      from: 'agent',
      authorName: agentName || 'Zentrale',
      text: body,
      at: new Date().toISOString()
    };
    window.setTimeout(() => {
      patchTicket(active.id, (t) => ({
        ...t,
        unread: false,
        mitarbeiterName: sanitizeMitarbeiterName(t.mitarbeiterName) || sanitizeMitarbeiterName(agentName),
        messages: [...(t.messages || []), message]
      }));
      setDraft('');
      setSending(false);
      composerRef.current?.focus();
    }, 220);
  };

  const sendReply = () => sendText(draft);

  const handleComposerKey = (ev) => {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      sendReply();
    }
  };

  return (
    <section
      className={`sz${mobileShowChat && active ? ' sz--chat-open' : ''}`}
      aria-label="Posteingang"
    >
      <div className={`sz-layout${active ? ' sz-layout--with-questions' : ''}`}>
        <aside className="sz-list-pane">
          <div className="sz-filters">
            <div className="sz-read-tabs" role="tablist" aria-label="Ungelesen, Gelesen oder Notiz">
              <button
                type="button"
                role="tab"
                aria-selected={readTab === 'ungelesen'}
                className={`sz-read-tab${readTab === 'ungelesen' ? ' sz-read-tab--active' : ''}`}
                onClick={() => setReadTab('ungelesen')}
              >
                Ungelesen
                {readTabCounts.ungelesen > 0 ? (
                  <span className="sz-chip-count">{readTabCounts.ungelesen}</span>
                ) : null}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={readTab === 'gelesen'}
                className={`sz-read-tab${readTab === 'gelesen' ? ' sz-read-tab--active' : ''}`}
                onClick={() => setReadTab('gelesen')}
              >
                Gelesen
                {readTabCounts.gelesen > 0 ? (
                  <span className="sz-read-tab-count">{readTabCounts.gelesen}</span>
                ) : null}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={readTab === 'notiz'}
                className={`sz-read-tab${readTab === 'notiz' ? ' sz-read-tab--active' : ''}`}
                onClick={() => {
                  setReadTab('notiz');
                  setMobileShowChat(false);
                }}
              >
                Notiz
              </button>
            </div>
            {showNotiz ? null : (
              <>
                <div className="sz-channel-row" role="tablist" aria-label="Kanäle">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={channel === 'all'}
                    className={`sz-chip${channel === 'all' ? ' sz-chip--active' : ''}`}
                    onClick={() => setChannel('all')}
                  >
                    Alle
                    {unreadByChannel.all > 0 ? <span className="sz-chip-count">{unreadByChannel.all}</span> : null}
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
                <label className="visually-hidden" htmlFor="sz-search">Posteingang suchen</label>
                <input
                  id="sz-search"
                  type="search"
                  className="form-input sz-search"
                  value={search}
                  onChange={(ev) => setSearch(ev.target.value)}
                  placeholder="Name, Nummer oder ID…"
                  autoComplete="off"
                />
              </>
            )}
          </div>
          {showNotiz ? (
            <div className="sz-note-pane">
              <label className="visually-hidden" htmlFor="sz-inbox-notiz">Notiz</label>
              <textarea
                id="sz-inbox-notiz"
                className="form-input sz-note-input"
                value={inboxNotiz}
                onChange={(ev) => setInboxNotiz(ev.target.value)}
                placeholder="Notiz schreiben…"
                spellCheck="true"
              />
            </div>
          ) : (
          <ul className="sz-ticket-list">
            {filtered.length === 0 ? (
              <li className="sz-empty">
                {readTab === 'ungelesen'
                  ? 'Keine ungelesenen Nachrichten.'
                  : 'Keine gelesenen Nachrichten.'}
              </li>
            ) : (
              filtered.map((t) => {
                const last = t.messages?.[t.messages.length - 1];
                const selected = t.id === activeId;
                return (
                  <li key={t.id} className="sz-ticket-item">
                    <button
                      type="button"
                      className={`sz-ticket${selected ? ' sz-ticket--active' : ''}${t.unread ? ' sz-ticket--unread' : ''}`}
                      onClick={() => openTicket(t.id)}
                    >
                      <span className={`sz-ticket-channel sz-ticket-channel--${normalizeSocialChannel(t.channel)}`}>
                        <ChannelIcon channel={t.channel} />
                      </span>
                      <span className="sz-ticket-body">
                        <span className="sz-ticket-top">
                          <span className="sz-ticket-name">{t.customerName || t.rufnummer || 'Ohne Namen'}</span>
                          <time className="sz-ticket-time" dateTime={lastMessageAt(t)}>
                            {formatListTime(lastMessageAt(t))}
                          </time>
                        </span>
                        <span className="sz-ticket-meta">
                          <span className="sz-ticket-id">{t.id}</span>
                          <span>{t.handle || t.rufnummer || ''}</span>
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
          )}
        </aside>

        <div className="sz-chat-pane">
          {!active ? (
            <div className="sz-chat-placeholder">
              <p>Posteingang: Nachricht wählen und direkt antworten. Die Vorlage rechts sind Fragen zum Ausfüllen.</p>
            </div>
          ) : (
            <>
              <header className="sz-chat-head">
                <button type="button" className="sz-back" onClick={() => setMobileShowChat(false)}>
                  ← Liste
                </button>
                <span className={`sz-ticket-channel sz-ticket-channel--${normalizeSocialChannel(active.channel)}`}>
                  <ChannelIcon channel={active.channel} />
                </span>
                <div className="sz-chat-head-text">
                  <h2 className="sz-chat-title">{active.customerName || active.rufnummer || 'Nachricht'}</h2>
                  <p className="sz-chat-sub">
                    <span className="sz-ticket-id">{active.id}</span>
                    {' · '}
                    {channelLabel(active.channel)}
                    {active.handle ? ` · ${active.handle}` : ''}
                  </p>
                </div>
                <div className="sz-chat-status">
                  <StatusShopSelect
                    shop={active.shop}
                    shops={nachrichtShops}
                    onChange={(value) => handleStatusOrShop(active.id, value)}
                    ariaLabel={`Filiale für ${active.customerName || active.id}`}
                  />
                </div>
              </header>
              {!shopAssignsTicket(active.shop) ? (
                <p className="sz-filiale-hint">
                  Noch kein Ticket. Erst nach Wahl einer Filiale oder Call Center erscheint die Unterhaltung in Offen.
                </p>
              ) : null}

              <div className="sz-thread" ref={threadRef}>
                {(active.messages || []).map((m) => (
                  <div key={m.id} className={`sz-bubble sz-bubble--${m.from}`}>
                    <p className="sz-bubble-author">
                      {m.from === 'agent' ? m.authorName || 'Zentrale' : active.customerName}
                    </p>
                    <p className="sz-bubble-text">{m.text}</p>
                    <time className="sz-bubble-time" dateTime={m.at}>{formatChatTime(m.at)}</time>
                  </div>
                ))}
              </div>

              <div className="sz-composer">
                <div className="sz-quick-head">
                  <span className="sz-quick-head-label">Fragen</span>
                  <div className="sz-composer-langs" role="group" aria-label="Fragensprache">
                    {QUESTION_CHAT_LOCALES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`sz-lang-btn${chatLocale === item.id ? ' sz-lang-btn--active' : ''}`}
                        aria-pressed={chatLocale === item.id}
                        onClick={() => handleQuestionLocale(item.id)}
                      >
                        {item.short}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={`sz-quick${chatLocale === 'ar' ? ' sz-quick--rtl' : ''}`}>
                  {templateQuestions.map((q) => (
                    <button
                      key={q.field}
                      type="button"
                      className="sz-quick-btn"
                      onClick={() => setDraft(q.text)}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
                <div className="sz-composer-row">
                  <label className="visually-hidden" htmlFor="sz-reply">Antwort</label>
                  <textarea
                    id="sz-reply"
                    ref={composerRef}
                    className={`form-input sz-composer-input${chatLocale === 'ar' ? ' sz-composer-input--rtl' : ''}`}
                    rows={2}
                    value={draft}
                    onChange={(ev) => setDraft(ev.target.value)}
                    onKeyDown={handleComposerKey}
                    placeholder={`Antwort an ${active.customerName || 'den Kunden'}…`}
                    disabled={sending}
                    dir={chatLocale === 'ar' ? 'rtl' : 'ltr'}
                    lang={chatLocale === 'ar' ? 'ar' : chatLocale === 'en' ? 'en' : 'de'}
                  />
                  <button
                    type="button"
                    className="btn btn--primary sz-send"
                    onClick={sendReply}
                    disabled={sending || !draft.trim()}
                  >
                    {sending ? 'Senden…' : 'Senden'}
                  </button>
                </div>
                <p className="sz-composer-hint">
                  Sprache wählen, dann Fragen-Chip. Enter sendet, Umschalt+Enter neue Zeile.
                </p>
              </div>
            </>
          )}
        </div>

        {active && answers ? (
          <aside className="sz-questions" aria-label="Vorlage Fragen">
            <h3 className="sz-questions-title">Vorlage – Fragen</h3>
            <LeadFragenForm embedded answers={answers} onChange={patchAnswer} />
          </aside>
        ) : null}
      </div>
    </section>
  );
};

export default CallcenterNachrichten;
