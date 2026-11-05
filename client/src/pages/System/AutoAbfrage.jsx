import { useEffect, useState } from 'react';
import { getAutoQuestionFlowApi, saveAutoQuestionFlowApi } from '../../services/whatsapp.service';

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

function moveItem(list, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

function NextList({ ids, questions, selfId, onChange }) {
  const labelFor = (id) => questions.find((q) => q.id === id)?.label || id;
  const available = questions.filter((q) => q.id !== selfId && !ids.includes(q.id));
  return (
    <div className="auto-flow-next">
      {ids.map((id, index) => (
        <div key={`${id}-${index}`} className="auto-flow-next__row">
          <span>{labelFor(id)}</span>
          <button type="button" className="btn btn--secondary btn--small" onClick={() => onChange(moveItem(ids, index, -1))} aria-label="Nach oben">↑</button>
          <button type="button" className="btn btn--secondary btn--small" onClick={() => onChange(moveItem(ids, index, 1))} aria-label="Nach unten">↓</button>
          <button type="button" className="btn btn--secondary btn--small" onClick={() => onChange(ids.filter((_, i) => i !== index))}>Entfernen</button>
        </div>
      ))}
      {available.length ? (
        <select
          className="form-input"
          value=""
          aria-label="Frage danach"
          onChange={(ev) => {
            if (!ev.target.value) return;
            onChange([...ids, ev.target.value]);
          }}
        >
          <option value="">Frage danach…</option>
          {available.map((q) => (
            <option key={q.id} value={q.id}>{q.label || q.id}</option>
          ))}
        </select>
      ) : null}
    </div>
  );
}

export default function AutoAbfrage() {
  const [flow, setFlow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let on = true;
    getAutoQuestionFlowApi()
      .then((res) => {
        if (on) setFlow(res?.flow || null);
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
      const res = await saveAutoQuestionFlowApi(flow);
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
      <p className="auto-flow__hint">
        Nach der Begrüßung wartet WhatsApp und stellt dann die erste Frage. Bei einem Dropdown legt jeder Wert fest, welche Fragen danach kommen. Bis zu 3 Werte werden Buttons (max. 20 Zeichen), ab 4 eine Liste (max. 24 Zeichen, höchstens 10).
      </p>

      <label className="auto-flow__wait">
        Wartezeit bis zur nächsten Frage
        <span>
          <input
            className="form-input"
            type="number"
            min={5}
            max={600}
            value={flow.waitSeconds}
            onChange={(ev) => {
              setSaved(false);
              setFlow((prev) => ({ ...prev, waitSeconds: ev.target.value }));
            }}
          />
          Sekunden
        </span>
      </label>

      <label className="auto-flow__wait">
        Erste Frage
        <select
          className="form-input"
          value={flow.startId || ''}
          onChange={(ev) => {
            setSaved(false);
            setFlow((prev) => ({ ...prev, startId: ev.target.value }));
          }}
        >
          {questions.map((q) => (
            <option key={q.id} value={q.id}>{q.label || q.id}</option>
          ))}
        </select>
      </label>

      {questions.map((question) => (
        <article key={question.id} className="auto-flow-card">
          <div className="auto-flow-card__head">
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
            <button
              type="button"
              className="btn btn--secondary btn--small"
              onClick={() => {
                setSaved(false);
                setFlow((prev) => {
                  const nextQuestions = prev.questions.filter((q) => q.id !== question.id);
                  return {
                    ...prev,
                    startId: prev.startId === question.id ? (nextQuestions[0]?.id || '') : prev.startId,
                    questions: nextQuestions.map((q) => ({
                      ...q,
                      next: (q.next || []).filter((id) => id !== question.id),
                      options: (q.options || []).map((opt) => ({
                        ...opt,
                        next: (opt.next || []).filter((id) => id !== question.id)
                      }))
                    }))
                  };
                });
              }}
            >
              Löschen
            </button>
          </div>

          {['de', 'ar', 'en'].map((locale) => (
            <label key={locale} className="auto-flow__text">
              {locale === 'de' ? 'Deutsch' : locale === 'ar' ? 'Arabisch' : 'Englisch'}
              <input
                className="form-input"
                value={question.text?.[locale] || ''}
                onChange={(ev) => updateQuestion(question.id, {
                  text: { ...question.text, [locale]: ev.target.value }
                })}
              />
            </label>
          ))}

          {question.kind === 'text' ? (
            <div>
              <p className="auto-flow__label">Danach</p>
              <NextList
                ids={question.next || []}
                questions={questions}
                selfId={question.id}
                onChange={(next) => updateQuestion(question.id, { next })}
              />
            </div>
          ) : (
            <div className="auto-flow-options">
              {(question.options || []).map((opt, index) => (
                <div key={`${question.id}-${index}`} className="auto-flow-option">
                  <input
                    className="form-input"
                    value={opt.value}
                    placeholder="Wert im Ticket"
                    aria-label="Wert im Ticket"
                    disabled={opt.prompt}
                    onChange={(ev) => updateOption(question.id, index, { value: ev.target.value })}
                  />
                  {['de', 'ar', 'en'].map((locale) => (
                    <input
                      key={locale}
                      className="form-input"
                      value={opt.title?.[locale] || ''}
                      placeholder={locale === 'de' ? 'Button Deutsch' : locale === 'ar' ? 'Button Arabisch' : 'Button Englisch'}
                      aria-label={locale === 'de' ? 'Button Deutsch' : locale === 'ar' ? 'Button Arabisch' : 'Button Englisch'}
                      onChange={(ev) => updateOption(question.id, index, {
                        title: { ...opt.title, [locale]: ev.target.value }
                      })}
                    />
                  ))}
                  <label className="auto-flow-option__prompt">
                    <input
                      type="checkbox"
                      checked={Boolean(opt.prompt)}
                      onChange={(ev) => updateOption(question.id, index, {
                        prompt: ev.target.checked,
                        value: ev.target.checked ? '' : opt.value
                      })}
                    />
                    keinen Wert speichern
                  </label>
                  <p className="auto-flow__label">Danach</p>
                  <NextList
                    ids={opt.next || []}
                    questions={questions}
                    selfId={question.id}
                    onChange={(next) => updateOption(question.id, index, { next })}
                  />
                  <button
                    type="button"
                    className="btn btn--secondary btn--small"
                    onClick={() => updateQuestion(question.id, {
                      options: question.options.filter((_, i) => i !== index)
                    })}
                  >
                    Wert löschen
                  </button>
                </div>
              ))}
              {(question.options || []).length < 10 ? (
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
        </article>
      ))}

      <div className="auto-flow__actions">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => {
            setSaved(false);
            setFlow((prev) => ({ ...prev, questions: [...prev.questions, newQuestion()] }));
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
