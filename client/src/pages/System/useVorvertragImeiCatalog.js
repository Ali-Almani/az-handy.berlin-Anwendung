import { useCallback, useEffect, useMemo, useState } from 'react';
import { getImeisDataFromApi } from '../../services/imeis.service';
import { buildGeraeteOptionsFromImeis, buildFarbenForGeraet } from './vorvertragGeraeteUtils';

export function useVorvertragImeiCatalog(enabled = true) {
  const [imeis, setImeis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError('');
    try {
      const data = await getImeisDataFromApi();
      setImeis(Array.isArray(data?.imeis) ? data.imeis : []);
    } catch (err) {
      setImeis([]);
      setError(err.response?.data?.message || err.message || 'IMEI-Bestand konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load]);

  const geraeteOptions = useMemo(() => buildGeraeteOptionsFromImeis(imeis), [imeis]);

  const getFarbenForGeraet = useCallback(
    (geraet) => buildFarbenForGeraet(imeis, geraet),
    [imeis]
  );

  return { imeis, geraeteOptions, getFarbenForGeraet, loading, error, reload: load };
}
