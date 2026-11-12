import { useEffect, useState } from 'react';
import { getAutoQuestionFlowApi, saveAutoQuestionFlowApi } from '../../services/whatsapp.service';
import { AUTO_QUESTION_TICKET_FIELDS, loadQuestionConfig } from './callcenterLeadData';
import {
  applyProduktOptions,
  isProduktQuestion,
  produktOptionKey,
  ticketProduktNames
} from './produktFrageSync';

const LOCALES = [
  { id: 'de', short: 'DE' },
  { id: 'ar', short: 'AR' },
  { id: 'en', short: 'ENG' }
];

function emptyTitle(value = '') {
  return { de: value, ar: '', en: '' };
}

function blankOption(value = '') {
  return {
    value,
    replyId: '',
    prompt: false,
    title: emptyTitle(value),
    next: []
  };
}

function withStart(questions, flow) {
  return { ...flow, questions, startId: questions[0]?.id || '' };
}

function newQuestion() {
  return {
    id: `q${Date.now().toString(36)}`,
    label: 'Neue Frage?',
    kind: 'choice',
    saveAs: '',
    text: { de: '', ar: '', en: '' },
    options: [blankOption('Ja'), blankOption('Nein')],
    next: []
  };
}

function NextSelect({ value, questions, selfId, onChange }) {
  const choices = questions.filter((q) => q.id !== selfId);
  return (
    <select
      className="form-input"
      aria-label="Danach"
      value={value || ''}
      onChange={(ev) => onChange(ev.target.value ? [ev.target.value] : [])}
    >
      <option value="">Danach</option>
      {value && !choices.some((q) => q.id === value) ? (
        <option value={value}>{value}</option>
      ) : null}
      {choices.map((q) => (
        <option key={q.id} value={q.id}>{q.label || q.id}</option>
      ))}
    </select>
  );
}

