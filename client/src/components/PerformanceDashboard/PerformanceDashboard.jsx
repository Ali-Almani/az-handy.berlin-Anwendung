import React, { useState, useEffect, useCallback } from 'react';
import { getPerformanceMetrics, savePerformanceMetrics } from '../../services/dashboard.service';
import './PerformanceDashboard.scss';

const DEFAULT_METRICS = {
  dataStatus: '19.03.2024',
  resttage: 10,
  notizenDe: '',
  notizenAr: '',
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

const DEFAULT_MONAT_ORDER = ['postpaid', 'vvl', 'permissionQuote', 'rotationalChurn', 'poXVvl', 'foxX'];
const DEFAULT_QUARTAL_ORDER = ['prepaid', 'dsl', 'o2tv'];

const LEGACY_MONAT_LABELS = {
  postpaid: 'Postpaid',
  vvl: 'VVL',
  permissionQuote: 'Permission Quote',
  rotationalChurn: 'Rotational Churn',
  poXVvl: 'PO-X-VVL',
  foxX: 'FOX-X'
};

const LEGACY_QUARTAL_LABELS = {
  prepaid: 'Prepaid',
  dsl: 'DSL',
  o2tv: 'o2 TV'
};

/** @type {Record<string, 'delta' | 'percentGt' | 'percentLt' | 'manual'>} */
const LEGACY_MONAT_KIND = {
  postpaid: 'delta',
  vvl: 'delta',
  permissionQuote: 'percentGt',
  rotationalChurn: 'percentLt',
  poXVvl: 'percentGt',
  foxX: 'percentGt'
};

function normalizeMonatszielOrder(mo, savedOrder) {
  const keys = Object.keys(mo || {});
  if (Array.isArray(savedOrder) && savedOrder.length) {
    const seen = new Set();
    const out = [];
    for (const k of savedOrder) {
      if (keys.includes(k) && !seen.has(k)) {
        out.push(k);
        seen.add(k);
      }
    }
    for (const k of keys) {
      if (!seen.has(k)) {
        out.push(k);
        seen.add(k);
      }
    }
    return out;
  }
  const base = DEFAULT_MONAT_ORDER.filter((k) => keys.includes(k));
  const extras = keys.filter((k) => !DEFAULT_MONAT_ORDER.includes(k));
  return [...base, ...extras];
}

function normalizeQuartalszielOrder(qo, savedOrder) {
  const keys = Object.keys(qo || {});
  if (Array.isArray(savedOrder) && savedOrder.length) {
    const seen = new Set();
    const out = [];
    for (const k of savedOrder) {
      if (keys.includes(k) && !seen.has(k)) {
        out.push(k);
        seen.add(k);
      }
    }
    for (const k of keys) {
      if (!seen.has(k)) {
        out.push(k);
        seen.add(k);
      }
    }
    return out;
  }
  const base = DEFAULT_QUARTAL_ORDER.filter((k) => keys.includes(k));
  const extras = keys.filter((k) => !DEFAULT_QUARTAL_ORDER.includes(k));
  return [...base, ...extras];
}

function getMonatRowKind(key, row) {
  const k = row?.kind;
  if (k === 'delta' || k === 'percentGt' || k === 'percentLt' || k === 'manual') return k;
  return LEGACY_MONAT_KIND[key] || 'delta';
}

function getMonatRowLabel(key, row) {
  if (row?.label != null && String(row.label).trim() !== '') return String(row.label).trim();
  if (LEGACY_MONAT_LABELS[key]) return LEGACY_MONAT_LABELS[key];
  return key;
}

function getQuartalRowLabel(key, row) {
  if (row?.label != null && String(row.label).trim() !== '') return String(row.label).trim();
  if (LEGACY_QUARTAL_LABELS[key]) return LEGACY_QUARTAL_LABELS[key];
  return key;
}

function isPercentMonatKind(kind) {
  return kind === 'percentGt' || kind === 'percentLt';
}

const PerformanceDashboard = ({ isAdmin, readOnly = false, metaInHeader = false, onMetricsLoaded }) => {
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchMetrics = useCallback(async (isInitial = true) => {
    try {
      if (isInitial) setLoading(true);
      const res = await getPerformanceMetrics();
      if (res?.data?.metrics) {
        const m = res.data.metrics;
        const merged = { ...DEFAULT_METRICS };
        if (m?.dataStatus) merged.dataStatus = m.dataStatus;
        if (m?.resttage != null) merged.resttage = m.resttage;
        if (m?.workingDays != null) merged.resttage = m.workingDays;
        if (m?.notizenDe != null) merged.notizenDe = m.notizenDe || '';
        if (m?.notizenAr != null) merged.notizenAr = m.notizenAr || '';
        if (m?.notizen != null && String(m.notizen).trim() && !String(merged.notizenDe || '').trim()) {
          merged.notizenDe = m.notizen || '';
        }
        if (m?.monatsziel) merged.monatsziel = { ...merged.monatsziel, ...m.monatsziel };
        if (m?.quartalsziel) merged.quartalsziel = { ...merged.quartalsziel, ...m.quartalsziel };
        if (Array.isArray(m?.monatszielOrder)) merged.monatszielOrder = [...m.monatszielOrder];
        if (Array.isArray(m?.quartalszielOrder)) merged.quartalszielOrder = [...m.quartalszielOrder];
        setMetrics(merged);
        onMetricsLoaded?.(merged);
      }
    } catch {
      // use defaults
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [onMetricsLoaded]);

  useEffect(() => {
    fetchMetrics(true);
    const id = readOnly ? setInterval(() => fetchMetrics(false), 30000) : null;
    return () => { if (id) clearInterval(id); };
  }, [fetchMetrics, readOnly]);

  const patchEditData = useCallback((fn) => {
    setEditData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      fn(next);
      return next;
    });
  }, []);

  const addMonatRow = useCallback(() => {
    patchEditData((next) => {
      const key = `mz_${Date.now()}`;
      if (!next.monatsziel) next.monatsziel = {};
      next.monatsziel[key] = { kind: 'delta', label: 'Neue Zeile' };
      next.monatszielOrder = normalizeMonatszielOrder(next.monatsziel, next.monatszielOrder);
    });
  }, [patchEditData]);

  const moveMonatRow = useCallback((key, dir) => {
    patchEditData((next) => {
      const ord = [...normalizeMonatszielOrder(next.monatsziel, next.monatszielOrder)];
      const i = ord.indexOf(key);
      if (i < 0) return;
      const j = dir === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= ord.length) return;
      [ord[i], ord[j]] = [ord[j], ord[i]];
      next.monatszielOrder = ord;
    });
  }, [patchEditData]);

  const removeMonatRow = useCallback((key) => {
    patchEditData((next) => {
      if (!next.monatsziel || Object.keys(next.monatsziel).length <= 1) return;
      delete next.monatsziel[key];
      next.monatszielOrder = normalizeMonatszielOrder(next.monatsziel, next.monatszielOrder).filter((k) => k !== key);
    });
  }, [patchEditData]);

  const addQuartalRow = useCallback(() => {
    patchEditData((next) => {
      const key = `qz_${Date.now()}`;
      if (!next.quartalsziel) next.quartalsziel = {};
      next.quartalsziel[key] = {
        label: 'Neue Zeile',
        vormonate: 0,
        aktuell: 0,
        gesamt: 0,
        ziel: '',
        rest: ''
      };
      next.quartalszielOrder = normalizeQuartalszielOrder(next.quartalsziel, next.quartalszielOrder);
    });
  }, [patchEditData]);

  const moveQuartalRow = useCallback((key, dir) => {
    patchEditData((next) => {
      const fixedOrd = [...normalizeQuartalszielOrder(next.quartalsziel, next.quartalszielOrder)];
      const i = fixedOrd.indexOf(key);
      if (i < 0) return;
      const j = dir === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= fixedOrd.length) return;
      [fixedOrd[i], fixedOrd[j]] = [fixedOrd[j], fixedOrd[i]];
      next.quartalszielOrder = fixedOrd;
    });
  }, [patchEditData]);

  const removeQuartalRow = useCallback((key) => {
    patchEditData((next) => {
      if (!next.quartalsziel || Object.keys(next.quartalsziel).length <= 1) return;
      delete next.quartalsziel[key];
      next.quartalszielOrder = normalizeQuartalszielOrder(next.quartalsziel, next.quartalszielOrder).filter((k) => k !== key);
    });
  }, [patchEditData]);

  const handleStartEdit = () => {
    const base = JSON.parse(JSON.stringify(metrics));
    if (!String(base.notizenDe ?? '').trim() && String(base.notizen ?? '').trim()) {
      base.notizenDe = base.notizen;
    }
    if (base.notizenAr == null) base.notizenAr = '';
    base.monatszielOrder = normalizeMonatszielOrder(base.monatsziel, base.monatszielOrder);
    base.quartalszielOrder = normalizeQuartalszielOrder(base.quartalsziel, base.quartalszielOrder);
    setEditData(base);
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
      const payload = JSON.parse(JSON.stringify(editData));
      payload.monatszielOrder = normalizeMonatszielOrder(payload.monatsziel, payload.monatszielOrder);
      payload.quartalszielOrder = normalizeQuartalszielOrder(payload.quartalsziel, payload.quartalszielOrder);
      await savePerformanceMetrics(payload);
      setMetrics(payload);
      onMetricsLoaded?.(payload);
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
        const part = parts[i];
        if (!obj[part]) obj[part] = {};
        obj = obj[part];
      }
      obj[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const calcDeltaMonat = (hochrechnung, ziel) => {
    if (hochrechnung == null || ziel == null || typeof ziel === 'string') return null;
    return Number(hochrechnung) - Number(ziel);
  };

  const getMonatStatus = (kind, mo) => {
    if (kind === 'delta') {
      const override = mo?.deltaHochrechnung;
      const d = override != null ? Number(override) : calcDeltaMonat(mo?.hochrechnung, mo?.ziel);
      if (d == null || (override == null && Number.isNaN(d))) return { text: '–', ok: null };
      return { text: String(d >= 0 ? d : d), ok: d >= 0 };
    }
    if (kind === 'percentGt' || kind === 'percentLt') {
      const statusOverride = mo?.statusOverride;
      if (statusOverride != null && String(statusOverride).trim() !== '') return { text: String(statusOverride), ok: null };
      const z = mo?.ziel || '';
      if (kind === 'percentGt') {
        if (!z.startsWith('>')) return { text: '–', ok: null };
        const th = parseFloat(String(z).slice(1).replace('%', '').replace(',', '.'));
        const ok = Number(mo?.aktuell ?? 0) >= th;
        return { text: ok ? 'OK' : 'Achtung', ok };
      }
      if (!z.startsWith('<')) return { text: '–', ok: null };
      const th = parseFloat(String(z).slice(1).replace('%', '').replace(',', '.'));
      const ok = Number(mo?.aktuell ?? 0) < th;
      return { text: ok ? 'OK' : 'Achtung', ok };
    }
    if (kind === 'manual') {
      const o = mo?.statusOverride;
      if (o != null && String(o).trim() !== '') return { text: String(o), ok: null };
      return { text: '–', ok: null };
    }
    return { text: '–', ok: null };
  };

  const getQuartalStatus = (qo) => {
    const rest = qo?.rest;
    if (rest === 'OK' || rest === 'Erledigt' || (typeof rest === 'string' && rest.toLowerCase().includes('ok'))) {
      return { text: 'OK', ok: true };
    }
    const num = typeof rest === 'number' ? rest : parseInt(rest, 10);
    if (!Number.isNaN(num) && num > 0) return { text: String(num), ok: false };
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
  const monatKeysOrdered = normalizeMonatszielOrder(mo, m?.monatszielOrder);
  const quartalKeysOrdered = normalizeQuartalszielOrder(qo, m?.quartalszielOrder);

  const showRowControls = !readOnly && isAdmin && editing;

  const notizenDeAnzeige = String(m?.notizenDe ?? '').trim() || String(m?.notizen ?? '').trim();
  const notizenArAnzeige = String(m?.notizenAr ?? '').trim();

  const headerMetaAndActions = metaInHeader && !readOnly && (
    <div className="card-header__meta performance-dashboard__header-meta">
      {editing && isAdmin ? (
        <label className="card-header__meta-item card-header__meta-item--editable">
          <strong>Stand der Daten</strong>
          <input type="text" className="performance-dashboard__meta-input-inline" value={editData?.dataStatus ?? ''} onChange={(e) => updateEdit('dataStatus', e.target.value)} />
        </label>
      ) : (
        <span className="card-header__meta-item">
          <strong>Stand der Daten</strong> {m?.dataStatus ?? '–'}
        </span>
      )}
      {editing && isAdmin ? (
        <label className="card-header__meta-item card-header__meta-item--editable">
          <strong>Resttage im Monat</strong>
          <input type="number" className="performance-dashboard__meta-input-inline" value={editData?.resttage ?? ''} onChange={(e) => updateEdit('resttage', parseInt(e.target.value, 10) || 0)} />
        </label>
      ) : (
        <span className="card-header__meta-item">
          <strong>Resttage im Monat</strong> {m?.resttage ?? m?.workingDays ?? '–'}
        </span>
      )}
      {!readOnly && isAdmin && (
        editing ? (
          <div className="performance-dashboard__actions">
            <button type="button" className="btn btn--primary btn--small" onClick={handleSave} disabled={saving}>
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
            <button type="button" className="btn btn--outline btn--small" onClick={handleCancelEdit}>
              Abbrechen
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn--outline btn--small" onClick={handleStartEdit}>
            Bearbeiten
          </button>
        )
      )}
    </div>
  );

  return (
    <>
      {headerMetaAndActions}
      <div className="performance-dashboard performance-dashboard__content">
      {!metaInHeader && (
        <div className="performance-dashboard__header">
          <div className="performance-dashboard__meta">
            {editing && !readOnly && isAdmin ? (
              <>
                <label className="performance-dashboard__meta-item">
                  <strong>Stand der Daten</strong>
                  <input type="text" className="performance-dashboard__meta-input" value={editData?.dataStatus ?? ''} onChange={(e) => updateEdit('dataStatus', e.target.value)} />
                </label>
                <label className="performance-dashboard__meta-item">
                  <strong>Resttage im Monat</strong>
                  <input type="number" className="performance-dashboard__meta-input" value={editData?.resttage ?? ''} onChange={(e) => updateEdit('resttage', parseInt(e.target.value, 10) || 0)} />
                </label>
              </>
            ) : (
              <>
                <span className="performance-dashboard__meta-item">
                  <strong>Stand der Daten</strong> {m?.dataStatus ?? '–'}
                </span>
                <span className="performance-dashboard__meta-item">
                  <strong>Resttage im Monat</strong> {m?.resttage ?? m?.workingDays ?? '–'}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      <div className="performance-dashboard__table-wrapper">
        <section className="performance-dashboard__section">
          <div className="performance-dashboard__section-label">Monatsziel</div>
          <div className="performance-dashboard__table-card">
            {showRowControls && (
              <div className="performance-dashboard__table-toolbar">
                <button type="button" className="btn btn--outline btn--small" onClick={addMonatRow}>
                  + Zeile
                </button>
              </div>
            )}
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
                {monatKeysOrdered.map((key, idx) => {
                  const row = mo[key] || {};
                  const kind = getMonatRowKind(key, row);
                  const label = getMonatRowLabel(key, row);
                  const isPercent = isPercentMonatKind(kind);
                  const status = getMonatStatus(kind, row);
                  const isDelta = kind === 'delta';
                  return (
                    <tr key={key}>
                      <td className="performance-dashboard__cell-label performance-dashboard__cell-label--stack">
                        {showRowControls ? (
                          <div className="performance-dashboard__row-editor">
                            <div className="performance-dashboard__row-move">
                              <button type="button" className="performance-dashboard__row-move-btn" aria-label="Nach oben" disabled={idx === 0} onClick={() => moveMonatRow(key, 'up')}>
                                ↑
                              </button>
                              <button type="button" className="performance-dashboard__row-move-btn" aria-label="Nach unten" disabled={idx >= monatKeysOrdered.length - 1} onClick={() => moveMonatRow(key, 'down')}>
                                ↓
                              </button>
                              <button type="button" className="performance-dashboard__row-move-btn performance-dashboard__row-move-btn--danger" aria-label="Zeile entfernen" disabled={monatKeysOrdered.length <= 1} onClick={() => removeMonatRow(key)}>
                                ×
                              </button>
                            </div>
                            <input type="text" className="performance-dashboard__cell-input performance-dashboard__row-label-input" value={row?.label ?? ''} placeholder={LEGACY_MONAT_LABELS[key] || 'Bezeichnung'} onChange={(e) => updateEdit(`monatsziel.${key}.label`, e.target.value)} />
                            <select className="performance-dashboard__row-kind" value={kind} onChange={(e) => updateEdit(`monatsziel.${key}.kind`, e.target.value)} aria-label="Zeilentyp">
                              <option value="delta">Zahlen (Delta / Hochrechnung)</option>
                              <option value="percentGt">Prozent ≥ Ziel</option>
                              <option value="percentLt">Prozent ≤ Ziel</option>
                              <option value="manual">Nur Status (manuell)</option>
                            </select>
                          </div>
                        ) : (
                          label
                        )}
                      </td>
                      <td>
                        {showRowControls ? (
                          <input type="number" className="performance-dashboard__cell-input" value={row?.deltaZuGestern ?? ''} onChange={(e) => updateEdit(`monatsziel.${key}.deltaZuGestern`, e.target.value === '' ? null : parseInt(e.target.value, 10) || 0)} />
                        ) : isDelta ? (row?.deltaZuGestern ?? '–') : (row?.deltaZuGestern != null ? row.deltaZuGestern : '–')}
                      </td>
                      <td>
                        {showRowControls ? (
                          <input type="number" step={isPercent ? '0.01' : '1'} className="performance-dashboard__cell-input" value={row?.aktuell ?? ''} onChange={(e) => updateEdit(`monatsziel.${key}.aktuell`, isPercent ? parseFloat(e.target.value) || 0 : parseInt(e.target.value, 10) || 0)} />
                        ) : row?.aktuell != null ? (isPercent ? `${Number(row.aktuell).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : row.aktuell) : '–'}
                      </td>
                      <td>
                        {showRowControls ? (
                          <input type="number" className="performance-dashboard__cell-input" value={row?.hochrechnung ?? ''} onChange={(e) => updateEdit(`monatsziel.${key}.hochrechnung`, e.target.value === '' ? null : parseInt(e.target.value, 10) || 0)} />
                        ) : isDelta ? (row?.hochrechnung ?? '–') : (row?.hochrechnung != null ? row.hochrechnung : '–')}
                      </td>
                      <td>
                        {showRowControls ? (
                          <input type="text" className="performance-dashboard__cell-input" value={row?.ziel ?? ''} onChange={(e) => updateEdit(`monatsziel.${key}.ziel`, e.target.value)} />
                        ) : (row?.ziel ?? '–')}
                      </td>
                      <td>
                        {showRowControls ? (
                          isDelta ? (
                            <input type="number" className="performance-dashboard__cell-input" value={row?.deltaHochrechnung ?? ''} onChange={(e) => updateEdit(`monatsziel.${key}.deltaHochrechnung`, e.target.value === '' ? null : parseInt(e.target.value, 10) || 0)} />
                          ) : (
                            <input type="text" className="performance-dashboard__cell-input" value={row?.statusOverride ?? ''} onChange={(e) => updateEdit(`monatsziel.${key}.statusOverride`, e.target.value)} />
                          )
                        ) : (
                          <span className={`performance-dashboard__status performance-dashboard__status--${status.ok === true ? 'ok' : status.ok === false ? 'warn' : 'neutral'}`}>
                            {status.text}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="performance-dashboard__divider" />

        <section className="performance-dashboard__section">
          <div className="performance-dashboard__section-label">Quartalsziel</div>
          <div className="performance-dashboard__table-card">
            {showRowControls && (
              <div className="performance-dashboard__table-toolbar">
                <button type="button" className="btn btn--outline btn--small" onClick={addQuartalRow}>
                  + Zeile
                </button>
              </div>
            )}
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
                {quartalKeysOrdered.map((key, idx) => {
                  const row = qo[key] || {};
                  const label = getQuartalRowLabel(key, row);
                  const status = getQuartalStatus(row);
                  return (
                    <tr key={key}>
                      <td className="performance-dashboard__cell-label performance-dashboard__cell-label--stack">
                        {showRowControls ? (
                          <div className="performance-dashboard__row-editor">
                            <div className="performance-dashboard__row-move">
                              <button type="button" className="performance-dashboard__row-move-btn" aria-label="Nach oben" disabled={idx === 0} onClick={() => moveQuartalRow(key, 'up')}>
                                ↑
                              </button>
                              <button type="button" className="performance-dashboard__row-move-btn" aria-label="Nach unten" disabled={idx >= quartalKeysOrdered.length - 1} onClick={() => moveQuartalRow(key, 'down')}>
                                ↓
                              </button>
                              <button type="button" className="performance-dashboard__row-move-btn performance-dashboard__row-move-btn--danger" aria-label="Zeile entfernen" disabled={quartalKeysOrdered.length <= 1} onClick={() => removeQuartalRow(key)}>
                                ×
                              </button>
                            </div>
                            <input type="text" className="performance-dashboard__cell-input performance-dashboard__row-label-input" value={row?.label ?? ''} placeholder={LEGACY_QUARTAL_LABELS[key] || 'Bezeichnung'} onChange={(e) => updateEdit(`quartalsziel.${key}.label`, e.target.value)} />
                          </div>
                        ) : (
                          label
                        )}
                      </td>
                      <td>
                        {showRowControls ? (
                          <input type="number" className="performance-dashboard__cell-input" value={row?.vormonate ?? row?.letzterMonat ?? ''} onChange={(e) => updateEdit(`quartalsziel.${key}.vormonate`, parseInt(e.target.value, 10) || 0)} />
                        ) : (row?.vormonate ?? row?.letzterMonat ?? '–')}
                      </td>
                      <td>
                        {showRowControls ? (
                          <input type="number" className="performance-dashboard__cell-input" value={row?.aktuell ?? ''} onChange={(e) => updateEdit(`quartalsziel.${key}.aktuell`, parseInt(e.target.value, 10) || 0)} />
                        ) : (row?.aktuell ?? '–')}
                      </td>
                      <td>
                        {showRowControls ? (
                          <input type="number" className="performance-dashboard__cell-input" value={row?.gesamt ?? row?.hochrechnung ?? ''} onChange={(e) => updateEdit(`quartalsziel.${key}.gesamt`, parseInt(e.target.value, 10) || 0)} />
                        ) : (row?.gesamt ?? row?.hochrechnung ?? '–')}
                      </td>
                      <td>
                        {showRowControls ? (
                          <input type="text" className="performance-dashboard__cell-input" value={row?.ziel ?? ''} onChange={(e) => updateEdit(`quartalsziel.${key}.ziel`, e.target.value)} />
                        ) : (row?.ziel ?? '–')}
                      </td>
                      <td>
                        {showRowControls ? (
                          <input type="text" className="performance-dashboard__cell-input" value={row?.rest ?? row?.fehlen ?? ''} onChange={(e) => updateEdit(`quartalsziel.${key}.rest`, e.target.value)} />
                        ) : (
                          <span className={`performance-dashboard__status performance-dashboard__status--${status.ok ? 'ok' : 'warn'}`}>
                            {status.text}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {((notizenDeAnzeige || notizenArAnzeige) || (!readOnly && isAdmin)) && (
          <div className="performance-dashboard__notizen">
            <div className="performance-dashboard__notizen-block performance-dashboard__notizen-block--de">
              {!readOnly && isAdmin && editing ? (
                <textarea
                  id="perf-notizen-de"
                  className="performance-dashboard__notizen-input"
                  value={editData?.notizenDe ?? ''}
                  onChange={(e) => updateEdit('notizenDe', e.target.value)}
                  rows={2}
                  aria-label="Notizen Deutsch"
                  lang="de"
                />
              ) : (
                <div className="performance-dashboard__notizen-text" lang="de">
                  {notizenDeAnzeige || <span className="performance-dashboard__notizen-placeholder">Keine Notizen.</span>}
                </div>
              )}
            </div>
            <div className="performance-dashboard__notizen-block performance-dashboard__notizen-block--ar">
              {!readOnly && isAdmin && editing ? (
                <textarea
                  id="perf-notizen-ar"
                  className="performance-dashboard__notizen-input performance-dashboard__notizen-input--rtl"
                  value={editData?.notizenAr ?? ''}
                  onChange={(e) => updateEdit('notizenAr', e.target.value)}
                  rows={2}
                  aria-label="Notizen Arabisch"
                  dir="rtl"
                  lang="ar"
                />
              ) : (
                <div className="performance-dashboard__notizen-text performance-dashboard__notizen-text--rtl" dir="rtl" lang="ar">
                  {notizenArAnzeige || <span className="performance-dashboard__notizen-placeholder">Keine Notizen.</span>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {!readOnly && isAdmin && !metaInHeader && (
        <div className="performance-dashboard__footer">
          {!editing ? (
            <button type="button" className="btn btn--outline btn--small" onClick={handleStartEdit}>
              Bearbeiten
            </button>
          ) : (
            <div className="performance-dashboard__actions">
              <button type="button" className="btn btn--primary btn--small" onClick={handleSave} disabled={saving}>
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
              <button type="button" className="btn btn--outline btn--small" onClick={handleCancelEdit}>
                Abbrechen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
};

export default PerformanceDashboard;
</think>


<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
StrReplace