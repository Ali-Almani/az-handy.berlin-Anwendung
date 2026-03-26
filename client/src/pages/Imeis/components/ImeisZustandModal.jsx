import { useMemo } from 'react';

const CHART_COLORS = ['#005d95', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1', '#fd7e14', '#20c997', '#e83e8c', '#6c757d'];

const flattenZustandRows = (zustandData) => {
  const rows = [];
  if (!zustandData?.manufacturers?.length) return rows;
  for (const m of zustandData.manufacturers) {
    for (const v of m.versions) {
      for (const vr of v.variants) {
        for (const g of vr.gbs) {
          let model = v.version;
          if (vr.variant && vr.variant !== 'Standard') model += ` ${vr.variant}`;
          if (g.gb && g.gb !== 'Unbekannt') model += ` ${g.gb}`;
          rows.push({
            manufacturer: m.manufacturer,
            model: model.trim(),
            count: g.count,
            key: `${m.manufacturer}-${v.version}-${vr.variant}-${g.gb}`
          });
        }
      }
    }
  }
  rows.sort((a, b) => b.count - a.count);
  return rows;
};

/** Donut-Segment im SVG (Winkel von oben im Uhrzeigersinn) */
const describeDonutSlice = (cx, cy, rOuter, rInner, a0, a1) => {
  const xo0 = cx + rOuter * Math.cos(a0);
  const yo0 = cy + rOuter * Math.sin(a0);
  const xo1 = cx + rOuter * Math.cos(a1);
  const yo1 = cy + rOuter * Math.sin(a1);
  const xi0 = cx + rInner * Math.cos(a0);
  const yi0 = cy + rInner * Math.sin(a0);
  const xi1 = cx + rInner * Math.cos(a1);
  const yi1 = cy + rInner * Math.sin(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return [
    'M', xo0, yo0,
    'A', rOuter, rOuter, 0, large, 1, xo1, yo1,
    'L', xi1, yi1,
    'A', rInner, rInner, 0, large, 0, xi0, yi0,
    'Z'
  ].join(' ');
};

const ZustandDistributionChart = ({ manufacturers, total }) => {
  const cx = 50;
  const cy = 50;
  const rOuter = 38;
  const rInner = 23;

  if (!total || !manufacturers?.length) return null;

  if (manufacturers.length === 1) {
    const color = CHART_COLORS[0];
    return (
      <svg className="imeis-zustand-chart__svg" viewBox="0 0 100 100" aria-hidden>
        <circle cx={cx} cy={cy} r={rOuter} fill={color} />
        <circle cx={cx} cy={cy} r={rInner} fill="#fff" />
      </svg>
    );
  }

  let cumulative = 0;
  const paths = manufacturers.map((m, i) => {
    const frac = m.total / total;
    const a0 = -Math.PI / 2 + cumulative * 2 * Math.PI;
    cumulative += frac;
    const a1 = -Math.PI / 2 + cumulative * 2 * Math.PI;
    if (frac <= 0) return null;
    const d = describeDonutSlice(cx, cy, rOuter, rInner, a0, a1);
    return (
      <path
        key={m.manufacturer}
        d={d}
        fill={CHART_COLORS[i % CHART_COLORS.length]}
        stroke="#fff"
        strokeWidth="0.5"
      />
    );
  });

  return (
    <svg className="imeis-zustand-chart__svg" viewBox="0 0 100 100" aria-hidden>
      {paths}
    </svg>
  );
};

const ImeisZustandModal = ({ isOpen, onClose, zustandData, loading, isAdmin = false }) => {
  const tableRows = useMemo(() => flattenZustandRows(zustandData), [zustandData]);
  const chartTotal = zustandData?.total ?? 0;
  const manufacturers = zustandData?.manufacturers ?? [];

  if (!isOpen) return null;

  const modalClassName = `imeis-history-modal imeis-zustand-modal${isAdmin ? ' imeis-zustand-modal--admin' : ''}`;

  return (
    <div className="imeis-history-modal-overlay" onClick={onClose} role="presentation">
      <div
        className={modalClassName}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="imeis-zustand-title"
        aria-modal="true"
      >
        <div className="imeis-history-modal-header imeis-zustand-modal__header">
          <h3 id="imeis-zustand-title">Bestand</h3>
          <button type="button" onClick={onClose} className="imeis-history-modal-close" aria-label="Schließen">
            ×
          </button>
        </div>
        <div className="imeis-history-modal-body imeis-zustand-modal__body">
          {loading ? (
            <div className="imeis-zustand-loading">
              <p className="imeis-zustand-loading__text">Lade Daten…</p>
              <div className="imeis-zustand-loading__spinner" aria-hidden />
            </div>
          ) : !zustandData || manufacturers.length === 0 ? (
            <p className="imeis-zustand-empty">Keine IMEIs gefunden</p>
          ) : (
            <>
              {isAdmin ? (
                <div className="imeis-zustand-chart-panel imeis-zustand-chart-panel--admin">
                  <div className="imeis-zustand-chart__meta imeis-zustand-chart__meta--admin">
                    <span className="imeis-zustand-chart__total-label">Gesamt</span>
                    <strong className="imeis-zustand-chart__total-value">{chartTotal} IMEIs</strong>
                    <span className="imeis-zustand-chart__hint">Verteilung nach Hersteller</span>
                  </div>
                  <table className="imeis-zustand-mfr-table">
                    <thead>
                      <tr>
                        <th scope="col">Hersteller</th>
                        <th scope="col">Anzahl</th>
                        <th scope="col">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {manufacturers.map((m, i) => {
                        const pct = chartTotal > 0 ? ((m.total / chartTotal) * 100).toFixed(1) : '0.0';
                        return (
                          <tr key={m.manufacturer}>
                            <td>
                              <span className="imeis-zustand-mfr-table__name-cell">
                                <span
                                  className="imeis-zustand-mfr-table__swatch"
                                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                                  aria-hidden
                                />
                                {m.manufacturer}
                              </span>
                            </td>
                            <td>{m.total}</td>
                            <td>{pct}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="imeis-zustand-chart-panel">
                  <div className="imeis-zustand-chart-donut">
                    <ZustandDistributionChart manufacturers={manufacturers} total={chartTotal} />
                  </div>
                  <div className="imeis-zustand-chart__meta">
                    <span className="imeis-zustand-chart__total-label">Gesamt</span>
                    <strong className="imeis-zustand-chart__total-value">{chartTotal} IMEIs</strong>
                    <span className="imeis-zustand-chart__hint">Verteilung nach Hersteller</span>
                  </div>
                  <ul className="imeis-zustand-legend">
                    {manufacturers.map((m, i) => {
                      const pct = chartTotal > 0 ? ((m.total / chartTotal) * 100).toFixed(1) : '0.0';
                      return (
                        <li key={m.manufacturer} className="imeis-zustand-legend__item">
                          <span
                            className="imeis-zustand-legend__swatch"
                            style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                          />
                          <span className="imeis-zustand-legend__name">{m.manufacturer}</span>
                          <span className="imeis-zustand-legend__stats">
                            {m.total} ({pct}%)
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              <div
                className={
                  isAdmin
                    ? 'imeis-zustand-table-wrap imeis-zustand-table-wrap--admin-grid'
                    : 'imeis-zustand-table-wrap'
                }
              >
                {isAdmin ? (
                  <div className="imeis-zustand-grid" role="list">
                    {tableRows.map((row) => (
                      <div key={row.key} className="imeis-zustand-grid__cell" role="listitem">
                        <span className="imeis-zustand-grid__model">{row.model || '–'}</span>
                        <span className="imeis-zustand-grid__count">{row.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <table className="imeis-zustand-table">
                    <thead>
                      <tr>
                        <th scope="col" className="imeis-zustand-table__head-line">
                          <span>Modell</span>
                          <span className="imeis-zustand-table__head-count">Anzahl</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row) => (
                        <tr key={row.key}>
                          <td className="imeis-zustand-table__line">
                            <span className="imeis-zustand-table__model">{row.model || '–'}</span>
                            <span className="imeis-zustand-table__count">{row.count}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
        <div className="imeis-history-modal-footer imeis-zustand-modal__footer">
          <button type="button" onClick={onClose} className="btn btn--secondary btn--small">
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImeisZustandModal;
