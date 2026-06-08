import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isAdmin } from '../../utils/roles';
import {
  listVorvertraegeApi,
  getVorvertragApi,
  createVorvertragApi,
  updateVorvertragApi,
  deleteVorvertragApi
} from '../../services/vorvertrag.service';
import './System.scss';

const DEFAULT_FILIALEN = ['Sonne', 'KM127', 'KM169', 'KM50', 'Turm', 'Bad', 'Haupt'];
const HW_VOUCHER_OPTIONS = ['', '24 Monate', '36 Monate'];

const emptyForm = () => ({
  datum: new Date().toISOString().slice(0, 10),
  filiale: '',
  kundeVorname: '',
  kundeNachname: '',
  ausgabeDetails: '',
  anschlussJaNein: 'nein',
  anschlussWert: '',
  zuzahlungJaNein: 'nein',
  zuzahlungWert: '',
  nationalitaet: '',
  passNummer: '',
  passAblaufDatum: '',
  iban: '',
  ibanInhaber: '',
  hwVoucher: '',
  kombi: '',
  vvl: '',
  eposKundenummer: '',
  mnp: '',
  notiz: ''
});

function formFromEntry(entry) {
  const e = entry?.eingabeDetails || {};
  return {
    datum: entry?.datum || '',
    filiale: entry?.filiale || '',
    kundeVorname: entry?.kundeVorname || '',
    kundeNachname: entry?.kundeNachname || '',
    ausgabeDetails: entry?.ausgabeDetails || '',
    anschlussJaNein: entry?.anschluss?.jaNein || 'nein',
    anschlussWert: entry?.anschluss?.wert || '',
    zuzahlungJaNein: entry?.zuzahlung?.jaNein || 'nein',
    zuzahlungWert: entry?.zuzahlung?.wert || '',
    nationalitaet: e.nationalitaet || '',
    passNummer: e.passNummer || '',
    passAblaufDatum: e.passAblaufDatum || '',
    iban: e.iban || '',
    ibanInhaber: e.ibanInhaber || '',
    hwVoucher: e.hwVoucher || '',
    kombi: e.kombi || '',
    vvl: e.vvl || '',
    eposKundenummer: e.eposKundenummer || '',
    mnp: e.mnp || '',
    notiz: e.notiz || ''
  };
}

function buildPayload(form) {
  return {
    datum: form.datum,
    filiale: form.filiale,
    kundeVorname: form.kundeVorname,
    kundeNachname: form.kundeNachname,
    ausgabeDetails: form.ausgabeDetails,
    anschlussJaNein: form.anschlussJaNein,
    anschlussWert: form.anschlussWert,
    zuzahlungJaNein: form.zuzahlungJaNein,
    zuzahlungWert: form.zuzahlungWert,
    eingabeDetails: {
      nationalitaet: form.nationalitaet,
      passNummer: form.passNummer,
      passAblaufDatum: form.passAblaufDatum,
      iban: form.iban,
      ibanInhaber: form.ibanInhaber,
      hwVoucher: form.hwVoucher,
      kombi: form.kombi,
      vvl: form.vvl,
      eposKundenummer: form.eposKundenummer,
      mnp: form.mnp,
      notiz: form.notiz
    }
  };
}

function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('de-DE');
  } catch {
    return iso;
  }
}

