/**
 * Wenn VITE_API_URL beim Build auf eine andere Host-Domain zeigt als die aktuelle Seite
 * (z. B. Schnelltest-URL auf Intranet-Deploy), ignorieren wir sie und nutzen /api gleichen Ursprungs.
 */
function configuredApiUrlRaw() {
  const raw = import.meta.env.VITE_API_URL;
  if (raw === undefined || raw === null) return '';
  return String(raw).trim();
}

function afterHostCheck(url) {
  if (
    !import.meta.env.PROD ||
    typeof window === 'undefined' ||
    !url ||
    !/^https?:\/\//i.test(url)
  ) {
    return url;
  }
  try {
    if (new URL(url).hostname !== window.location.hostname) {
      return '';
    }
  } catch {
    return url;
  }
  return url;
}

/** Leer = gleicher Ursprung, nur relativer Pfad /api sinnvoll */
export function effectiveApiRootUrl() {
  return afterHostCheck(configuredApiUrlRaw());
}

/** Axios baseURL: /api oder vollständige Basis …/api */
export function resolveApiBasePath() {
  const url = effectiveApiRootUrl();
  if (!url) return '/api';
  if (url.endsWith('/api')) return url;
  return `${url.replace(/\/$/, '')}/api`;
}

/** Socket.io-Origin (ohne /api) */
export function resolveSocketOrigin() {
  if (import.meta.env.DEV) {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }
  const url = effectiveApiRootUrl();
  if (!url) {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }
  const base = url.replace(/\/api\/?$/, '').replace(/\/$/, '');
  return base || (typeof window !== 'undefined' ? window.location.origin : '');
}
