import React, { useState, useEffect } from 'react';
import { getPerformanceMetrics, savePerformanceMetrics } from '../../services/dashboard.service';
import './PerformanceDashboard.scss';

const DEFAULT_METRICS = {
  dataStatus: '19.03.2024',
  resttage: 10,
  monatsziel: {
    postpaid: { deltaZuGestern: 107, aktuell: 931, hochrechnung: 1729, ziel: 2000 },
    vvl: { deltaZuGestern: 107, aktuell: 908, hochrechnung: 1574, ziel: 1400 },
    permissionQuote: { aktuell: 87.45, ziel: '>75%' },
    rotationalChurn: { aktuell: 5.2, ziel: '<6%' },
    poXVvl: { aktuell: 18.5, ziel: '>16%' },
    foxX: { aktuell: 6.2, ziel: '>5%' }
  },
  quartalsziel: {
    prepaid: { vormonate: 181, aktuell: 15, gesamt: 196, ziel: 180, rest: 'OK' },
    dsl: { vormonate: 197, aktuell: 67, gesamt: 264, ziel: 300, rest: 36 },
    o2tv: { vormonate: 95, aktuell: 17, gesamt: 112, ziel: 162, rest: 50 }
  }
};

const PerformanceDashboard = ({ isAdmin, readOnly = false, metaInHeader = false, onMetricsLoaded }) => {
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await getPerformanceMetrics();
        if (res?.data?.metrics) {
          const m = res.data.metrics;
          const merged = { ...DEFAULT_METRICS };
          if (m?.dataStatus) merged.dataStatus = m.dataStatus;
          if (m?.resttage != null) merged.resttage = m.resttage;
          if (m?.workingDays != null) merged.resttage = m.workingDays;
          if (m?.monatsziel) merged.monatsziel = { ...merged.monatsziel, ...m.monatsziel };
          if (m?.quartalsziel) merged.quartalsziel = { ...merged.quartalsziel, ...m.quartalsziel };
          setMetrics(merged);
          onMetricsLoaded?.(merged);
        }
      } catch {
        // use defaults
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [onMetricsLoaded]);

  const handleStartEdit = () => {
    setEditData(JSON.parse(JSON.stringify(metrics)));
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditData(null);
  };

  const handleSave = async () => {
    if (!editData || !isAdmin) return;
    try {
      setSaving(true);
      await savePerformanceMetrics(editData);
      setMetrics(editData);
      setEditing(false);
      setEditData(null);
    } catch (err) {
      console.error('Fehler beim Speichern:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateEdit = (path, value) => {
    setEditData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const parts = path.split('.');
      let obj = next;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (!obj[key]) obj[key] = {};
        obj = obj[key];
      }
      obj[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const calcDeltaMonat = (hochrechnung, ziel) => {
    if (hochrechnung == null || ziel == null || typeof ziel === 'string') return null;
    return Number(hochrechnung) - Number(ziel);
  };

  const getMonatStatus = (row, mo) => {
    if (row === 'postpaid' || row === 'vvl') {
      const d = calcDeltaMonat(mo?.hochrechnung, mo?.ziel);
      if (d == null) return { text: '–', ok: null };
      return { text: String(d >= 0 ? d : d), ok: d >= 0 };
    }
    if (row === 'permissionQuote' || row === 'poXVvl' || row === 'foxX') {
      const z = mo?.ziel || '';
      if (!z.startsWith('>')) return { text: '–', ok: null };
      const th = parseFloat(String(z).slice(1).replace('%', '').replace(',', '.'));
      const ok = Number(mo?.aktuell ?? 0) >= th;
      return { text: ok ? 'OK' : 'Achtung', ok };
    }
    if (row === 'rotationalChurn') {
      const z = mo?.ziel || '';
      if (!z.startsWith('<')) return { text: '–', ok: null };
      const th = parseFloat(String(z).slice(1).replace('%', '').replace(',', '.'));
      const ok = Number(mo?.aktuell ?? 0) < th;
      return { text: ok ? 'OK' : 'Achtung', ok };
    }
    return { text: '–', ok: null };
  };

  const getQuartalStatus = (qo) => {
    const rest = qo?.rest;
    if (rest === 'OK' || rest === 'Erledigt' || (typeof rest === 'string' && rest.toLowerCase().includes('ok'))) {
      return { text: 'OK', ok: true };
    }
    const num = typeof rest === 'number' ? rest : parseInt(rest, 10);
    if (!isNaN(num) && num > 0) return { text: String(num), ok: false };
    return { text: String(rest ?? '–'), ok: false };
  };

  if (loading) {
    return (
      <div className="performance-dashboard performance-dashboard--loading">
        <div className="performance-dashboard__spinner" />
        <p>Lade Kennzahlen...</p>
      </div>
    );
  }

  const m = editing ? editData : metrics;
  const mo = m?.monatsziel || {};
  const qo = m?.quartalsziel || {};

  const monatRows = [
    { key: 'postpaid', label: 'Postpaid' },
    { key: 'vvl', label: 'VVL' },
    { key: 'permissionQuote', label: 'Permission Quote' },
    { key: 'rotationalChurn', label: 'Rotational Churn' },
    { key: 'poXVvl', label: 'PO-X-VVL' },
    { key: 'foxX', label: 'FOX-X' }
  ];

  const quartalRows = [
    { key: 'prepaid', label: 'Prepaid' },
    { key: 'dsl', label: 'DSL' },
    { key: 'o2tv', label: 'o2 TV' }
  ];

  return (
    <div className="performance-dashboard">
      {(!metaInHeader || (!readOnly && isAdmin)) && (
        <div className={`performance-dashboard__header ${metaInHeader ? 'performance-dashboard__header--actions-only' : ''}`}>
          {!metaInHeader && (
            <div className="performance-dashboard__meta">
              <span className="performance-dashboard__meta-item">
                <strong>Stand der Daten</strong> {m?.dataStatus ?? '–'}
              </span>
              <span className="performance-dashboard__meta-item">
                <strong>Resttage im Monat</strong> {m?.resttage ?? m?.workingDays ?? '–'}
              </span>
            </div>
          )}
          {!readOnly && isAdmin && !editing && (
            <button type="button" className="btn btn--primary btn--small" onClick={handleStartEdit}>
              Bearbeiten
            </button>
          )}
          {!readOnly && isAdmin && editing && (
            <div className="performance-dashboard__actions">
              <button type="button" className="btn btn--primary btn--small" onClick={handleSave} disabled={saving}>
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
              <button type="button" className="btn btn--secondary btn--small" onClick={handleCancelEdit}>
                Abbrechen
              </button>
            </div>
          )}
        </div>
      )}

      <div className="performance-dashboard__table-wrapper">
        {/* Monatsziel */}
        <section className="performance-dashboard__section">
          <div className="performance-dashboard__section-label">Monatsziel</div>
          <div className="performance-dashboard__table-card">
            <table className="performance-dashboard__table">
              <thead>
                <tr>
                  <th></th>
                  <th>Delta zu gestern</th>
                  <th>Aktuell</th>
                  <th>Hochrechnung Monat</th>
                  <th>Ziel AZ</th>
                  <th>Delta zur Hochrechnung</th>
                </tr>
              </thead>
              <tbody>
                {monatRows.map(({ key, label }) => {
                  const row = mo[key];
                  const isPercent = ['permissionQuote', 'rotationalChurn', 'poXVvl', 'foxX'].includes(key);
                  const status = getMonatStatus(key, row);
                  return (
                    <tr key={key}>
                      <td className="performance-dashboard__cell-label">{label}</td>
                      <td>{key === 'postpaid' || key === 'vvl' ? (row?.deltaZuGestern ?? '–') : '–'}</td>
                      <td>
                        {row?.aktuell != null
                          ? isPercent
                            ? `${Number(row.aktuell).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
                            : row.aktuell
                          : '–'}
                      </td>
                      <td>{key === 'postpaid' || key === 'vvl' ? (row?.hochrechnung ?? '–') : '–'}</td>
                      <td>{row?.ziel ?? '–'}</td>
                      <td>
                        <span className={`performance-dashboard__status performance-dashboard__status--${status.ok === true ? 'ok' : status.ok === false ? 'warn' : 'neutral'}`}>
                          {status.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="performance-dashboard__divider" />

        {/* Quartalsziel */}
        <section className="performance-dashboard__section">
          <div className="performance-dashboard__section-label">Quartalsziel</div>
          <div className="performance-dashboard__table-card">
            <table className="performance-dashboard__table">
              <thead>
                <tr>
                  <th></th>
                  <th>Vormonate</th>
                  <th>Aktuell</th>
                  <th>Gesamt Quartal</th>
                  <th>Ziel AZ</th>
                  <th>Rest</th>
                </tr>
              </thead>
              <tbody>
                {quartalRows.map(({ key, label }) => {
                  const row = qo[key];
                  const status = getQuartalStatus(row);
                  return (
                    <tr key={key}>
                      <td className="performance-dashboard__cell-label">{label}</td>
                      <td className="performance-dashboard__cell-muted">{row?.vormonate ?? row?.letzterMonat ?? '–'}</td>
                      <td>{row?.aktuell ?? '–'}</td>
                      <td>{row?.gesamt ?? row?.hochrechnung ?? '–'}</td>
                      <td>{row?.ziel ?? '–'}</td>
                      <td>
                        <span className={`performance-dashboard__status performance-dashboard__status--${status.ok ? 'ok' : 'warn'}`}>
                          {status.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {editing && isAdmin && !readOnly && (
        <div className="performance-dashboard__edit-form">
          <h4>Werte bearbeiten</h4>
          <div className="performance-dashboard__edit-grid">
            <label>
              Stand der Daten
              <input type="text" value={editData?.dataStatus ?? ''} onChange={(e) => updateEdit('dataStatus', e.target.value)} />
            </label>
            <label>
              Resttage im Monat
              <input type="number" value={editData?.resttage ?? editData?.workingDays ?? ''} onChange={(e) => updateEdit('resttage', parseInt(e.target.value, 10) || 0)} />
            </label>
            {['postpaid', 'vvl'].map((k) => (
              <React.Fragment key={k}>
                <label>{k} Delta zu gestern<input type="number" value={editData?.monatsziel?.[k]?.deltaZuGestern ?? ''} onChange={(e) => updateEdit(`monatsziel.${k}.deltaZuGestern`, parseInt(e.target.value, 10) || 0)} /></label>
                <label>{k} Aktuell<input type="number" value={editData?.monatsziel?.[k]?.aktuell ?? ''} onChange={(e) => updateEdit(`monatsziel.${k}.aktuell`, parseInt(e.target.value, 10) || 0)} /></label>
                <label>{k} Hochrechnung<input type="number" value={editData?.monatsziel?.[k]?.hochrechnung ?? ''} onChange={(e) => updateEdit(`monatsziel.${k}.hochrechnung`, parseInt(e.target.value, 10) || 0)} /></label>
                <label>{k} Ziel<input type="number" value={editData?.monatsziel?.[k]?.ziel ?? ''} onChange={(e) => updateEdit(`monatsziel.${k}.ziel`, parseInt(e.target.value, 10) || 0)} /></label>
              </React.Fragment>
            ))}
            {['permissionQuote', 'rotationalChurn', 'poXVvl', 'foxX'].map((k) => (
              <React.Fragment key={k}>
                <label>{k} Aktuell<input type="number" step="0.01" value={editData?.monatsziel?.[k]?.aktuell ?? ''} onChange={(e) => updateEdit(`monatsziel.${k}.aktuell`, parseFloat(e.target.value) || 0)} /></label>
                <label>{k} Ziel<input type="text" value={editData?.monatsziel?.[k]?.ziel ?? ''} onChange={(e) => updateEdit(`monatsziel.${k}.ziel`, e.target.value)} /></label>
              </React.Fragment>
            ))}
            {['prepaid', 'dsl', 'o2tv'].map((k) => (
              <React.Fragment key={k}>
                <label>{k} Vormonate<input type="number" value={editData?.quartalsziel?.[k]?.vormonate ?? editData?.quartalsziel?.[k]?.letzterMonat ?? ''} onChange={(e) => updateEdit(`quartalsziel.${k}.vormonate`, parseInt(e.target.value, 10) || 0)} /></label>
                <label>{k} Aktuell<input type="number" value={editData?.quartalsziel?.[k]?.aktuell ?? ''} onChange={(e) => updateEdit(`quartalsziel.${k}.aktuell`, parseInt(e.target.value, 10) || 0)} /></label>
                <label>{k} Gesamt Quartal<input type="number" value={editData?.quartalsziel?.[k]?.gesamt ?? editData?.quartalsziel?.[k]?.hochrechnung ?? ''} onChange={(e) => updateEdit(`quartalsziel.${k}.gesamt`, parseInt(e.target.value, 10) || 0)} /></label>
                <label>{k} Ziel<input type="number" value={editData?.quartalsziel?.[k]?.ziel ?? ''} onChange={(e) => updateEdit(`quartalsziel.${k}.ziel`, parseInt(e.target.value, 10) || 0)} /></label>
                <label>{k} Rest<input type="text" value={editData?.quartalsziel?.[k]?.rest ?? editData?.quartalsziel?.[k]?.fehlen ?? ''} onChange={(e) => updateEdit(`quartalsziel.${k}.rest`, e.target.value)} /></label>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;