export default function AutoAbfrage() {
  const [flow, setFlow] = useState(null);
  const [locale, setLocale] = useState('de');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [openId, setOpenId] = useState('');

  useEffect(() => {
    let on = true;
    getAutoQuestionFlowApi()
      .then((res) => {
        if (!on || !res?.flow) return;
        const names = ticketProduktNames(loadQuestionConfig());
        const synced = applyProduktOptions(res.flow, names);
        if (produktOptionKey(res.flow) !== produktOptionKey(synced)) {
          saveAutoQuestionFlowApi(synced).catch(() => {});
        }
        const questions = synced.questions || [];
        const startAt = questions.findIndex((q) => q.id === synced.startId);
        const ordered = startAt > 0
          ? [questions[startAt], ...questions.filter((_, index) => index !== startAt)]
          : questions;
        setFlow(withStart(ordered, synced));
        setOpenId(ordered[0]?.id || '');
      })
      .catch((err) => {
        if (on) setError(err?.response?.data?.message || 'Ablauf konnte nicht geladen werden.');
      })
      .finally(() => {
        if (on) setLoading(false);
      });
    return () => {
      on = false;
    };
  }, []);

  const updateQuestion = (id, patch) => {
    setSaved(false);
    setFlow((prev) => ({
      ...prev,
      questions: (prev?.questions || []).map((q) => (q.id === id ? { ...q, ...patch } : q))
    }));
  };

  const updateOption = (questionId, index, patch) => {
    setSaved(false);
    setFlow((prev) => ({
      ...prev,
      questions: (prev?.questions || []).map((q) => {
        if (q.id !== questionId) return q;
        const options = q.options.map((opt, i) => (i === index ? { ...opt, ...patch } : opt));
        return { ...q, options };
      })
    }));
  };

  const save = async () => {
    if (!flow) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const payload = applyProduktOptions(
        withStart(flow.questions || [], flow),
        ticketProduktNames(loadQuestionConfig())
      );
      const res = await saveAutoQuestionFlowApi(payload);
      setFlow(res?.flow || flow);
      setSaved(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="vorvertrag-empty">Laden…</p>;
  if (!flow) return <p className="vorvertrag-error" role="alert">{error || 'Ablauf konnte nicht geladen werden.'}</p>;

  const questions = flow.questions || [];

  return (
    <section className="auto-flow" aria-label="Automatisierte Abfrage">
      <div className="auto-flow-settings">
        <div className="auto-flow-settings__top">
          <span className="auto-flow-langs" role="group" aria-label="Sprache">
            {LOCALES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`auto-flow-lang${locale === item.id ? ' auto-flow-lang--active' : ''}`}
                aria-pressed={locale === item.id}
                onClick={() => setLocale(item.id)}
              >
                {item.short}
              </button>
            ))}
          </span>
        </div>
        <div className="auto-flow-settings__grid">
          <article className="auto-flow-setting">
            <h3 className="auto-flow-setting__title">Wartezeit</h3>
            <p className="auto-flow-setting__hint">Pause zwischen den Fragen</p>
            <label className="auto-flow-setting__row">
              <input
                className="form-input"
                type="number"
                min={5}
                max={600}
                value={flow.waitSeconds}
                aria-label="Wartezeit in Sekunden"
                onChange={(ev) => {
                  setSaved(false);
                  setFlow((prev) => ({ ...prev, waitSeconds: ev.target.value }));
                }}
              />
              Sekunden
            </label>
          </article>
          <article className="auto-flow-setting">
            <h3 className="auto-flow-setting__title">Erinnerung</h3>
            <p className="auto-flow-setting__hint">Wenn der Kunde nicht antwortet. Leer = aus. Maximal 23 Stunden.</p>
            <label className="auto-flow-setting__row">
              <input
                className="form-input"
                type="number"
                min={1}
                max={23}
                value={flow.followupWaitHours ?? 23}
                aria-label="Erinnerung in Stunden"
                onChange={(ev) => {
                  setSaved(false);
                  setFlow((prev) => ({ ...prev, followupWaitHours: ev.target.value }));
                }}
              />
              Stunden
            </label>
            <textarea
              className="form-input auto-flow-setting__text"
              value={flow.followupText?.[locale] || ''}
              placeholder="Erinnerungstext"
              aria-label="Erinnerungstext"
              rows={3}
              dir={locale === 'ar' ? 'rtl' : undefined}
              onChange={(ev) => {
                setSaved(false);
                setFlow((prev) => ({
                  ...prev,
                  followupText: { ...(prev.followupText || {}), [locale]: ev.target.value }
                }));
              }}
            />
          </article>
        </div>
      </div>

      <div className="auto-flow-list">
      {questions.map((question, index) => {
        const open = question.id === (questions.some((q) => q.id === openId) ? openId : questions[0]?.id);
        const linked = isProduktQuestion(question);
        return (
        <article key={question.id} className={`auto-flow-card${open ? ' auto-flow-card--open' : ''}`}>
          <button
            type="button"
            className="auto-flow-card__toggle"
            aria-expanded={open}
            onClick={() => setOpenId(question.id)}
          >
            <span>{question.label || 'Frage'}</span>
            <span aria-hidden="true">{open ? '▾' : '▸'}</span>
          </button>
          {open ? (
          <>
          <div className="auto-flow-card__head">
            <div className="auto-flow-order">
              <button
                type="button"
                className="btn btn--secondary btn--small"
                aria-label="Frage nach oben"
                disabled={index === 0}
                onClick={() => {
                  setSaved(false);
                  setFlow((prev) => {
                    const list = prev.questions.slice();
                    const [item] = list.splice(index, 1);
                    list.splice(index - 1, 0, item);
                    return withStart(list, prev);
                  });
                }}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn btn--secondary btn--small"
                aria-label="Frage nach unten"
                disabled={index === questions.length - 1}
                onClick={() => {
                  setSaved(false);
                  setFlow((prev) => {
                    const list = prev.questions.slice();
                    const [item] = list.splice(index, 1);
                    list.splice(index + 1, 0, item);
                    return withStart(list, prev);
                  });
                }}
              >
                ↓
              </button>
            </div>
            <input
              className="form-input"
              value={question.label}
              aria-label="Fragenname"
              onChange={(ev) => updateQuestion(question.id, { label: ev.target.value })}
            />
            <select
              className="form-input"
              value={question.kind}
              aria-label="Art"
              disabled={linked}
              onChange={(ev) => updateQuestion(question.id, {
                kind: ev.target.value,
                options: ev.target.value === 'choice' && !question.options.length
                  ? [blankOption('Ja'), blankOption('Nein')]
                  : question.options
              })}
            >
              <option value="choice">Dropdown</option>
              <option value="text">Freitext</option>
            </select>
            <select
              className="form-input"
              value={question.saveAs || ''}
              aria-label="Ticketfeld"
              title="Antwort ins Ticket schreiben"
              disabled={linked}
              onChange={(ev) => updateQuestion(question.id, { saveAs: ev.target.value })}
            >
              {AUTO_QUESTION_TICKET_FIELDS.map((item) => (
                <option key={item.id || 'none'} value={item.id}>{item.label}</option>
              ))}
            </select>
            {linked ? null : (
            <button
              type="button"
              className="btn btn--secondary btn--small"
              onClick={() => {
                setSaved(false);
                const fallback = questions[index + 1]?.id || questions[index - 1]?.id || '';
                setOpenId((current) => (current === question.id ? fallback : current));
                setFlow((prev) => {
                  const nextQuestions = prev.questions.filter((q) => q.id !== question.id);
                  return withStart(nextQuestions.map((q) => ({
                      ...q,
                      next: (q.next || []).filter((id) => id !== question.id),
                      options: (q.options || []).map((opt) => ({
                        ...opt,
                        next: (opt.next || []).filter((id) => id !== question.id)
                      }))
                    })), prev);
                });
              }}
            >
              Löschen
            </button>
            )}
          </div>

          <input
            className="form-input"
            value={question.text?.[locale] || ''}
            placeholder="Fragetext"
            aria-label="Fragetext"
            dir={locale === 'ar' ? 'rtl' : undefined}
            onChange={(ev) => updateQuestion(question.id, {
              text: { ...question.text, [locale]: ev.target.value }
            })}
          />

          {question.kind === 'text' ? (
            <NextSelect
              value={(question.next || [])[0] || ''}
              questions={questions}
              selfId={question.id}
              onChange={(next) => updateQuestion(question.id, { next })}
            />
          ) : (
            <div className="auto-flow-options">
              {(question.options || []).map((opt, index) => (
                <div key={`${question.id}-${index}`} className="auto-flow-option">
                  <input
                    className="form-input"
                    value={linked ? (opt.value || opt.title?.[locale] || '') : (opt.title?.[locale] || '')}
                    placeholder="Antwort"
                    aria-label="Antwort"
                    readOnly={linked}
                    title={linked ? 'Kommt aus Ticket erstellen' : undefined}
                    dir={locale === 'ar' ? 'rtl' : undefined}
                    onChange={(ev) => {
                      const title = { ...opt.title, [locale]: ev.target.value };
                      const patch = { title };
                      if (locale === 'de' && !opt.prompt && (!opt.value || opt.value === (opt.title?.de || ''))) {
                        patch.value = ev.target.value;
                      }
                      updateOption(question.id, index, patch);
                    }}
                  />
                  <NextSelect
                    value={(opt.next || [])[0] || ''}
                    questions={questions}
                    selfId={question.id}
                    onChange={(next) => updateOption(question.id, index, { next })}
                  />
                  {linked ? null : (
                  <button
                    type="button"
                    className="btn btn--secondary btn--small"
                    onClick={() => updateQuestion(question.id, {
                      options: question.options.filter((_, i) => i !== index)
                    })}
                    aria-label="Wert löschen"
                  >
                    ×
                  </button>
                  )}
                </div>
              ))}
              {!linked && (question.options || []).length < 10 ? (
                <button
                  type="button"
                  className="btn btn--secondary btn--small"
                  onClick={() => updateQuestion(question.id, { options: [...question.options, blankOption()] })}
                >
                  Wert hinzufügen
                </button>
              ) : null}
            </div>
          )}
          </>
          ) : null}
        </article>
        );
      })}
      </div>

      <div className="auto-flow__actions">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => {
            const created = newQuestion();
            setSaved(false);
            setOpenId(created.id);
            setFlow((prev) => withStart([...prev.questions, created], prev));
          }}
        >
          Frage hinzufügen
        </button>
        <button type="button" className="btn btn--primary" onClick={save} disabled={saving}>
          {saving ? 'Speichern…' : 'Speichern'}
        </button>
        {saved ? <span role="status">Gespeichert.</span> : null}
      </div>
      {error ? <p className="vorvertrag-error" role="alert">{error}</p> : null}
    </section>
  );
}
