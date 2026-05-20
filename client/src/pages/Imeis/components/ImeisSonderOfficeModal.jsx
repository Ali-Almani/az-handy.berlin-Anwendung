import { useMemo, useState, useEffect } from 'react';
import { normalizeImeiSortKey } from '../utils/imeisSortUtils';

/**
 * Büro/Admin: Vorschlagsliste der aktuell ältesten IMEIs zur Freigabe als „Sonder IMEI“
 * für die Ansicht „Sonder IMEI“ der Rolle Mitarbeiter shop.
 */
export default function ImeisSonderOfficeModal({
  isOpen,
  onClose,
  candidates = [],
  onApprove,
  busy = false,
  maskImei
}) {
  const keys = useMemo(
    () => candidates.map((c) => ({ row: c, key: normalizeImeiSortKey(c?.imei) })).filter((x) => x.key),
    [candidates]
  );

  const [selectedKeys, setSelectedKeys] = useState(() => new Set());

  useEffect(() => {
    if (isOpen) {
      setSelectedKeys(new Set(keys.map((k) => k.key)));
    }
  }, [isOpen, keys]);

  if (!isOpen) return null;

  const toggle = (k) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const handleApprove = async () => {
    const imeis = keys.filter((x) => selectedKeys.has(x.key)).map((x) => String(x.row.imei || '').trim());
    await onApprove?.(imeis);
  };

  return (
    <div className="imeis-history-modal imeis-sonder-office-modal" role="dialog" aria-modal="true" aria-labelledby="imeis-sonder-office-title">
      <div className="imeis-history-modal-backdrop" onClick={busy ? undefined : onClose} />
      <div className="imeis-history-modal-dialog imeis-sonder-office-modal__dialog">
        <div className="imeis-history-modal-header">
          <h3 id="imeis-sonder-office-title">Sonder IMEI – Vorschlag (10 älteste)</h3>
          <button type="button" className="imeis-history-modal-close" onClick={onClose} disabled={busy} aria-label="Schließen">
            ×
          </button>
        </div>
        <div className="imeis-history-modal-body imeis-sonder-office-modal__body">
          <p className="imeis-sonder-office-modal__hint">
            Hier werden maximal die zehn ältesten, nicht reservierten IMEIs aus dem Bestand angezeigt (nach Eintragsdatum / Listenreihenfolge).
            Für den Shop unter <strong>Sonder IMEI</strong> anzeigen auswählen und freigeben.
          </p>
          {keys.length === 0 ? (
            <p className="imeis-zustand-empty">Keine passenden IMEIs im Bestand.</p>
          ) : (
            <ul className="imeis-sonder-office-modal__list">
              {keys.map(({ row, key }) => (
                <li key={`${key}-${row.row}-${row.sheet || ''}`}>
                  <label className="imeis-sonder-office-modal__row">
                    <input
                      type="checkbox"
                      checked={selectedKeys.has(key)}
                      onChange={() => toggle(key)}
                      disabled={busy}
                    />
                    <span className="imeis-sonder-office-modal__imei">{maskImei ? maskImei(row.imei) : row.imei}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="imeis-history-modal-footer">
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={busy}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => handleApprove()}
            disabled={busy || keys.length === 0 || selectedKeys.size === 0}
          >
            {busy ? 'Speichern…' : 'Auswahl für Shop freigeben'}
          </button>
        </div>
      </div>
    </div>
  );
}
