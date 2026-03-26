import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getVouchersApi } from '../../services/api';
import { canAccessVoucherList } from '../../utils/roles';
import Login from '../Auth/Login';
import './Voucher.scss';

const Voucher = () => {
  const { user } = useAuth();
  const [demo, setDemo] = useState([]);
  const [uploaded, setUploaded] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id || !canAccessVoucherList(user)) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getVouchersApi();
      setDemo(Array.isArray(data.demo) ? data.demo : []);
      setUploaded(Array.isArray(data.uploaded) ? data.uploaded : []);
      setUpdatedAt(data.updatedAt ?? null);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Daten konnten nicht geladen werden.');
      setDemo([]);
      setUploaded([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role, user?.einsatz_ort]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) {
    return <Login />;
  }

  if (!canAccessVoucherList(user)) {
    return (
      <div className="voucher-page">
        <div className="card">
          <div className="card-body">
            <p>
              Die Voucher-Übersicht ist für den Einsatzort Zentrale nicht vorgesehen. Zugang haben weiterhin nur
              Administratoren und Büro-Mitarbeitende.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="voucher-page">
      <header className="voucher-page__intro">
        <h1 className="voucher-page__title">Voucher</h1>
      </header>

      {loading ? (
        <p>Voucher-Daten werden geladen…</p>
      ) : error ? (
        <p className="text-error">{error}</p>
      ) : (
        <>
          <section className="card voucher-section">
            <div className="card-body">
              <h2 className="card-title">Beispiele (Demo)</h2>
              <p className="voucher-meta">Feste Beispielzeilen zur Orientierung – unabhängig von Excel-Uploads.</p>
              <div className="voucher-table-wrap">
                <table className="voucher-table">
                  <thead>
                    <tr>
                      <th>Anbieter</th>
                      <th>Verlauf</th>
                      <th>Voucher-Art</th>
                      <th>Nummer</th>
                      <th>Stellen</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {demo.map((row, idx) => (
                      <tr key={`demo-${idx}-${row.code}`}>
                        <td>{row.provider}</td>
                        <td>{row.verlauf}</td>
                        <td>{row.voucherType}</td>
                        <td className="voucher-code">{row.code}</td>
                        <td>{row.digitLength}</td>
                        <td>
                          <span className="voucher-badge-demo">Demo</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {uploaded.length > 0 && (
            <section className="card voucher-section">
              <div className="card-body">
                <h2 className="card-title">Aus Excel-Upload</h2>
                {updatedAt && (
                  <p className="voucher-meta">
                    Stand:{' '}
                    {new Date(updatedAt).toLocaleString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
                <div className="voucher-table-wrap">
                  <table className="voucher-table">
                    <thead>
                      <tr>
                        {(uploaded[0].columnOrder || Object.keys(uploaded[0].rowData || {})).map((col) => (
                          <th key={col}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {uploaded.map((row, rIdx) => {
                        const cols = row.columnOrder || Object.keys(row.rowData || {});
                        return (
                          <tr key={`up-${rIdx}-${row.row}-${row.sheet}`}>
                            {cols.map((col) => (
                              <td key={col}>{row.rowData?.[col] ?? '–'}</td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default Voucher;
