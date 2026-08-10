import { useEffect, useState } from 'react';
import { getVoucherSettings, saveVoucherSettings } from '../../services/dashboard.service';

/**
 * Admin-Schalter im Dashboard: „Alle löschen“ in der Voucher-Verwaltung.
 */
const VoucherAdminSettings = () => {
  const [deleteAllEnabled, setDeleteAllEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getVoucherSettings();
        if (!cancelled) {
          setDeleteAllEnabled(res.data?.deleteAllEnabled === true);
        }
      } catch (e) {
        if (!cancelled) setError('Einstellung konnte nicht geladen werden.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = async (e) => {
    const next = e.target.checked;
    setDeleteAllEnabled(next);
    setSaving(true);
    setError(null);
    try {
      await saveVoucherSettings(next);
    } catch (err) {
      setDeleteAllEnabled(!next);
      setError(err?.response?.data?.message || 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-imei-settings">
      <h3 className="dashboard-imei-settings__title">Voucher-Verwaltung – Schutz</h3>
      <label className="dashboard-imei-settings__label">
        <input
          type="checkbox"
          checked={deleteAllEnabled}
          onChange={handleToggle}
          disabled={loading || saving}
        />
        <span>
          Button „Alle löschen“ in der Voucher-Verwaltung aktivieren
          {saving ? ' …' : ''}
        </span>
      </label>
      {error && <p className="text-error">{error}</p>}
    </div>
  );
};

export default VoucherAdminSettings;
