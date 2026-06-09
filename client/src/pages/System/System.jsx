import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isAdmin } from '../../utils/roles';
import {
  listVorvertraegeApi,
  createVorvertragApi,
  updateVorvertragApi,
  deleteVorvertragApi
} from '../../services/vorvertrag.service';
import VorvertragForm, {
  emptyVorvertragForm,
  formFromEntry,
  buildVorvertragPayload
} from './VorvertragForm';
import VorvertragEntryCard from './VorvertragEntryCard';
import { useVorvertragImeiCatalog } from './useVorvertragImeiCatalog';
import './System.scss';

const DEFAULT_FILIALEN = ['Sonne', 'KM127', 'KM169', 'KM50', 'Turm', 'Bad', 'Haupt'];
const TOAST_MS = 4500;

const System = () => {
  const { user } = useAuth();
  const formRef = useRef(null);
  const cardsSectionRef = useRef(null);
  const [filialeOptions, setFilialeOptions] = useState(DEFAULT_FILIALEN);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [form, setForm] = useState(emptyVorvertragForm);
  const [geraetSeed, setGeraetSeed] = useState('');
  const [mode, setMode] = useState('new');

  const {
    imeis,
    loading: geraeteLoading,
    error: geraeteError
  } = useVorvertragImeiCatalog(Boolean(user && isAdmin(user)));

  useEffect(() => {
    if (!successToast) return undefined;
    const t = setTimeout(() => setSuccessToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [successToast]);

  useEffect(() => {
    if (!highlightedId) return undefined;
    const t = setTimeout(() => setHighlightedId(null), 3500);
    return () => clearTimeout(t);
  }, [highlightedId]);

  const loadList = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await listVorvertraegeApi();
      setEntries(res?.entries ?? []);
      if (Array.isArray(res?.filialeOptions) && res.filialeOptions.length > 0) {
        setFilialeOptions(res.filialeOptions);
      }
      return res?.entries ?? [];
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Laden fehlgeschlagen.');
      return [];
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && isAdmin(user)) loadList();
  }, [user, loadList]);

  const scrollToCard = (id) => {
    if (!id) return;
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-entry-id="${CSS.escape(id)}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const startNew = () => {
    setActiveId(null);
    setForm(emptyVorvertragForm());
    setGeraetSeed('');
    setMode('new');
    setShowForm(true);
    setError('');
    setSuccessToast(null);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const startEdit = (entry) => {
    setActiveId(entry.id);
    const nextForm = formFromEntry(entry);
    setForm(nextForm);
    setGeraetSeed(nextForm.ausgabeGeraet);
    setMode('edit');
    setShowForm(true);
    setError('');
    setSuccessToast(null);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const cancelForm = () => {
    setShowForm(false);
    setActiveId(null);
    setForm(emptyVorvertragForm());
    setGeraetSeed('');
    setMode('new');
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => {
      if (field === 'ausgabeGeraet') {
        return { ...prev, ausgabeGeraet: value, ausgabeFarbe: '' };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessToast(null);
    try {
      const payload = buildVorvertragPayload(form);
      let savedId = activeId;

      if (mode === 'edit' && activeId) {
        const res = await updateVorvertragApi(activeId, payload);
        savedId = res?.entry?.id || activeId;
        setSuccessToast({
          type: 'success',
          message: 'Vorvertrag wurde aktualisiert. Die Karte in der Liste ist bearbeitbar.'
        });
      } else {
        const res = await createVorvertragApi(payload);
        savedId = res?.entry?.id || null;
        setSuccessToast({
          type: 'success',
          message: 'Vorvertrag eingereicht. Die Daten wurden als Karte in der Ticketing-Liste gespeichert.'
        });
      }

      await loadList({ silent: true });
      cancelForm();

      if (savedId) {
        setHighlightedId(savedId);
        scrollToCard(savedId);
      } else {
        cardsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry) => {
    if (!entry?.id) return;
    if (!window.confirm('Diesen Vorvertrag wirklich löschen?')) return;
    setDeletingId(entry.id);
    setError('');
    try {
      await deleteVorvertragApi(entry.id);
      if (activeId === entry.id) cancelForm();
      await loadList({ silent: true });
      setSuccessToast({ type: 'success', message: 'Vorvertrag wurde gelöscht.' });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Löschen fehlgeschlagen.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!user || !isAdmin(user)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="system-page container">
      <h1 className="system-page-title">Ticketing System</h1>

      <div className="system-tabs" role="tablist" aria-label="Ticketing System Bereiche">
        <button type="button" role="tab" aria-selected className="system-tab system-tab--active">
          Vorvertrag
        </button>
      </div>

      <div className="system-toolbar">
        <button type="button" className="btn btn--primary" onClick={startNew}>
          Neuer Vorvertrag
        </button>
      </div>

      {successToast ? (
        <div className="system-toast system-toast--success" role="status" aria-live="polite">
          <span className="system-toast__icon" aria-hidden>✓</span>
          <span className="system-toast__message">{successToast.message}</span>
          <button
            type="button"
            className="system-toast__close"
            onClick={() => setSuccessToast(null)}
            aria-label="Benachrichtigung schließen"
          >
            ×
          </button>
        </div>
      ) : null}

      {error ? <p className="vorvertrag-error" role="alert">{error}</p> : null}
      {geraeteError ? <p className="vorvertrag-error" role="alert">{geraeteError}</p> : null}

      {showForm ? (
        <div ref={formRef}>
          <VorvertragForm
            form={form}
            onChange={handleFormChange}
            onSubmit={handleSubmit}
            onCancel={cancelForm}
            filialeOptions={filialeOptions}
            imeis={imeis}
            geraeteLoading={geraeteLoading}
            geraetSeed={geraetSeed}
            saving={saving}
            mode={mode}
          />
        </div>
      ) : null}

      <section className="vorvertrag-cards-section" ref={cardsSectionRef}>
        {loading ? (
          <p className="vorvertrag-empty">Laden…</p>
        ) : entries.length === 0 ? (
          <p className="vorvertrag-empty">Noch keine Vorverträge erfasst.</p>
        ) : (
          <div className="vorvertrag-cards-grid">
            {entries.map((entry) => (
              <VorvertragEntryCard
                key={entry.id}
                entry={entry}
                onEdit={startEdit}
                onDelete={handleDelete}
                deleting={deletingId === entry.id}
                highlighted={highlightedId === entry.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default System;
