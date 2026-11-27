import { useCallback, useEffect, useState } from 'react';
import { getDiskUsage } from '../../services/dashboard.service';
import './DiskUsagePanel.scss';

function formatCheckedAt(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function DiskUsagePanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      const res = await getDiskUsage();
      setData(res.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Speicher konnte nicht geladen werden.');
      if (!isRefresh) setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const percent = Math.max(0, Math.min(100, Number(data?.usePercent) || 0));
  const level = percent >= 90 ? 'critical' : percent >= 75 ? 'warn' : 'ok';

  return (
    <div className="disk-usage-panel">
      <div className="disk-usage-panel__toolbar">
        <p className="disk-usage-panel__hint">
          Belegung der Systemplatte <code>{data?.path || '/'}</code> auf dem Server.
        </p>
        <button
          type="button"
          className="btn btn--outline btn--small"
          onClick={() => load(true)}
          disabled={loading || refreshing}
        >
          {refreshing ? 'Aktualisiere…' : 'Aktualisieren'}
        </button>
      </div>

      {loading && !data ? <p className="disk-usage-panel__status">Lade Speicher…</p> : null}
      {error ? <p className="text-error">{error}</p> : null}

      {data ? (
        <>
          <div
            className={`disk-usage-panel__meter disk-usage-panel__meter--${level}`}
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label={`Plattenbelegung ${percent} Prozent`}
          >
            <div className="disk-usage-panel__meter-fill" style={{ width: `${percent}%` }} />
          </div>
          <p className="disk-usage-panel__percent">{percent}&nbsp;% belegt</p>
          <dl className="disk-usage-panel__stats">
            <div>
              <dt>Gesamt</dt>
              <dd>{data.totalHuman}</dd>
            </div>
            <div>
              <dt>Belegt</dt>
              <dd>{data.usedHuman}</dd>
            </div>
            <div>
              <dt>Frei</dt>
              <dd>{data.availableHuman}</dd>
            </div>
          </dl>
          {data.checkedAt ? (
            <p className="disk-usage-panel__checked">Stand: {formatCheckedAt(data.checkedAt)}</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
