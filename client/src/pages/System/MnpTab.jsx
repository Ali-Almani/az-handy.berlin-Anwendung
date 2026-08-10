import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  listMnpEntriesApi,
  createMnpEntryApi,
  updateMnpEntryApi
} from '../../services/mnp.service';
import MnpForm, {
  emptyMnpForm,
  formFromMnpEntry,
  buildMnpPayload
} from './MnpForm';
import MnpEntryCard from './MnpEntryCard';
import { FILIALE_OPTIONS, userFilialeFromEinsatzOrt } from '../../constants/einsatzorte';

const TOAST_MS = 4500;

export default function MnpTab() {
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
  const [form, setForm] = useState(emptyMnpForm);
  const [mode, setMode] = useState('new');

  const navbarFiliale = useMemo(
    () => userFilialeFromEinsatzOrt(user?.einsatz_ort),
    [user?.einsatz_ort]
  );

  const defaultMitarbeiter = useMemo(() => {
    const name = String(user?.name ?? '').trim();
    return name || String(user?.email ?? '').trim();
  }, [user?.name, user?.email]);

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
      const res = await listMnpEntriesApi();
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
    loadList();
  }, [loadList]);

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
    setForm({
      ...emptyMnpForm(),
      filiale: navbarFiliale,
      mitarbeiter: defaultMitarbeiter
    });
    setMode('new');
    setShowForm(true);
    setError('');
    setSuccessToast(null);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const startEdit = (entry) => {
    setActiveId(entry.id);
    setForm(formFromMnpEntry(entry));
    setMode('edit');
    setShowForm(true);
    setError('');
    setSuccessToast(null);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const cancelForm = () => {
    setShowForm(false);
    setActiveId(null);
    setForm(emptyMnpForm());
    setMode('new');
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
      const payload = buildMnpPayload({
        ...form,
        filiale: filialeForSave,
        mitarbeiter: form.mitarbeiter || defaultMitarbeiter
      });
      let savedId = activeId;

      if (mode === 'edit' && activeId) {
        const res = await updateMnpEntryApi(activeId, payload);
        savedId = res?.entry?.id || activeId;
        setSuccessToast({
          type: 'success',
          message: 'MNP-Eintrag wurde aktualisiert.'
        });
      } else {
        const res = await createMnpEntryApi(payload);
        savedId = res?.entry?.id || null;
        setSuccessToast({
          type: 'success',
          message: 'MNP-Eintrag eingereicht. Die Daten wurden als Karte in der Liste gespeichert.'
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

  return (
    <>
      <div className="system-toolbar">
        <button type="button" className="btn btn--primary" onClick={startNew} disabled={showForm}>
          Neuer MNP-Eintrag
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

      {showForm ? (
        <div ref={formRef}>
          <MnpForm
            form={form}
            onChange={handleFormChange}
            onSubmit={handleSubmit}
            onCancel={cancelForm}
            filialeOptions={filialeOptions}
            navbarFiliale={navbarFiliale}
            saving={saving}
            mode={mode}
          />
        </div>
      ) : null}

      <section className="vorvertrag-cards-section" ref={cardsSectionRef}>
        {loading ? (
          <p className="vorvertrag-empty">Laden…</p>
        ) : entries.length === 0 ? (
          <p className="vorvertrag-empty">Noch keine MNP-Einträge erfasst.</p>
        ) : (
          <div className="vorvertrag-cards-grid">
            {entries.map((entry) => (
              <MnpEntryCard
                key={entry.id}
                entry={entry}
                onEdit={startEdit}
                highlighted={highlightedId === entry.id}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
