import { useEffect, useMemo, useRef, useState } from 'react';
import {
  SOCIAL_CHANNELS,
  QUESTION_CHAT_LOCALES,
  formFromLead,
  appendLeadEditLog,
  leadFieldChange,
  lastMessageAt,
  loadInboxNotiz,
  customQuestions,
  loadQuestionConfig,
  localizedTemplateQuestions,
  saveQuestionConfig,
  visibleQuestionOrder,
  migrateLeadTicketStatus,
  normalizeSocialChannel,
  NACHRICHTEN_ERLEDIGT,
  QUESTION_FIELD_TYPES,
  questionDropdownOptions,
  questionChatLocale,
  saveInboxNotiz,
  shopAssignsTicket,
  shopOptionLabel,
  shopOptionsForNachrichten,
  normalizeNachrichtShop,
  sanitizeMitarbeiterName,
  collectMitarbeiterNames,
  withMitarbeiter,
  withFirstMessageAutoReply,
  spracheFromQuestionLocale,
  templateFieldMatchingDraft,
  isLeadArchived,
  leadPhoneNumber,
  looksLikePhoneNumber,
  telHrefFromPhone,
  whatsappHrefFromPhone
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

const MAX_MESSAGE_IMAGES = 6;

function messageImages(message) {
  if (Array.isArray(message?.images)) {
    return message.images.filter((img) => img && img.src);
  }
  if (message?.image) return [{ id: `${message.id}-img`, src: message.image }];
  return [];
}

function voiceSrc(item) {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return item.src || item.url || '';
}

function messageVoices(message) {
  if (Array.isArray(message?.voices)) {
    return message.voices
      .map((voice, index) => ({
        id: voice?.id || `${message.id}-voice-${index}`,
        src: voiceSrc(voice),
        duration: voice?.duration
      }))
      .filter((voice) => voice.src);
  }
  const direct = voiceSrc(message?.voice) || voiceSrc(message?.audioUrl) || voiceSrc(message?.audio);
  if (direct) {
    return [{ id: `${message.id}-voice`, src: direct, duration: message.duration || message?.voice?.duration }];
  }
  if (Array.isArray(message?.attachments)) {
    return message.attachments
      .filter((item) => {
        const kind = String(item?.type || item?.mimeType || '');
        return (kind === 'audio' || kind === 'voice' || kind.startsWith('audio/')) && voiceSrc(item);
      })
      .map((item, index) => ({
        id: item.id || `${message.id}-voice-${index}`,
        src: voiceSrc(item),
        duration: item.duration
      }));
  }
  return [];
}

function formatVoiceDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function blobToVoice(blob, duration) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Aufnahme konnte nicht gespeichert werden.'));
    reader.onload = () => resolve({
      id: `voice-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      src: String(reader.result || ''),
      duration
    });
    reader.readAsDataURL(blob);
  });
}

function VoicePlayer({ voice }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  if (!voice?.src) return null;

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => setPlaying(false));
      return;
    }
    el.pause();
  };

  return (
    <div className="sz-voice">
      <button
        type="button"
        className="sz-voice-play"
        onClick={togglePlay}
        aria-label={playing ? 'Pausieren' : 'Abspielen'}
        title={playing ? 'Pausieren' : 'Abspielen'}
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          {playing ? (
            <path fill="currentColor" d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
          ) : (
            <path fill="currentColor" d="M8 5v14l11-7L8 5z" />
          )}
        </svg>
      </button>
      <span className="sz-voice-wave" aria-hidden />
      {voice.duration ? (
        <span className="sz-voice-duration">{formatVoiceDuration(voice.duration)}</span>
      ) : null}
      <audio
        ref={audioRef}
        src={voice.src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
      />
    </div>
  );
}

function messagePreview(message) {
  const text = String(message?.text || '').trim();
  if (text) return text;
  if (messageVoices(message).length) return 'Sprachnachricht';
  const count = messageImages(message).length;
  if (count > 1) return `${count} Bilder`;
  if (count === 1) return 'Bild';
  return '—';
}

const TYPING_STORAGE_KEY = 'az-callcenter-typing';
const TYPING_MS = 2600;

function readTypingMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(TYPING_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function setTicketTyping(ticketId, side, active) {
  if (!ticketId) return;
  const map = readTypingMap();
  const cur = { ...(map[ticketId] || {}) };
  if (active) cur[side] = Date.now() + TYPING_MS;
  else delete cur[side];
  if (!cur.agent && !cur.customer) delete map[ticketId];
  else map[ticketId] = cur;
  try {
    localStorage.setItem(TYPING_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* Quota / privater Modus */
  }
}

function ticketTyping(ticketId, side) {
  const until = Number(readTypingMap()[ticketId]?.[side] || 0);
  return until > Date.now();
}

function TypingDots() {
  return (
    <span className="sz-typing-dots" aria-hidden>
      <span />
      <span />
      <span />
    </span>
  );
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !String(file.type || '').startsWith('image/')) {
      reject(new Error('Nur Bilder sind erlaubt.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'));
      img.onload = () => {
        const max = 1280;
        let width = img.width;
        let height = img.height;
        if (width > max || height > max) {
          const scale = max / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        resolve({
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          src: canvas.toDataURL('image/jpeg', 0.72)
        });
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
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
  if (id === 'whatsapp') {
    return (
      <svg className="sz-channel-icon" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M19.05 4.91A9.82 9.82 0 0012.04 2C6.55 2 2.08 6.46 2.08 11.94c0 1.76.46 3.48 1.34 5L2 22l5.2-1.36a9.9 9.9 0 004.84 1.23h.01c5.49 0 9.96-4.46 9.96-9.94a9.86 9.86 0 00-2.96-7.02zm-7 15.24h-.01a8.23 8.23 0 01-4.19-1.15l-.3-.18-3.08.81.82-3-.2-.31a8.2 8.2 0 01-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.42 5.83c0 4.55-3.7 8.24-8.24 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.4-.12-.56.12-.17.25-.64.8-.79.97-.14.17-.3.19-.55.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.3.37-.44.12-.15.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.09 0 1.24.9 2.43 1.03 2.6.12.17 1.78 2.72 4.3 3.81.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.17-.48-.29z"
        />
      </svg>
    );
  }
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

function ContactActionButtons({ phone, className = '' }) {
  const tel = telHrefFromPhone(phone);
  const wa = whatsappHrefFromPhone(phone);
  if (!tel && !wa) return null;
  return (
    <div className={`sz-contact-actions${className ? ` ${className}` : ''}`}>
      {tel ? (
        <a href={tel} className="sz-contact-btn sz-contact-btn--call">
          Anruf
        </a>
      ) : null}
      {wa ? (
        <a
          href={wa}
          className="sz-contact-btn sz-contact-btn--whatsapp"
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </a>
      ) : null}
    </div>
  );
}

function MitarbeiterNamesSelect({ names, ariaLabel }) {
  if (!names.length) return null;
  if (names.length === 1) {
    return <span className="sz-mitarbeiter">{names[0]}</span>;
  }
  return (
    <select
      className="form-input vorvertrag-ticket-row__status-select sz-mitarbeiter-select"
      defaultValue={names[0]}
      aria-label={ariaLabel || 'Mitarbeiter'}
      onClick={(ev) => ev.stopPropagation()}
    >
      {names.map((name) => (
        <option key={name} value={name}>{name}</option>
      ))}
    </select>
  );
}

function StatusShopSelect({ shop, ticketStatus, shops, onChange, ariaLabel }) {
  const value = migrateLeadTicketStatus(ticketStatus) === 'Erledigt'
    ? NACHRICHTEN_ERLEDIGT
    : normalizeNachrichtShop(shop);
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
        <option key={opt} value={opt}>
          {opt === NACHRICHTEN_ERLEDIGT ? opt : shopOptionLabel(opt)}
        </option>
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
  const [pendingImages, setPendingImages] = useState([]);
  const [pendingVoice, setPendingVoice] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [sending, setSending] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState('');
  const [questionConfig, setQuestionConfig] = useState(() => loadQuestionConfig());
  const [templateEditing, setTemplateEditing] = useState(false);
  const [chipEditing, setChipEditing] = useState(false);
  const [chipType, setChipType] = useState('text');
  const [typingTick, setTypingTick] = useState(0);
  const agentTypingTimer = useRef(null);
  const customerTypingTimer = useRef(null);
  const threadRef = useRef(null);
  const composerRef = useRef(null);
  const imageInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const recordSecsRef = useRef(0);
  const ignoreRecordRef = useRef(false);
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
          ...(t.messages || []).map((m) => (m.text || (messageVoices(m).length ? 'Sprachnachricht' : '')))
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => String(lastMessageAt(b)).localeCompare(String(lastMessageAt(a))));
  }, [list, channel, readTab, search, activeId]);

  const active = list.find((t) => t.id === activeId) || null;
  const agentTyping = Boolean(activeId && ticketTyping(activeId, 'agent'));
  const customerTyping = Boolean(activeId && ticketTyping(activeId, 'customer'));
  const answers = useMemo(() => {
    if (!active) return null;
    const base = formFromLead(active);
    customQuestions(questionConfig).forEach((item) => {
      base[item.id] = active[item.id] || '';
    });
    return base;
  }, [active, questionConfig]);
  const showNotiz = readTab === 'notiz';
  const chatLocale = questionChatLocale(active?.sprache);
  const templateQuestions = useMemo(
    () => localizedTemplateQuestions(chatLocale, questionConfig),
    [chatLocale, questionConfig]
  );
  const contactPhone = useMemo(() => {
    if (!active) return '';
    const fromForm = String(answers?.rufnummer || '').trim();
    if (looksLikePhoneNumber(fromForm)) return fromForm;
    return leadPhoneNumber(active);
  }, [active, answers?.rufnummer]);

  useEffect(() => {
    saveInboxNotiz(inboxNotiz);
  }, [inboxNotiz]);

  useEffect(() => {
    const timer = window.setInterval(() => setTypingTick((n) => n + 1), 400);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(agentTypingTimer.current);
      window.clearTimeout(customerTypingTimer.current);
      window.clearInterval(recordTimerRef.current);
      mediaRecorderRef.current?.stream?.getTracks?.().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    saveQuestionConfig(questionConfig);
  }, [questionConfig]);

  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [active?.id, active?.messages?.length, agentTyping, customerTyping]);

  const unreadByChannel = useMemo(() => {
    const counts = { all: 0, facebook: 0, whatsapp: 0, instagram: 0, tiktok: 0 };
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
    onTicketsChange?.((prev) => prev.map((t) => (t.id === id ? withFirstMessageAutoReply(updater(t)) : t)));
  };

  const noteAgentTyping = () => {
    if (!activeId) return;
    setTicketTyping(activeId, 'agent', true);
    window.clearTimeout(agentTypingTimer.current);
    agentTypingTimer.current = window.setTimeout(() => {
      setTicketTyping(activeId, 'agent', false);
      setTypingTick((n) => n + 1);
    }, TYPING_MS);
    setTypingTick((n) => n + 1);
  };

  const openTicket = (id) => {
    if (activeId) setTicketTyping(activeId, 'agent', false);
    window.clearTimeout(agentTypingTimer.current);
    window.clearTimeout(customerTypingTimer.current);
    setActiveId(id);
    setDraft('');
    setPendingImages([]);
    setPendingVoice(null);
    setRecording(false);
    setRecordSecs(0);
    window.clearInterval(recordTimerRef.current);
    ignoreRecordRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setMobileShowChat(true);
    patchTicket(id, (t) => withMitarbeiter({ ...t, unread: false }, agentName));
  };

  useEffect(() => {
    if (!openTicketId) return;
    openTicket(openTicketId);
    onOpened?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTicketId]);

  const handleStatusOrShop = (id, value) => {
    if (value === NACHRICHTEN_ERLEDIGT) {
      const markErledigt = (ticket) => {
        const editor = sanitizeMitarbeiterName(agentName);
        const next = withMitarbeiter({
          ...ticket,
          ticketStatus: 'Erledigt'
        }, editor);
        const change = leadFieldChange(ticket, 'ticketStatus', 'Erledigt');
        if (!change) return next;
        return appendLeadEditLog(next, {
          editorName: editor,
          action: 'status_changed',
          changes: [change]
        });
      };
      patchTicket(id, markErledigt);
      onStatusApplied?.(id, 'archiv');
      return;
    }

    const shop = normalizeNachrichtShop(value);
    if (!shop) return;
    const assignShop = (ticket) => {
      const editor = sanitizeMitarbeiterName(agentName);
      const next = withMitarbeiter({
        ...ticket,
        shop,
        ticketStatus: 'Offen'
      }, editor);
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
    onStatusApplied?.(id, 'offen');
  };

  const addQuestion = (type) => {
    const id = `cq-${Date.now().toString(36)}`;
    const label = 'Neue Frage?';
    setQuestionConfig((prev) => ({
      ...prev,
      custom: [...customQuestions(prev), { id, type, label }],
      labels: { ...prev.labels, [id]: { ...(prev.labels?.[id] || {}), [chatLocale]: label } },
      texts: { ...prev.texts, [id]: { ...(prev.texts?.[id] || {}), [chatLocale]: '' } },
      options: type === 'dropdown'
        ? { ...prev.options, [id]: ['Option 1', 'Option 2'] }
        : prev.options,
      order: [...visibleQuestionOrder(prev), id]
    }));
  };

  const updateQuestion = (field, { label, text, options }) => {
    setQuestionConfig((prev) => {
      const labels = {
        ...prev.labels,
        [field]: { ...(prev.labels[field] || {}), [chatLocale]: label }
      };
      let next = { ...prev, labels };
      if (text != null) {
        next = {
          ...next,
          texts: {
            ...prev.texts,
            [field]: { ...(prev.texts[field] || {}), [chatLocale]: text }
          }
        };
      }
      if (Array.isArray(options)) {
        next = { ...next, options: { ...prev.options, [field]: options } };
      }
      if (customQuestions(prev).some((item) => item.id === field)) {
        next = {
          ...next,
          custom: customQuestions(prev).map((item) => (
            item.id === field ? { ...item, label } : item
          ))
        };
      }
      return next;
    });
  };

  const deleteQuestion = (field, label) => {
    const name = label || 'Diese Frage';
    if (!window.confirm(`${name} wirklich löschen?`)) return;
    setQuestionConfig((prev) => ({
      ...prev,
      hidden: prev.hidden.includes(field) ? prev.hidden : [...prev.hidden, field]
    }));
  };

  const patchAnswer = (field, value) => {
    if (!active) return;
    patchTicket(active.id, (t) => {
      const change = leadFieldChange(t, field, value);
      const next = withMitarbeiter({ ...t, [field]: value }, agentName);
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
    const field = templateFieldMatchingDraft(draft, questionConfig);
    if (!field) return;
    const next = localizedTemplateQuestions(locale, questionConfig).find((q) => q.field === field);
    if (next?.text) setDraft(next.text);
  };

  const addImageFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((file) => String(file.type || '').startsWith('image/'));
    if (!files.length) {
      window.alert('Bitte nur Bilder auswählen.');
      return [];
    }
    const room = MAX_MESSAGE_IMAGES - pendingImages.length;
    if (room <= 0) {
      window.alert(`Höchstens ${MAX_MESSAGE_IMAGES} Bilder pro Nachricht.`);
      return [];
    }
    const picked = files.slice(0, room);
    if (files.length > room) {
      window.alert(`Höchstens ${MAX_MESSAGE_IMAGES} Bilder pro Nachricht.`);
    }
    try {
      return await Promise.all(picked.map(readImageFile));
    } catch (err) {
      window.alert(err?.message || 'Bild konnte nicht gelesen werden.');
      return [];
    }
  };

  const handleOwnImages = async (ev) => {
    const images = await addImageFiles(ev.target.files);
    ev.target.value = '';
    if (!images.length) return;
    setPendingImages((prev) => [...prev, ...images].slice(0, MAX_MESSAGE_IMAGES));
    noteAgentTyping();
  };

  const handleComposerPaste = async (ev) => {
    const files = Array.from(ev.clipboardData?.files || []).filter((file) =>
      String(file.type || '').startsWith('image/')
    );
    if (!files.length) return;
    ev.preventDefault();
    const images = await addImageFiles(files);
    if (!images.length) return;
    setPendingImages((prev) => [...prev, ...images].slice(0, MAX_MESSAGE_IMAGES));
    noteAgentTyping();
  };

  const stopRecording = () => {
    window.clearInterval(recordTimerRef.current);
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    setRecording(false);
  };

  const toggleRecording = async () => {
    if (sending) return;
    if (recording) {
      stopRecording();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      window.alert('Sprachnachrichten werden in diesem Browser nicht unterstützt.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(
        (type) => MediaRecorder.isTypeSupported(type)
      );
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recordChunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size) recordChunksRef.current.push(ev.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(recordChunksRef.current, { type: rec.mimeType || 'audio/webm' });
        recordChunksRef.current = [];
        mediaRecorderRef.current = null;
        if (ignoreRecordRef.current) {
          ignoreRecordRef.current = false;
          setRecording(false);
          return;
        }
        if (blob.size < 800) {
          setRecording(false);
          return;
        }
        try {
          const voice = await blobToVoice(blob, recordSecsRef.current);
          setPendingVoice(voice);
          noteAgentTyping();
        } catch (err) {
          window.alert(err?.message || 'Aufnahme konnte nicht gespeichert werden.');
        }
      };
      mediaRecorderRef.current = rec;
      ignoreRecordRef.current = false;
      setPendingVoice(null);
      setRecordSecs(0);
      recordSecsRef.current = 0;
      setRecording(true);
      rec.start();
      recordTimerRef.current = window.setInterval(() => {
        setRecordSecs((secs) => {
          const next = secs + 1;
          recordSecsRef.current = next;
          return next;
        });
      }, 1000);
      noteAgentTyping();
    } catch {
      window.alert('Mikrofonzugriff wurde abgelehnt oder ist nicht verfügbar.');
    }
  };

  const sendText = (text) => {
    if (!active || sending) return;
    const body = String(text || '').trim();
    const images = pendingImages.map(({ id, src }) => ({ id, src }));
    const voices = pendingVoice ? [{ id: pendingVoice.id, src: pendingVoice.src, duration: pendingVoice.duration }] : [];
    if (!body && !images.length && !voices.length) return;
    setSending(true);
    const message = {
      id: `local-${Date.now()}`,
      from: 'agent',
      authorName: agentName || 'Zentrale',
      text: body,
      images,
      voices,
      at: new Date().toISOString()
    };
    window.setTimeout(() => {
      patchTicket(active.id, (t) => withMitarbeiter({
        ...t,
        unread: false,
        messages: [...(t.messages || []), message]
      }, agentName));
      setDraft('');
      setPendingImages([]);
      setPendingVoice(null);
      setSending(false);
      setTicketTyping(active.id, 'agent', false);
      window.clearTimeout(agentTypingTimer.current);
      window.clearTimeout(customerTypingTimer.current);
      customerTypingTimer.current = window.setTimeout(() => {
        setTicketTyping(active.id, 'customer', true);
        setTypingTick((n) => n + 1);
        customerTypingTimer.current = window.setTimeout(() => {
          setTicketTyping(active.id, 'customer', false);
          setTypingTick((n) => n + 1);
        }, TYPING_MS);
      }, 900);
      composerRef.current?.focus();
    }, 220);
  };

  const sendReply = () => sendText(draft);

  const deleteMessage = (ticketId, message) => {
    if (!ticketId || !message?.id || message.from !== 'agent') return;
    if (!window.confirm('Diese Nachricht wirklich löschen?')) return;
    patchTicket(ticketId, (t) => ({
      ...t,
      messages: (t.messages || []).filter((m) => m.id !== message.id)
    }));
  };

  const deleteCustomerFromInbox = (ticket) => {
    if (!ticket?.id) return;
    const name = ticket.customerName || ticket.rufnummer || 'Diesen Kunden';
    const alsoListed = shopAssignsTicket(ticket.shop) || isLeadArchived(ticket);
    const extra = alsoListed ? ' Er verschwindet damit auch aus Offen bzw. Archiv.' : '';
    if (!window.confirm(`${name} wirklich komplett aus dem Postfach löschen?${extra}`)) return;
    onTicketsChange?.((prev) => (prev || []).filter((t) => t.id !== ticket.id));
    if (activeId === ticket.id) {
      setActiveId(null);
      setDraft('');
      setPendingImages([]);
      setPendingVoice(null);
      setMobileShowChat(false);
    }
  };

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
                        </span>
                        <span className="sz-ticket-preview">
                          {ticketTyping(t.id, 'customer')
                            ? 'schreibt…'
                            : ticketTyping(t.id, 'agent')
                              ? 'Sie schreiben…'
                              : messagePreview(last)}
                        </span>
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
                  </p>
                </div>
                <ContactActionButtons phone={contactPhone} />
                <MitarbeiterNamesSelect
                  names={collectMitarbeiterNames(active)}
                  ariaLabel={`Mitarbeiter für ${active.customerName || active.id}`}
                />
                <button
                  type="button"
                  className="sz-delete-customer"
                  onClick={() => deleteCustomerFromInbox(active)}
                  aria-label="Aus Postfach löschen"
                  title="Aus Postfach löschen"
                >
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <path
                      fill="currentColor"
                      d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                    />
                  </svg>
                </button>
                <div className="sz-chat-status">
                  <StatusShopSelect
                    shop={active.shop}
                    ticketStatus={active.ticketStatus}
                    shops={nachrichtShops}
                    onChange={(value) => handleStatusOrShop(active.id, value)}
                    ariaLabel={`Filiale für ${active.customerName || active.id}`}
                  />
                </div>
              </header>
              {!shopAssignsTicket(active.shop) && !isLeadArchived(active) ? (
                <p className="sz-filiale-hint">
                  Noch kein Ticket. Wählen Sie Filiale, Call Center oder Erledigt — Erledigt landet direkt im Archiv.
                </p>
              ) : null}

              <div className="sz-thread" ref={threadRef}>
                {(active.messages || []).map((m) => (
                  <div key={m.id} className={`sz-bubble sz-bubble--${m.from}`}>
                    {m.auto === 'welcome' ? null : (
                      <p className="sz-bubble-author">
                        {m.from === 'agent' ? m.authorName || 'Zentrale' : active.customerName}
                      </p>
                    )}
                    {messageImages(m).length ? (
                      <div className="sz-bubble-images">
                        {messageImages(m).map((img) => (
                          <button
                            key={img.id}
                            type="button"
                            className="sz-bubble-image"
                            onClick={() => setLightboxSrc(img.src)}
                          >
                            <img src={img.src} alt="" />
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {messageVoices(m).length ? (
                      <div className="sz-bubble-voices">
                        {messageVoices(m).map((voice) => (
                          <VoicePlayer key={voice.id} voice={voice} />
                        ))}
                      </div>
                    ) : null}
                    {m.text ? (
                      <p
                        className={`sz-bubble-text${m.locale === 'ar' ? ' sz-bubble-text--rtl' : ''}`}
                        dir={m.locale === 'ar' ? 'rtl' : undefined}
                        lang={m.locale === 'ar' ? 'ar' : undefined}
                      >
                        {m.text}
                      </p>
                    ) : null}
                    <div className="sz-bubble-meta">
                      <time className="sz-bubble-time" dateTime={m.at}>{formatChatTime(m.at)}</time>
                      {m.from === 'agent' && m.auto !== 'welcome' ? (
                        <button
                          type="button"
                          className="sz-bubble-delete"
                          onClick={() => deleteMessage(active.id, m)}
                          aria-label="Eigene Nachricht löschen"
                        >
                          Löschen
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
                {customerTyping ? (
                  <div className="sz-bubble sz-bubble--customer sz-bubble--typing">
                    <p className="sz-bubble-author">{active.customerName || 'Kunde'}</p>
                    <p className="sz-typing-line">
                      <TypingDots />
                      <span>schreibt gerade…</span>
                    </p>
                  </div>
                ) : null}
                {agentTyping ? (
                  <div className="sz-bubble sz-bubble--agent sz-bubble--typing">
                    <p className="sz-bubble-author">{agentName || 'Zentrale'}</p>
                    <p className="sz-typing-line">
                      <TypingDots />
                      <span>Kunde sieht: schreibt gerade</span>
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="sz-composer">
                <div className="sz-quick-head">
                  <span className="sz-quick-head-label">
                    Fragen
                    <button
                      type="button"
                      className={`sz-question-icon${chipEditing ? ' sz-question-icon--active' : ''}`}
                      onClick={() => setChipEditing((open) => !open)}
                      aria-pressed={chipEditing}
                      aria-label={chipEditing ? 'Fragen speichern' : 'Fragen bearbeiten'}
                      title={chipEditing ? 'Speichern' : 'Bearbeiten'}
                    >
                      {chipEditing ? (
                        <svg viewBox="0 0 24 24" aria-hidden>
                          <path fill="currentColor" d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" aria-hidden>
                          <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                        </svg>
                      )}
                    </button>
                  </span>
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
                {chipEditing ? (
                  <div className="sz-chip-edit-list">
                    {templateQuestions.map((q) => {
                      const options = questionDropdownOptions(q.field, questionConfig);
                      return (
                        <div key={q.field} className="sz-chip-edit">
                          <div className="sz-chip-edit__bar">
                            <input
                              className="form-input"
                              value={q.label}
                              aria-label="Frage"
                              onChange={(ev) => updateQuestion(q.field, {
                                label: ev.target.value,
                                text: q.text,
                                options: options || undefined
                              })}
                            />
                            <button
                              type="button"
                              className="sz-quick-remove sz-quick-remove--alone"
                              onClick={() => deleteQuestion(q.field, q.label)}
                              aria-label={`${q.label} löschen`}
                              title="Löschen"
                            >
                              ×
                            </button>
                          </div>
                          <label className="sz-template-options-label">
                            Fragentext
                            <input
                              className="form-input"
                              value={q.text}
                              onChange={(ev) => updateQuestion(q.field, {
                                label: q.label,
                                text: ev.target.value,
                                options: options || undefined
                              })}
                            />
                          </label>
                          {options ? (
                            <label className="sz-template-options-label">
                              Dropdown-Werte
                              <textarea
                                className="form-input sz-template-options"
                                rows={Math.min(5, Math.max(2, options.length))}
                                defaultValue={options.join('\n')}
                                key={options.join('\n')}
                                onBlur={(ev) => {
                                  const next = ev.target.value.split('\n').map((line) => line.trim()).filter(Boolean);
                                  updateQuestion(q.field, {
                                    label: q.label,
                                    text: q.text,
                                    options: next.length ? next : options
                                  });
                                }}
                              />
                            </label>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                <div className={`sz-quick${chatLocale === 'ar' ? ' sz-quick--rtl' : ''}`}>
                  {templateQuestions.map((q) => (
                    <button
                      key={q.field}
                      type="button"
                      className="sz-quick-btn"
                      onClick={() => {
                        setDraft(q.text);
                        noteAgentTyping();
                      }}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
                )}
                {chipEditing ? (
                  <div className="sz-template-add sz-quick-add">
                    <label className="sz-template-options-label">
                      Feldtyp
                      <select
                        className="form-input"
                        value={chipType}
                        onChange={(ev) => setChipType(ev.target.value)}
                        aria-label="Feldtyp"
                      >
                        {QUESTION_FIELD_TYPES.map((item) => (
                          <option key={item.id} value={item.id}>{item.label}</option>
                        ))}
                      </select>
                    </label>
                    <button type="button" className="btn btn--secondary btn--small" onClick={() => addQuestion(chipType)}>
                      Frage hinzufügen
                    </button>
                  </div>
                ) : null}
                {pendingImages.length ? (
                  <div className="sz-pending-images">
                    {pendingImages.map((img) => (
                      <div key={img.id} className="sz-pending-image">
                        <img src={img.src} alt="" />
                        <button
                          type="button"
                          className="sz-pending-remove"
                          onClick={() => setPendingImages((prev) => prev.filter((item) => item.id !== img.id))}
                          aria-label="Bild entfernen"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                {pendingVoice ? (
                  <div className="sz-pending-voice">
                    <VoicePlayer voice={pendingVoice} />
                    <button
                      type="button"
                      className="sz-pending-remove"
                      onClick={() => setPendingVoice(null)}
                      aria-label="Sprachnachricht entfernen"
                    >
                      ×
                    </button>
                  </div>
                ) : null}
                {recording ? (
                  <p className="sz-recording">Aufnahme… {formatVoiceDuration(recordSecs)}</p>
                ) : null}
                <div className={`sz-composer-field${chatLocale === 'ar' ? ' sz-composer-field--rtl' : ''}`}>
                  <label className="visually-hidden" htmlFor="sz-reply">Antwort</label>
                  <textarea
                    id="sz-reply"
                    ref={composerRef}
                    className={`form-input sz-composer-input${chatLocale === 'ar' ? ' sz-composer-input--rtl' : ''}`}
                    rows={5}
                    value={draft}
                    onChange={(ev) => {
                      setDraft(ev.target.value);
                      noteAgentTyping();
                    }}
                    onKeyDown={handleComposerKey}
                    onPaste={handleComposerPaste}
                    placeholder={`Antwort an ${active.customerName || 'den Kunden'}…`}
                    disabled={sending}
                    dir={chatLocale === 'ar' ? 'rtl' : 'ltr'}
                    lang={chatLocale === 'ar' ? 'ar' : chatLocale === 'en' ? 'en' : 'de'}
                  />
                  <div className="sz-composer-actions">
                    <button
                      type="button"
                      className="sz-attach-btn"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={sending || recording}
                      aria-label="Bild senden"
                      title="Bild senden"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden>
                        <path
                          fill="currentColor"
                          d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={`sz-attach-btn${recording ? ' sz-attach-btn--recording' : ''}`}
                      onClick={toggleRecording}
                      disabled={sending}
                      aria-label={recording ? 'Aufnahme stoppen' : 'Sprachnachricht senden'}
                      title={recording ? 'Aufnahme stoppen' : 'Sprachnachricht senden'}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden>
                        <path
                          fill="currentColor"
                          d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2zm-5 8a1 1 0 001-1h2a3 3 0 01-3 3 3 3 0 01-3-3h2a1 1 0 001 1z"
                        />
                      </svg>
                    </button>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={handleOwnImages}
                    />
                    <button
                      type="button"
                      className="sz-send"
                      onClick={sendReply}
                      disabled={sending || recording || (!draft.trim() && pendingImages.length === 0 && !pendingVoice)}
                      aria-label="Senden"
                      title="Senden"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden>
                        <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="sz-composer-hint">
                  Mikrofon sendet Voice an den Kunden. Enter sendet, Umschalt+Enter neue Zeile.
                </p>
              </div>
            </>
          )}
        </div>

        {active && answers ? (
          <aside className="sz-questions" aria-label="Vorlage Fragen">
            <div className="sz-questions-titlebar">
              <h3 className="sz-questions-title">Vorlage – Fragen</h3>
              <button
                type="button"
                className={`sz-question-icon${templateEditing ? ' sz-question-icon--active' : ''}`}
                onClick={() => setTemplateEditing((open) => !open)}
                aria-pressed={templateEditing}
                aria-label={templateEditing ? 'Vorlage speichern' : 'Vorlage bearbeiten'}
                title={templateEditing ? 'Speichern' : 'Bearbeiten'}
              >
                {templateEditing ? (
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <path fill="currentColor" d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                  </svg>
                )}
              </button>
            </div>
            <LeadFragenForm
              embedded
              answers={answers}
              onChange={patchAnswer}
              questionConfig={questionConfig}
              questionLocale={chatLocale}
              templateEditing={templateEditing}
              onQuestionDelete={deleteQuestion}
              onQuestionAdd={addQuestion}
              onQuestionMove={(field, direction) => {
                setQuestionConfig((prev) => {
                  const order = visibleQuestionOrder(prev);
                  const index = order.indexOf(field);
                  const nextIndex = index + direction;
                  if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return prev;
                  const next = [...order];
                  const [item] = next.splice(index, 1);
                  next.splice(nextIndex, 0, item);
                  const hidden = (prev.hidden || []).filter((id) => !next.includes(id));
                  return { ...prev, order: [...next, ...hidden] };
                });
              }}
              onQuestionUpdate={updateQuestion}
            />
          </aside>
        ) : null}
      </div>
      {lightboxSrc ? (
        <button
          type="button"
          className="sz-lightbox"
          onClick={() => setLightboxSrc('')}
          aria-label="Bild schließen"
        >
          <img src={lightboxSrc} alt="" />
        </button>
      ) : null}
    </section>
  );
};

export default CallcenterNachrichten;