const Vorvertrag = () => {
  const { user } = useAuth();
  const [filialeOptions, setFilialeOptions] = useState(DEFAULT_FILIALEN);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [history, setHistory] = useState([]);
  const [mode, setMode] = useState('new');

  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listVorvertraegeApi();
      const list = res?.entries ?? [];
      setEntries(list);
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

  const loadEntry = useCallback(async (id) => {
    if (!id) return;
    setError('');
    try {
      const res = await getVorvertragApi(id);
      const entry = res?.entry;
      if (!entry) return;
      setForm(formFromEntry(entry));
      setHistory(Array.isArray(entry.editHistory) ? entry.editHistory : []);
      setActiveId(id);
      setMode('edit');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Eintrag konnte nicht geladen werden.');
    }
  }, []);

  const startNew = () => {
    setActiveId(null);
    setForm(emptyForm());
    setHistory([]);
    setMode('new');
    setError('');
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = buildPayload(form);
      if (mode === 'edit' && activeId) {
        const res = await updateVorvertragApi(activeId, payload);
        if (res?.entry) {
          setHistory(res.entry.editHistory || []);
        }
      } else {
        const res = await createVorvertragApi(payload);
        if (res?.entry?.id) {
          setActiveId(res.entry.id);
          setMode('edit');
          setHistory(res.entry.editHistory || []);
        }
      }
      await loadList();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeId) return;
    if (!window.confirm('Diesen Vorvertrag wirklich löschen?')) return;
    setSaving(true);
    setError('');
    try {
      await deleteVorvertragApi(activeId);
      startNew();
      await loadList();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Löschen fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const activeSummary = useMemo(() => {
    if (mode !== 'edit' || !activeId) return null;
    const row = entries.find((x) => x.id === activeId);
    return row || null;
  }, [mode, activeId, entries]);

  if (!user || !isAdmin(user)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="vorvertrag-page container">
      <div className="vorvertrag-header">
        <div>
          <Link to="/system" className="vorvertrag-back">
            ← System
          </Link>
          <h1 className="system-page-title">Vorvertrag</h1>
        </div>
        <button type="button" className="btn btn--primary" onClick={startNew}>
          Neuer Vorvertrag
        </button>
      </div>

      {error ? <p className="vorvertrag-error" role="alert">{error}</p> : null}

      <div className="vorvertrag-layout">
        <section className="vorvertrag-panel">
          <h2>{mode === 'edit' ? 'Bearbeiten' : 'Neuer Vorvertrag'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="vorvertrag-section">
              <h3 className="vorvertrag-section-title">Allgemein</h3>
              <div className="vorvertrag-form-grid">
                <div className="form-group">
                  <label htmlFor="vv-datum" className="form-label">Datum</label>
                  <input
                    id="vv-datum"
                    type="date"
                    className="form-input"
                    value={form.datum}
                    onChange={(ev) => handleChange('datum', ev.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="vv-filiale" className="form-label">Filiale</label>
                  <select
                    id="vv-filiale"
                    className="form-input"
                    value={form.filiale}
                    onChange={(ev) => handleChange('filiale', ev.target.value)}
                    required
                  >
                    <option value="">— auswählen —</option>
                    {filialeOptions.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="vv-vorname" className="form-label">Kunde Vorname</label>
                  <input
                    id="vv-vorname"
                    type="text"
                    className="form-input"
                    value={form.kundeVorname}
                    onChange={(ev) => handleChange('kundeVorname', ev.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="vv-nachname" className="form-label">Kunde Nachname</label>
                  <input
                    id="vv-nachname"
                    type="text"
                    className="form-input"
                    value={form.kundeNachname}
                    onChange={(ev) => handleChange('kundeNachname', ev.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="vorvertrag-section">
              <h3 className="vorvertrag-section-title">Ausgabe Details</h3>
              <div className="vorvertrag-form-grid vorvertrag-form-grid--full">
                <div className="form-group">
                  <label htmlFor="vv-ausgabe" className="form-label">
                    Geräte, Farben, Verfügbarkeit in Filiale
                  </label>
                  <textarea
                    id="vv-ausgabe"
                    className="form-input"
                    rows={4}
                    value={form.ausgabeDetails}
                    onChange={(ev) => handleChange('ausgabeDetails', ev.target.value)}
                    placeholder="z. B. iPhone 15 Pro, Schwarz, auf Lager in Filiale Sonne"
                  />
                </div>
              </div>
            </div>

            <div className="vorvertrag-section">
              <h3 className="vorvertrag-section-title">Anschluss &amp; Zuzahlung</h3>
              <div className="vorvertrag-ja-nein-row">
                <div className="form-group">
                  <label htmlFor="vv-anschluss" className="form-label">Anschluss?</label>
                  <select
                    id="vv-anschluss"
                    className="form-input"
                    value={form.anschlussJaNein}
                    onChange={(ev) => handleChange('anschlussJaNein', ev.target.value)}
                  >
                    <option value="nein">Nein</option>
                    <option value="ja">Ja</option>
                  </select>
                </div>
                {form.anschlussJaNein === 'ja' && (
                  <div className="form-group form-group--grow">
                    <label htmlFor="vv-anschluss-wert" className="form-label">Anschluss Wert</label>
                    <input
                      id="vv-anschluss-wert"
                      type="text"
                      className="form-input"
                      value={form.anschlussWert}
                      onChange={(ev) => handleChange('anschlussWert', ev.target.value)}
                    />
                  </div>
                )}
              </div>
              <div className="vorvertrag-ja-nein-row" style={{ marginTop: '0.75rem' }}>
                <div className="form-group">
                  <label htmlFor="vv-zuzahlung" className="form-label">Zuzahlung?</label>
                  <select
                    id="vv-zuzahlung"
                    className="form-input"
                    value={form.zuzahlungJaNein}
                    onChange={(ev) => handleChange('zuzahlungJaNein', ev.target.value)}
                  >
                    <option value="nein">Nein</option>
                    <option value="ja">Ja</option>
                  </select>
                </div>
                {form.zuzahlungJaNein === 'ja' && (
                  <div className="form-group form-group--grow">
                    <label htmlFor="vv-zuzahlung-wert" className="form-label">Zuzahlung Wert</label>
                    <input
                      id="vv-zuzahlung-wert"
                      type="text"
                      className="form-input"
                      value={form.zuzahlungWert}
                      onChange={(ev) => handleChange('zuzahlungWert', ev.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="vorvertrag-section">
              <h3 className="vorvertrag-section-title">Eingabe Details</h3>
              <div className="vorvertrag-form-grid">
                <div className="form-group">
                  <label htmlFor="vv-nationalitaet" className="form-label">Nationalität</label>
                  <input
                    id="vv-nationalitaet"
                    type="text"
                    className="form-input"
                    value={form.nationalitaet}
                    onChange={(ev) => handleChange('nationalitaet', ev.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="vv-pass" className="form-label">Pass / Personalausweis Nummer</label>
                  <input
                    id="vv-pass"
                    type="text"
                    className="form-input"
                    value={form.passNummer}
                    onChange={(ev) => handleChange('passNummer', ev.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="vv-pass-ablauf" className="form-label">Personalausweis Ablauf Datum</label>
                  <input
                    id="vv-pass-ablauf"
                    type="date"
                    className="form-input"
                    value={form.passAblaufDatum}
                    onChange={(ev) => handleChange('passAblaufDatum', ev.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="vv-iban" className="form-label">IBAN</label>
                  <input
                    id="vv-iban"
                    type="text"
                    className="form-input"
                    value={form.iban}
                    onChange={(ev) => handleChange('iban', ev.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="vv-iban-inhaber" className="form-label">Name des IBAN-Inhabers</label>
                  <input
                    id="vv-iban-inhaber"
                    type="text"
                    className="form-input"
                    value={form.ibanInhaber}
                    onChange={(ev) => handleChange('ibanInhaber', ev.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="vv-hw-voucher" className="form-label">HW-Voucher</label>
                  <select
                    id="vv-hw-voucher"
                    className="form-input"
                    value={form.hwVoucher}
                    onChange={(ev) => handleChange('hwVoucher', ev.target.value)}
                  >
                    <option value="">— keine Auswahl —</option>
                    {HW_VOUCHER_OPTIONS.filter(Boolean).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="vv-kombi" className="form-label">Kombi</label>
                  <input
                    id="vv-kombi"
                    type="text"
                    className="form-input"
                    value={form.kombi}
                    onChange={(ev) => handleChange('kombi', ev.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="vv-vvl" className="form-label">VVL</label>
                  <input
                    id="vv-vvl"
                    type="text"
                    className="form-input"
                    value={form.vvl}
                    onChange={(ev) => handleChange('vvl', ev.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="vv-epos" className="form-label">ePOS-Kundenummer</label>
                  <input
                    id="vv-epos"
                    type="text"
                    className="form-input"
                    value={form.eposKundenummer}
                    onChange={(ev) => handleChange('eposKundenummer', ev.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="vv-mnp" className="form-label">MNP</label>
                  <input
                    id="vv-mnp"
                    type="text"
                    className="form-input"
                    value={form.mnp}
                    onChange={(ev) => handleChange('mnp', ev.target.value)}
                  />
                </div>
                <div className="form-group vorvertrag-form-grid--full" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="vv-notiz" className="form-label">Notiz</label>
                  <textarea
                    id="vv-notiz"
                    className="form-input"
                    rows={3}
                    value={form.notiz}
                    onChange={(ev) => handleChange('notiz', ev.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="vorvertrag-actions">
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Speichern…' : mode === 'edit' ? 'Änderungen speichern' : 'Vorvertrag einreichen'}
              </button>
              {mode === 'edit' && activeId ? (
                <button type="button" className="btn btn--danger" onClick={handleDelete} disabled={saving}>
                  Löschen
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <aside className="vorvertrag-panel">
          <h2>Gespeicherte Vorverträge</h2>
          {loading ? (
            <p className="vorvertrag-empty">Laden…</p>
          ) : entries.length === 0 ? (
            <p className="vorvertrag-empty">Noch keine Vorverträge erfasst.</p>
          ) : (
            <ul className="vorvertrag-list">
              {entries.map((row) => {
                const name = [row.kundeVorname, row.kundeNachname].filter(Boolean).join(' ') || 'Ohne Kundenname';
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={`vorvertrag-list-item${activeId === row.id ? ' vorvertrag-list-item--active' : ''}`}
                      onClick={() => loadEntry(row.id)}
                    >
                      <span className="vorvertrag-list-item__main">
                        <span className="vorvertrag-list-item__title">{name}</span>
                        <span className="vorvertrag-list-item__meta">
                          {row.datum || '—'} · {row.filiale || '—'}
                          {row.historyCount > 0 ? ` · ${row.historyCount} Historie` : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {mode === 'edit' && activeSummary ? (
            <p className="vorvertrag-empty" style={{ marginTop: '1rem' }}>
              Zuletzt bearbeitet: {formatDateTime(activeSummary.updatedAt)}
              {activeSummary.lastEditedBy?.userName ? ` · ${activeSummary.lastEditedBy.userName}` : ''}
            </p>
          ) : null}

          <h3 style={{ marginTop: '1.25rem' }}>Bearbeitungs-Historie</h3>
          {mode !== 'edit' || history.length === 0 ? (
            <p className="vorvertrag-empty">
              {mode === 'edit' ? 'Keine Historie vorhanden.' : 'Nach dem Einreichen erscheint hier die Editor-Historie.'}
            </p>
          ) : (
            <ul className="vorvertrag-history">
              {history.map((h) => (
                <li key={h.id} className="vorvertrag-history-item">
                  <div className="vorvertrag-history-item__head">
                    <span>{h.action === 'created' ? 'Erstellt' : 'Bearbeitet'}</span>
                    <span>{h.editorUserName || '—'}</span>
                    <span className="vorvertrag-history-item__time">{formatDateTime(h.timestamp)}</span>
                  </div>
                  {h.snapshot ? (
                    <div>
                      {h.snapshot.filiale ? `${h.snapshot.filiale} · ` : ''}
                      {[h.snapshot.kundeVorname, h.snapshot.kundeNachname].filter(Boolean).join(' ') || '—'}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
};

export default Vorvertrag;
