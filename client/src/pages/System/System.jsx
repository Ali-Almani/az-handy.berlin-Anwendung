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
import './System.scss';

const DEFAULT_FILIALEN = ['Sonne', 'KM127', 'KM169', 'KM50', 'Turm', 'Bad', 'Haupt'];

const System = () => {
  const { user } = useAuth();
  const formRef = useRef(null);
  const [filialeOptions, setFilialeOptions] = useState(DEFAULT_FILIALEN);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [form, setForm] = useState(emptyVorvertragForm);
  const [mode, setMode] = useState('new');

  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listVorvertraegeApi();
      setEntries(res?.entries ?? []);
      if (Array.isArray(res?.filialeOptions) && res.filialeOptions.length > 0) {
        setFilialeOptions(res.filialeOptions);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Laden fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && isAdmin(user)) loadList();
  }, [user, loadList]);

  const startNew = () => {
    setActiveId(null);
    setForm(emptyVorvertragForm());
    setMode('new');
    setShowForm(true);
    setError('');
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const startEdit = (entry) => {
    setActiveId(entry.id);
    setForm(formFromEntry(entry));
    setMode('edit');
    setShowForm(true);
    setError('');
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const cancelForm = () => {
    setShowForm(false);
    setActiveId(null);
    setForm(emptyVorvertragForm());
    setMode('new');
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = buildVorvertragPayload(form);
      if (mode === 'edit' && activeId) {
        await updateVorvertragApi(activeId, payload);
      } else {
        await createVorvertragApi(payload);
      }
      await loadList();
      cancelForm();
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
      await loadList();
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
      <h1 className="system-page-title">System</h1>

      <div className="system-tabs" role="tablist" aria-label="System Bereiche">
        <button type="button" role="tab" aria-selected className="system-tab system-tab--active">
          Vorvertrag
        </button>
      </div>

      <div className="system-toolbar">
        <button type="button" className="btn btn--primary" onClick={startNew}>
          Neuer Vorvertrag
        </button>
      </div>

      {error ? <p className="vorvertrag-error" role="alert">{error}</p> : null}

      {showForm ? (
        <div ref={formRef}>
          <VorvertragForm
            form={form}
            onChange={handleFormChange}
            onSubmit={handleSubmit}
            onCancel={cancelForm}
            filialeOptions={filialeOptions}
            saving={saving}
            mode={mode}
          />
        </div>
      ) : null}

      <section className="vorvertrag-cards-section">
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
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default System;
