import { useState } from 'react';
import { createVoucherManualRequestApi } from '../../services/voucherManualRequest.service';
import './VoucherRequestModal.scss';

const OPTIONS = [
  { id: 'o2_ff', label: 'o2 mit Family and Friends  ( F&F ) Voucher' },
  { id: 'ay_ag0', label: 'Ay Yildiz    AG0- Voucher' },
  { id: 'ay_5eur', label: 'Ay Yildiz    5Euro Rabatt  Voucher' }
];

const VoucherRequestModal = ({ isOpen, onClose, onSuccess }) => {
  const [voucherTabId, setVoucherTabId] = useState('o2_ff');
  const [nummer, setNummer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const reset = () => {
    setVoucherTabId('o2_ff');
    setNummer('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const n = nummer.trim();
    if (!n) {
      setError('Bitte eine Nummer eingeben.');
      return;
    }
    setLoading(true);
    try {
      const res = await createVoucherManualRequestApi({ voucherTabId, nummer: n });
      if (!res?.success) {
        setError(res?.message || 'Anfrage konnte nicht gesendet werden.');
        return;
      }
      onSuccess?.(res);
      reset();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Fehler beim Senden.');
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
            „Melih prüft Ihre Angaben und trägt den Voucher nach Genehmigung in die passende Kategorie ein.“
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
              {OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="voucher-request-nummer" className="form-label">
              Nummer
            </label>
            <input
              id="voucher-request-nummer"
              type="text"
              className="form-input"
              value={nummer}
              onChange={(e) => setNummer(e.target.value)}
              placeholder="Voucher- bzw. PIN-Nummer"
              autoComplete="off"
            />
          </div>
          {error && <div className="voucher-request-modal__error">{error}</div>}
          <div className="voucher-request-modal__actions">
            <button type="button" className="btn btn--outline" onClick={handleClose} disabled={loading}>
              Abbrechen
            </button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Senden…' : 'Anfrage senden'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VoucherRequestModal;
