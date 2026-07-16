import { useState } from 'react';
import { createVoucherManualRequestApi } from '../../services/voucherManualRequest.service';
import { VOUCHER_FIXED_TABS } from '../../constants/voucherTabs';
import './VoucherRequestModal.scss';

const VoucherRequestModal = ({ isOpen, onClose, onSuccess }) => {
  const [voucherTabId, setVoucherTabId] = useState('o2_ff');
  const [nummerList, setNummerList] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const reset = () => {
    setVoucherTabId('o2_ff');
    setNummerList('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const lines = nummerList
      .split(/[\r\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setError('Bitte mindestens eine Nummer eingeben (eine Zeile pro Nummer).');
      return;
    }
    setLoading(true);
    try {
      const res = await createVoucherManualRequestApi({
        voucherTabId,
        nummer: lines.join('\n')
      });
      if (!res?.success) {
        setError(res?.message || 'Eintragen fehlgeschlagen.');
        return;
      }
      onSuccess?.(res);
      reset();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Fehler beim Eintragen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="voucher-request-modal-overlay" onClick={handleClose} role="presentation">
      <div className="voucher-request-modal" onClick={(e) => e.stopPropagation()}>
        <div className="voucher-request-modal__header">
          <h3 id="voucher-request-title">Voucher eintragen</h3>
          <button type="button" className="voucher-request-modal__close" onClick={handleClose} aria-label="Schließen">
            ×
          </button>
        </div>
        <form className="voucher-request-modal__body" onSubmit={handleSubmit}>
          <p className="voucher-request-modal__hint">
            Einträge erscheinen sofort in der gemeinsamen Voucher-Liste. Ihr Kontoname wird automatisch in der Spalte
            „Benutzer“ (neben „Voucher Art“) eingetragen – Sie tragen hier nur die Nummern ein.
          </p>
          <div className="form-group">
            <label htmlFor="voucher-request-art" className="form-label">
              Voucher-Art
            </label>
            <select
              id="voucher-request-art"
              className="form-input"
              value={voucherTabId}
              onChange={(e) => setVoucherTabId(e.target.value)}
            >
              {VOUCHER_FIXED_TABS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="voucher-request-nummern" className="form-label">
              Nummern
            </label>
            <textarea
              id="voucher-request-nummern"
              className="form-input voucher-request-modal__textarea"
              value={nummerList}
              onChange={(e) => setNummerList(e.target.value)}
              placeholder="Eine PIN/Voucher-Nummer pro Zeile — mehrere gleichzeitig möglich"
              autoComplete="off"
              rows={6}
              spellCheck={false}
            />
          </div>
          {error && <div className="voucher-request-modal__error">{error}</div>}
          <div className="voucher-request-modal__actions">
            <button type="button" className="btn btn--outline" onClick={handleClose} disabled={loading}>
              Abbrechen
            </button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Speichern…' : 'In Liste eintragen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VoucherRequestModal;
