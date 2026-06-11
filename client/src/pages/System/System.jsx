import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isAdmin } from '../../utils/roles';
import {
  listVorvertraegeApi,
  createVorvertragApi,
  updateVorvertragApi
} from '../../services/vorvertrag.service';
import VorvertragForm, {
  emptyVorvertragForm,
  formFromEntry,
  buildVorvertragPayload
} from './VorvertragForm';
import VorvertragEntryCard from './VorvertragEntryCard';
import { useVorvertragImeiCatalog } from './useVorvertragImeiCatalog';
import { FILIALE_OPTIONS, userFilialeFromEinsatzOrt } from '../../constants/einsatzorte';
import './System.scss';

const TOAST_MS = 4500;

const System = () => {
  const { user } = useAuth();
  const formRef = useRef(null);
  const cardsSectionRef = useRef(null);
  const [filialeOptions, setFilialeOptions] = useState(FILIALE_OPTIONS);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [form, setForm] = useState(emptyVorvertragForm);
  const [geraetSeed, setGeraetSeed] = useState('');
  const [mode, setMode] = useState('new');

  const navbarFiliale = useMemo(
    () => userFilialeFromEinsatzOrt(user?.einsatz_ort),
    [user?.einsatz_ort]
  );

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

  useEffect(() => {
    if (!showForm || mode !== 'new' || !navbarFiliale) return;
    setForm((prev) => (prev.filiale === navbarFiliale ? prev : { ...prev, filiale: navbarFiliale }));
  }, [showForm, mode, navbarFiliale]);

  const scrollToCard = (id) => {
    if (!id) return;
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-entry-id="${CSS.escape(id)}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const startNew = () => {
    setActiveId(null);
    setForm({ ...emptyVorvertragForm(), filiale: navbarFiliale });
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

  const handleFormPatch = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessToast(null);
    try {
      const filialeForSave = mode === 'edit' ? form.filiale : (navbarFiliale || form.filiale);
      if (mode !== 'edit' && !filialeForSave?.trim()) {
        setError('Bitte zuerst eine Filiale in der Navbar wählen.');
        setSaving(false);
        return;
      }
      const payload = buildVorvertragPayload({ ...form, filiale: filialeForSave });
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
        <button type="button" className="btn btn--primary" onClick={startNew} disabled={showForm}>
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
            onPatch={handleFormPatch}
            onSubmit={handleSubmit}
            onCancel={cancelForm}
            filialeOptions={filialeOptions}
            navbarFiliale={navbarFiliale}
            existingEntries={entries}
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
