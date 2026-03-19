import { useState, useEffect } from 'react';
import { getPerformanceMetrics, savePerformanceMetrics } from '../../services/dashboard.service';
import './PerformanceDashboard.scss';

const DEFAULT_METRICS = {
  dataStatus: '05.03.2026',
  workingDays: 26,
  monatsziel: {
    postpaid: { aktuell: 157, hochrechnung: 1999, ziel: 2000 },
    vvl: { aktuell: 132, hochrechnung: 1144, ziel: 1400 },
    permissionQuote: { aktuell: 85.37, ziel: '>75%' },
    rotationalChurn: { aktuell: 5.71, ziel: '<6%' },
    poXVvl: { aktuell: 18.05, ziel: '>16%' }
  },
  quartalsziel: {
    prepaid: { letzterMonat: 181, aktuell: 0, hochrechnung: null, ziel: 180, status: 'Erledigt. Keine Prepaid mehr' },
    dsl: { letzterMonat: 197, aktuell: 4, hochrechnung: 187, ziel: 300, fehlen: 99 },
    o2tv: { letzterMonat: 95, aktuell: 3, hochrechnung: 98, ziel: 162, fehlen: 64 }
  }
};

const PerformanceDashboard = ({ isAdmin }) => {
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
          setMetrics({ ...DEFAULT_METRICS, ...res.data.metrics });
        }
      } catch {
        // use defaults
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

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

  const calcDelta = (hochrechnung, ziel) => {
    if (hochrechnung == null || ziel == null) return null;
    const d = Number(hochrechnung) - Number(ziel);
    return d;
  };

  const isOk = (type, aktuell, ziel) => {
    if (!ziel || typeof ziel !== 'string') return null;
    const z = ziel.trim();
    if (z.startsWith('>')) {
      const threshold = parseFloat(z.slice(1).replace('%', '').replace(',', '.'));
      return Number(aktuell) >= threshold;
    }
    if (z.startsWith('<')) {
      const threshold = parseFloat(z.slice(1).replace('%', '').replace(',', '.'));
      return Number(aktuell) < threshold;
    }
    return null;
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

  return (
    <div className="performance-dashboard">
      <div className="performance-dashboard__header">
        <div className="performance-dashboard__meta">
          <span className="performance-dashboard__meta-item">
            <strong>Stückzahlen Datenbestand:</strong> {m?.dataStatus ?? '–'}
          </span>
          <span className="performance-dashboard__meta-item">
            <strong>Arbeitstage im Monat:</strong> {m?.workingDays ?? '–'}
          </span>
        </div>
        {isAdmin && !editing && (
          <button type="button" className="btn btn--primary btn--small" onClick={handleStartEdit}>
            Bearbeiten
          </button>
        )}
        {isAdmin && editing && (
          <div className="performance-dashboard__actions">
            <button
              type="button"
              className="btn btn--primary btn--small"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
            <button type="button" className="btn btn--secondary btn--small" onClick={handleCancelEdit}>
              Abbrechen
            </button>
          </div>
        )}
      </div>

      <div className="performance-dashboard__grid">
        {/* Monatsziel */}
        <section className="performance-dashboard__section">
          <h3 className="performance-dashboard__section-title">Monatsziel</h3>
          <div className="performance-dashboard__cards">
            <div className="metric-card metric-card--postpaid">
              <div className="metric-card__label">Postpaid</div>
              <div className="metric-card__value">{mo.postpaid?.aktuell ?? '–'}</div>
              <div className="metric-card__row">
                <span>Hochrechnung:</span>
                <span>{mo.postpaid?.hochrechnung ?? '–'}</span>
              </div>
              <div className="metric-card__row">
                <span>Ziel AZ:</span>
                <span>{mo.postpaid?.ziel ?? '–'}</span>
              </div>
              <div className={`metric-card__delta ${calcDelta(mo.postpaid?.hochrechnung, mo.postpaid?.ziel) >= 0 ? 'metric-card__delta--ok' : 'metric-card__delta--warn'}`}>
                Δ {calcDelta(mo.postpaid?.hochrechnung, mo.postpaid?.ziel) ?? '–'}
              </div>
            </div>

            <div className="metric-card metric-card--vvl">
              <div className="metric-card__label">VVL</div>
              <div className="metric-card__value">{mo.vvl?.aktuell ?? '–'}</div>
              <div className="metric-card__row">
                <span>Hochrechnung:</span>
                <span>{mo.vvl?.hochrechnung ?? '–'}</span>
              </div>
              <div className="metric-card__row">
                <span>Ziel AZ:</span>
                <span>{mo.vvl?.ziel ?? '–'}</span>
              </div>
              <div className={`metric-card__delta ${calcDelta(mo.vvl?.hochrechnung, mo.vvl?.ziel) >= 0 ? 'metric-card__delta--ok' : 'metric-card__delta--warn'}`}>
                Δ {calcDelta(mo.vvl?.hochrechnung, mo.vvl?.ziel) ?? '–'}
              </div>
            </div>

            <div className="metric-card metric-card--percent">
              <div className="metric-card__label">Permission Quote</div>
              <div className="metric-card__value">{mo.permissionQuote?.aktuell ?? '–'}%</div>
              <div className="metric-card__row">
                <span>Ziel AZ:</span>
                <span>{mo.permissionQuote?.ziel ?? '–'}</span>
              </div>
              <div className={`metric-card__delta ${isOk('>', mo.permissionQuote?.aktuell, mo.permissionQuote?.ziel) ? 'metric-card__delta--ok' : 'metric-card__delta--warn'}`}>
                {isOk('>', mo.permissionQuote?.aktuell, mo.permissionQuote?.ziel) ? 'OK' : '–'}
              </div>
            </div>

            <div className="metric-card metric-card--percent">
              <div className="metric-card__label">Rotational Churn</div>
              <div className="metric-card__value">{mo.rotationalChurn?.aktuell ?? '–'}%</div>
              <div className="metric-card__row">
                <span>Ziel AZ:</span>
                <span>{mo.rotationalChurn?.ziel ?? '–'}</span>
              </div>
              <div className={`metric-card__delta ${isOk('<', mo.rotationalChurn?.aktuell, mo.rotationalChurn?.ziel) ? 'metric-card__delta--ok' : 'metric-card__delta--warn'}`}>
                {isOk('<', mo.rotationalChurn?.aktuell, mo.rotationalChurn?.ziel) ? 'OK' : '–'}
              </div>
            </div>

            <div className="metric-card metric-card--percent">
              <div className="metric-card__label">PO-X-VVL</div>
              <div className="metric-card__value">{mo.poXVvl?.aktuell ?? '–'}%</div>
              <div className="metric-card__row">
                <span>Ziel AZ:</span>
                <span>{mo.poXVvl?.ziel ?? '–'}</span>
              </div>
              <div className={`metric-card__delta ${isOk('>', mo.poXVvl?.aktuell, mo.poXVvl?.ziel) ? 'metric-card__delta--ok' : 'metric-card__delta--warn'}`}>
                {isOk('>', mo.poXVvl?.aktuell, mo.poXVvl?.ziel) ? 'OK' : '–'}
              </div>
            </div>
          </div>
        </section>

        {/* Quartalsziel */}
        <section className="performance-dashboard__section">
          <h3 className="performance-dashboard__section-title">Quartalsziel</h3>
          <div className="performance-dashboard__cards">
            <div className="metric-card metric-card--quarter">
              <div className="metric-card__label">Prepaid</div>
              <div className="metric-card__row metric-card__row--muted">
                <span>Letzter Monat:</span>
                <span>{qo.prepaid?.letzterMonat ?? '–'}</span>
              </div>
              <div className="metric-card__value">{qo.prepaid?.aktuell ?? '–'}</div>
              <div className="metric-card__row">
                <span>Ziel AZ:</span>
                <span>{qo.prepaid?.ziel ?? '–'}</span>
              </div>
              <div className="metric-card__status metric-card__status--done">
                {qo.prepaid?.status ?? '–'}
              </div>
            </div>

            <div className="metric-card metric-card--quarter">
              <div className="metric-card__label">DSL</div>
              <div className="metric-card__row metric-card__row--muted">
                <span>Letzter Monat:</span>
                <span>{qo.dsl?.letzterMonat ?? '–'}</span>
              </div>
              <div className="metric-card__value">{qo.dsl?.aktuell ?? '–'}</div>
              <div className="metric-card__row">
                <span>Hochrechnung Quartal:</span>
                <span>{qo.dsl?.hochrechnung ?? '–'}</span>
              </div>
              <div className="metric-card__row">
                <span>Ziel AZ:</span>
                <span>{qo.dsl?.ziel ?? '–'}</span>
              </div>
              <div className="metric-card__status metric-card__status--missing">
                Aktuell fehlen: {qo.dsl?.fehlen ?? '–'}
              </div>
            </div>

            <div className="metric-card metric-card--quarter">
              <div className="metric-card__label">o2 TV</div>
              <div className="metric-card__row metric-card__row--muted">
                <span>Letzter Monat:</span>
                <span>{qo.o2tv?.letzterMonat ?? '–'}</span>
              </div>
              <div className="metric-card__value">{qo.o2tv?.aktuell ?? '–'}</div>
              <div className="metric-card__row">
                <span>Hochrechnung Quartal:</span>
                <span>{qo.o2tv?.hochrechnung ?? '–'}</span>
              </div>
              <div className="metric-card__row">
                <span>Ziel AZ:</span>
                <span>{qo.o2tv?.ziel ?? '–'}</span>
              </div>
              <div className="metric-card__status metric-card__status--missing">
                Aktuell fehlen: {qo.o2tv?.fehlen ?? '–'}
              </div>
            </div>
          </div>
        </section>
      </div>

      {editing && isAdmin && (
        <div className="performance-dashboard__edit-form">
          <h4>Werte bearbeiten</h4>
          <div className="performance-dashboard__edit-grid">
            <label>
              Stückzahlen Datenbestand
              <input
                type="text"
                value={editData?.dataStatus ?? ''}
                onChange={(e) => updateEdit('dataStatus', e.target.value)}
              />
            </label>
            <label>
              Arbeitstage
              <input
                type="number"
                value={editData?.workingDays ?? ''}
                onChange={(e) => updateEdit('workingDays', parseInt(e.target.value, 10) || 0)}
              />
            </label>
            <label>
              Postpaid Aktuell
              <input
                type="number"
                value={editData?.monatsziel?.postpaid?.aktuell ?? ''}
                onChange={(e) => updateEdit('monatsziel.postpaid.aktuell', parseInt(e.target.value, 10) || 0)}
              />
            </label>
            <label>
              Postpaid Hochrechnung
              <input
                type="number"
                value={editData?.monatsziel?.postpaid?.hochrechnung ?? ''}
                onChange={(e) => updateEdit('monatsziel.postpaid.hochrechnung', parseInt(e.target.value, 10) || 0)}
              />
            </label>
            <label>
              Postpaid Ziel
              <input
                type="number"
                value={editData?.monatsziel?.postpaid?.ziel ?? ''}
                onChange={(e) => updateEdit('monatsziel.postpaid.ziel', parseInt(e.target.value, 10) || 0)}
              />
            </label>
            <label>
              VVL Aktuell
              <input
                type="number"
                value={editData?.monatsziel?.vvl?.aktuell ?? ''}
                onChange={(e) => updateEdit('monatsziel.vvl.aktuell', parseInt(e.target.value, 10) || 0)}
              />
            </label>
            <label>
              VVL Hochrechnung
              <input
                type="number"
                value={editData?.monatsziel?.vvl?.hochrechnung ?? ''}
                onChange={(e) => updateEdit('monatsziel.vvl.hochrechnung', parseInt(e.target.value, 10) || 0)}
              />
            </label>
            <label>
              VVL Ziel
              <input
                type="number"
                value={editData?.monatsziel?.vvl?.ziel ?? ''}
                onChange={(e) => updateEdit('monatsziel.vvl.ziel', parseInt(e.target.value, 10) || 0)}
              />
            </label>
            <label>
              Permission Quote Aktuell (%)
              <input
                type="number"
                step="0.01"
                value={editData?.monatsziel?.permissionQuote?.aktuell ?? ''}
                onChange={(e) => updateEdit('monatsziel.permissionQuote.aktuell', parseFloat(e.target.value) || 0)}
              />
            </label>
            <label>
              Rotational Churn Aktuell (%)
              <input
                type="number"
                step="0.01"
                value={editData?.monatsziel?.rotationalChurn?.aktuell ?? ''}
                onChange={(e) => updateEdit('monatsziel.rotationalChurn.aktuell', parseFloat(e.target.value) || 0)}
              />
            </label>
            <label>
              PO-X-VVL Aktuell (%)
              <input
                type="number"
                step="0.01"
                value={editData?.monatsziel?.poXVvl?.aktuell ?? ''}
                onChange={(e) => updateEdit('monatsziel.poXVvl.aktuell', parseFloat(e.target.value) || 0)}
              />
            </label>
            <label>
              DSL Aktuell
              <input
                type="number"
                value={editData?.quartalsziel?.dsl?.aktuell ?? ''}
                onChange={(e) => updateEdit('quartalsziel.dsl.aktuell', parseInt(e.target.value, 10) || 0)}
              />
            </label>
            <label>
              DSL Hochrechnung
              <input
                type="number"
                value={editData?.quartalsziel?.dsl?.hochrechnung ?? ''}
                onChange={(e) => updateEdit('quartalsziel.dsl.hochrechnung', parseInt(e.target.value, 10) || 0)}
              />
            </label>
            <label>
              DSL Ziel
              <input
                type="number"
                value={editData?.quartalsziel?.dsl?.ziel ?? ''}
                onChange={(e) => updateEdit('quartalsziel.dsl.ziel', parseInt(e.target.value, 10) || 0)}
              />
            </label>
            <label>
              DSL Fehlen
              <input
                type="number"
                value={editData?.quartalsziel?.dsl?.fehlen ?? ''}
                onChange={(e) => updateEdit('quartalsziel.dsl.fehlen', parseInt(e.target.value, 10) || 0)}
              />
            </label>
            <label>
              o2 TV Aktuell
              <input
                type="number"
                value={editData?.quartalsziel?.o2tv?.aktuell ?? ''}
                onChange={(e) => updateEdit('quartalsziel.o2tv.aktuell', parseInt(e.target.value, 10) || 0)}
              />
            </label>
            <label>
              o2 TV Hochrechnung
              <input
                type="number"
                value={editData?.quartalsziel?.o2tv?.hochrechnung ?? ''}
                onChange={(e) => updateEdit('quartalsziel.o2tv.hochrechnung', parseInt(e.target.value, 10) || 0)}
              />
            </label>
            <label>
              o2 TV Ziel
              <input
                type="number"
                value={editData?.quartalsziel?.o2tv?.ziel ?? ''}
                onChange={(e) => updateEdit('quartalsziel.o2tv.ziel', parseInt(e.target.value, 10) || 0)}
              />
            </label>
            <label>
              o2 TV Fehlen
              <input
                type="number"
                value={editData?.quartalsziel?.o2tv?.fehlen ?? ''}
                onChange={(e) => updateEdit('quartalsziel.o2tv.fehlen', parseInt(e.target.value, 10) || 0)}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;
