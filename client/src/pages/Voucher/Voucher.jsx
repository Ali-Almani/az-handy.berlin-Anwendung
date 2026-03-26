import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getVouchersApi, putVoucherUserStateApi } from '../../services/api';
import { canAccessVoucherList } from '../../utils/roles';
import Login from '../Auth/Login';
import '../Imeis/Imeis.scss';
import ImeisRateLimitModal from '../Imeis/components/ImeisRateLimitModal';
import VoucherHistoryModal from './components/VoucherHistoryModal';
import { useVoucherCopyHandlers } from './hooks/useVoucherCopyHandlers';
import {
  findVoucherArtKey,
  findNummerKey,
  buildVoucherDisplayColumns,
  getRowNummer,
  VOUCHER_FIXED_TABS,
  rowMatchesVoucherTab
} from './utils/voucherColumns';
import './Voucher.scss';

const Voucher = () => {
  const { user } = useAuth();
  const [uploaded, setUploaded] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copyHistory, setCopyHistory] = useState([]);
  const [copyTimestamps, setCopyTimestamps] = useState([]);
  const [rowActions, setRowActions] = useState({});
  const [historyUndoStack, setHistoryUndoStack] = useState([]);
  const [activeTab, setActiveTab] = useState(VOUCHER_FIXED_TABS[0].id);
  const [selectedCells, setSelectedCells] = useState(() => new Set());
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
    () => buildVoucherDisplayColumns(columnOrderFirst, nummerKey),
    [columnOrderFirst, nummerKey]
  );

  const filteredRows = useMemo(() => {
    if (!uploaded.length) return [];
    return uploaded.filter((r) => rowMatchesVoucherTab(r, activeTab));
  }, [uploaded, activeTab]);

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
    setSelectedCells(new Set());
  }, [activeTab]);

  const handleExportCsv = useCallback(() => {
    if (!filteredRows.length) return;
    const headers = displayCols.map((col) => {
      if (col === '__nummer__') return 'Nummer';
      if (col === '__aktion__') return 'Aktion';
      return col;
    });
    const rows = filteredRows.map((row) =>
      displayCols.map((col) => {
        if (col === '__nummer__') return getRowNummer(row, nummerKey);
        if (col === '__aktion__') {
          const rid = voucherRowId(row);
          const ra = rowActions[rid];
          return ra ? `${ra.action} (${ra.userName || ''})` : '';
        }
        const v = row.rowData?.[col];
        return v != null && v !== undefined ? String(v) : '';
      })
    );
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const link = document.createElement('a');
    link.setAttribute(
      'href',
      URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }))
    );
    link.setAttribute('download', `voucher_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredRows, displayCols, nummerKey, rowActions, voucherRowId, activeTab]);

  const handleDeleteAllLocal = useCallback(async () => {
    if (
      !window.confirm(
        'Alle Voucher-Reservierungen und Verlauf-Einträge aus der Anzeige löschen? (Betrifft nur Ihren Zugang.)'
      )
    ) {
      return;
    }
    setCopyHistory([]);
    setCopyTimestamps([]);
    setRowActions({});
    setHistoryUndoStack([]);
    setSelectedCells(new Set());
    try {
      await putVoucherUserStateApi({ copyHistory: [], copyTimestamps: [], rowActions: {} });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.message || 'Speichern fehlgeschlagen.');
    }
  }, []);

  if (!user) {
    return <Login />;
  }

  if (!canAccessVoucherList(user)) {
    return (
      <div className="imeis">
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

  if (loading) {
    return (
      <div className="imeis">
        <div className="card">
          <div className="card-body">
            <p>Lädt…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="imeis">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Voucher-Verwaltung</h2>
        </div>
        <div className="card-body">
          {error ? (
            <p className="text-error">{error}</p>
          ) : (
            <>
              {uploaded.length === 0 ? (
                <p className="voucher-meta" style={{ margin: 0 }}>
                  Noch keine Voucher-Liste. Administratoren oder das Büro laden eine Excel-Datei unter „Voucher-Upload“
                  hoch.
                </p>
              ) : (
                <>
                  <div className="imeis-controls">
                    <div className="imeis-actions">
                      <div className="imeis-actions-buttons">
                        <button
                          type="button"
                          className="btn btn--secondary btn--small"
                          disabled={filteredRows.length === 0}
                          onClick={handleExportCsv}
                        >
                          Exportieren (CSV)
                        </button>
                        <button
                          type="button"
                          className="btn btn--small imeis-history-btn"
                          onClick={() => setShowHistoryModal(true)}
                        >
                          Verlauf ({copyHistory.length})
                        </button>
                        <button type="button" className="btn btn--danger btn--small" onClick={handleDeleteAllLocal}>
                          Alle löschen
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="imeis-manufacturer-tabs voucher-category-tabs" role="tablist" aria-label="Voucher-Kategorie">
                    {VOUCHER_FIXED_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        className={`imeis-manufacturer-tab${activeTab === tab.id ? ' imeis-manufacturer-tab--active' : ''}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActiveTab(tab.id);
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {!nummerKey && (
                    <p className="voucher-meta voucher-meta--warn">
                      Keine Spalte „Nummer“ (oder „Code“) erkannt – Reservieren ist nicht möglich.
                    </p>
                  )}

                  <>
                    {filteredRows.length === 0 ? (
                      <p className="voucher-meta">
                        Keine Zeilen für diese Kategorie. Excel muss Voucher-Daten enthalten, die zu „
                        {VOUCHER_FIXED_TABS.find((t) => t.id === activeTab)?.label}“ passen (z. B. Anbieter + Voucher-Art
                        in den Zellen).
                      </p>
                    ) : (
                      <div className="imeis-table-wrapper">
                        <table className="imeis-table">
                          <thead>
                            <tr>
                              {displayCols.map((col) => (
                                <th
                                  key={col}
                                  style={{
                                    width:
                                      col === '__nummer__'
                                        ? '25%'
                                        : col === '__aktion__'
                                          ? '20%'
                                          : undefined
                                  }}
                                >
                                  {col === '__nummer__' ? 'Nummer' : col === '__aktion__' ? 'Aktion' : col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredRows.map((row, rIdx) => {
                              const rowId = voucherRowId(row);
                              const nummer = getRowNummer(row, nummerKey);
                              const nummerCellId = `${rowId}-nummer`;
                              const isNummerSelected = selectedCells.has(nummerCellId);
                              const canReserve = Boolean(nummerKey && nummer);

                              return (
                                <tr
                                  key={`${row.sheet || 's'}-${row.row}-${rIdx}`}
                                  className={isNummerSelected ? 'imeis-row-selected' : ''}
                                >
                                  {displayCols.map((col) => {
                                    if (col === '__nummer__') {
                                      return (
                                        <td
                                          key="__nummer__"
                                          className={`imeis-cell${isNummerSelected ? ' imeis-cell-selected' : ''}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedCells((prev) => {
                                              const next = new Set(prev);
                                              if (next.has(nummerCellId)) next.delete(nummerCellId);
                                              else next.add(nummerCellId);
                                              return next;
                                            });
                                          }}
                                          style={{
                                            padding: '0.5rem',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            width: '25%',
                                            fontVariantNumeric: 'tabular-nums',
                                            fontFamily: 'ui-monospace, monospace',
                                            letterSpacing: '0.04em'
                                          }}
                                        >
                                          {nummer || '–'}
                                        </td>
                                      );
                                    }
                                    if (col === '__aktion__') {
                                      return (
                                        <td key="__aktion__" style={{ padding: '0.5rem', width: '20%' }}>
                                          {isNummerSelected ? (
                                            <div
                                              className="imeis-row-dropdown-wrapper"
                                              style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                flexWrap: 'wrap'
                                              }}
                                            >
                                              <input
                                                type="checkbox"
                                                id={`voucher-res-${rowId}`}
                                                checked={rowActions[rowId]?.action === 'reservieren' || false}
                                                disabled={!canReserve}
                                                onChange={async (e) => {
                                                  e.stopPropagation();
                                                  if (e.target.checked) {
                                                    await handleDropdownSelect(row, 'reservieren');
                                                    setSelectedCells((prev) => {
                                                      const next = new Set(prev);
                                                      next.delete(nummerCellId);
                                                      return next;
                                                    });
                                                  } else {
                                                    onRowActionRemove(rowId);
                                                  }
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                style={{
                                                  cursor: canReserve ? 'pointer' : 'not-allowed',
                                                  width: '18px',
                                                  height: '18px'
                                                }}
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
                                          ) : rowActions[rowId] ? (
                                            <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                              <strong>
                                                {rowActions[rowId].action === 'reservieren'
                                                  ? 'Reservieren'
                                                  : rowActions[rowId].action === 'checkout'
                                                    ? 'Check out'
                                                    : rowActions[rowId].action}
                                              </strong>{' '}
                                              – {rowActions[rowId].userName}
                                            </div>
                                          ) : (
                                            <span style={{ color: '#999' }}>–</span>
                                          )}
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
                    )}

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
                  </>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Voucher;
