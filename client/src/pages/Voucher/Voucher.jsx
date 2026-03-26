import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getVouchersApi } from '../../services/api';
import { canAccessVoucherList } from '../../utils/roles';
import Login from '../Auth/Login';
import '../Imeis/Imeis.scss';
import ImeisRateLimitModal from '../Imeis/components/ImeisRateLimitModal';
import VoucherHistoryModal from './components/VoucherHistoryModal';
import { useVoucherCopyHandlers } from './hooks/useVoucherCopyHandlers';
import {
  findVoucherArtKey,
  findNummerKey,
  getRowVoucherArt,
  uniqueTabsForRows,
  buildDisplayColumnOrder,
  getRowNummer
} from './utils/voucherColumns';
import './Voucher.scss';

const Voucher = () => {
  const { user } = useAuth();
  const [uploaded, setUploaded] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copyHistory, setCopyHistory] = useState([]);
  const [copyTimestamps, setCopyTimestamps] = useState([]);
  const [rowActions, setRowActions] = useState({});
  const [historyUndoStack, setHistoryUndoStack] = useState([]);
  const [activeTab, setActiveTab] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState('');
  const [, setCopySuccess] = useState(false);

  const columnOrderFirst = useMemo(() => {
    if (!uploaded.length) return [];
    return uploaded[0].columnOrder?.length ? uploaded[0].columnOrder : Object.keys(uploaded[0].rowData || {});
  }, [uploaded]);

  const voucherArtKey = useMemo(() => findVoucherArtKey(columnOrderFirst), [columnOrderFirst]);
  const nummerKey = useMemo(() => findNummerKey(columnOrderFirst), [columnOrderFirst]);
  const displayCols = useMemo(
    () => buildDisplayColumnOrder(columnOrderFirst, nummerKey),
    [columnOrderFirst, nummerKey]
  );

  const tabs = useMemo(() => {
    if (!uploaded.length) return [];
    if (!voucherArtKey) return ['Alle'];
    return uniqueTabsForRows(uploaded, voucherArtKey);
  }, [uploaded, voucherArtKey]);

  const filteredRows = useMemo(() => {
    if (!uploaded.length) return [];
    if (!voucherArtKey || activeTab === 'Alle') return uploaded;
    return uploaded.filter((r) => getRowVoucherArt(r, voucherArtKey) === activeTab);
  }, [uploaded, voucherArtKey, activeTab]);

  const { handleDropdownSelect, handleUpdateHistoryAction, handleHistoryModalUndo, onRowActionRemove, voucherRowId } =
    useVoucherCopyHandlers({
      user,
      copyHistory,
      setCopyHistory,
      copyTimestamps,
      setCopyTimestamps,
      rowActions,
      setRowActions,
      historyUndoStack,
      setHistoryUndoStack,
      nummerKey,
      voucherArtKey,
      setShowRateLimitModal,
      setRateLimitMessage,
      setCopySuccess
    });

  const load = useCallback(async () => {
    if (!user?.id || !canAccessVoucherList(user)) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getVouchersApi();
      const up = Array.isArray(data.uploaded) ? data.uploaded : [];
      setUploaded(up);
      setUpdatedAt(data.updatedAt ?? null);
      const us = data.userState && typeof data.userState === 'object' ? data.userState : {};
      setCopyHistory(Array.isArray(us.copyHistory) ? us.copyHistory : []);
      setCopyTimestamps(Array.isArray(us.copyTimestamps) ? us.copyTimestamps : []);
      setRowActions(us.rowActions && typeof us.rowActions === 'object' && !Array.isArray(us.rowActions) ? us.rowActions : {});
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Daten konnten nicht geladen werden.');
      setUploaded([]);
      setCopyHistory([]);
      setCopyTimestamps([]);
      setRowActions({});
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role, user?.einsatz_ort]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (tabs.length && (!activeTab || !tabs.includes(activeTab))) {
      setActiveTab(tabs[0]);
    }
  }, [tabs, activeTab]);

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
          {uploaded.length === 0 ? (
            <section className="card voucher-section">
              <div className="card-body">
                <p className="voucher-meta" style={{ margin: 0 }}>
                  Noch keine Voucher-Liste. Administratoren oder das Büro laden eine Excel-Datei unter „Voucher-Upload“
                  hoch.
                </p>
              </div>
            </section>
          ) : (
            <section className="card voucher-section">
              <div className="card-body">
                <div className="voucher-toolbar">
                  <div>
                    <h2 className="card-title">Voucher-Übersicht</h2>
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
                    {!nummerKey && (
                      <p className="voucher-meta voucher-meta--warn">
                        Keine Spalte „Nummer“ (oder „Code“) erkannt – Reservieren ist erst nach passender Excel-Struktur
                        möglich.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn--small imeis-history-btn"
                    onClick={() => setShowHistoryModal(true)}
                  >
                    Verlauf
                  </button>
                </div>

                {tabs.length > 1 && (
                  <div className="voucher-tabs" role="tablist" aria-label="Voucher-Art">
                    {tabs.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === tab}
                        className={`voucher-tab${activeTab === tab ? ' is-active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                )}

                <div className="imeis">
                  <div className="imeis-table-wrapper">
                    <table className="imeis-table">
                      <thead>
                        <tr>
                          {displayCols.map((col) => (
                            <th key={col}>{col === '__aktion__' ? 'Aktion' : col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map((row, rIdx) => {
                          const rowId = voucherRowId(row);
                          const nummer = getRowNummer(row, nummerKey);
                          return (
                            <tr key={`${row.sheet || 's'}-${row.row}-${rIdx}`}>
                              {displayCols.map((col) => {
                                if (col === '__aktion__') {
                                  const canReserve = Boolean(nummerKey && nummer);
                                  return (
                                    <td key="__aktion__" style={{ padding: '0.5rem' }}>
                                      <div className="imeis-row-dropdown-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <input
                                          type="checkbox"
                                          id={`voucher-res-${rowId}`}
                                          checked={rowActions[rowId]?.action === 'reservieren' || false}
                                          disabled={!canReserve}
                                          onChange={async (e) => {
                                            e.stopPropagation();
                                            if (e.target.checked) {
                                              await handleDropdownSelect(row, 'reservieren');
                                            } else {
                                              onRowActionRemove(rowId);
                                            }
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          onMouseDown={(e) => e.stopPropagation()}
                                          style={{ cursor: canReserve ? 'pointer' : 'not-allowed', width: '18px', height: '18px' }}
                                        />
                                        <label
                                          htmlFor={`voucher-res-${rowId}`}
                                          style={{
                                            cursor: canReserve ? 'pointer' : 'not-allowed',
                                            fontSize: '0.9rem',
                                            margin: 0,
                                            userSelect: 'none',
                                            color: canReserve ? 'inherit' : '#999'
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          onMouseDown={(e) => e.stopPropagation()}
                                        >
                                          Reservieren
                                        </label>
                                        {rowActions[rowId] && (
                                          <span style={{ fontSize: '0.75rem', color: '#666' }}>
                                            ({rowActions[rowId].userName})
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  );
                                }
                                const fmt = row.rowDataFormats?.[col];
                                const color = fmt?.textColor || 'inherit';
                                return (
                                  <td
                                    key={col}
                                    style={{
                                      padding: '0.5rem',
                                      color,
                                      fontSize: '0.85rem',
                                      wordBreak: 'break-word'
                                    }}
                                  >
                                    {row.rowData?.[col] != null && String(row.rowData[col]).trim() !== ''
                                      ? row.rowData[col]
                                      : '–'}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <ImeisRateLimitModal
                    isOpen={showRateLimitModal}
                    onClose={() => setShowRateLimitModal(false)}
                    message={rateLimitMessage}
                    canRequestExtra={false}
                  />

                  <VoucherHistoryModal
                    isOpen={showHistoryModal}
                    onClose={() => setShowHistoryModal(false)}
                    copyHistory={copyHistory}
                    onUpdateHistoryAction={handleUpdateHistoryAction}
                    historyUndoStack={historyUndoStack}
                    onUndo={handleHistoryModalUndo}
                  />
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
