import { io } from 'socket.io-client';
import { resolveSocketOrigin } from '../utils/runtimeApiBase.js';

// In Produktion: Immer Socket nutzen (wie api.js), damit Echtzeit-Updates funktionieren
const USE_MOCK_API = import.meta.env.PROD ? false : (
  import.meta.env.VITE_USE_MOCK_API === 'true' ||
  import.meta.env.VITE_API_URL === 'mock' ||
  !import.meta.env.VITE_API_URL
);

const SOCKET_URL = resolveSocketOrigin();

let socketInstance = null;

/** az-intranet: Laufzeit (ohne neuen Build) — nur Polling, sonst weiter wss://-Fehler trotz upgrade:false in älteren Clients. */
function hostRequiresPollingOnly() {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname.toLowerCase();
  if (h === 'az-intranet.de' || h === 'www.az-intranet.de') return true;
  const extra = String(import.meta.env.VITE_SOCKET_POLLING_ONLY_HOSTS || '')
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return extra.length > 0 && extra.includes(h);
}

/** Socket-Verbindung für Echtzeit-Updates (News-Popup). Bei Mock-API wird kein Socket verwendet. */
export function getSocket() {
  if (USE_MOCK_API) return null;
  if (socketInstance?.connected) return socketInstance;
  if (socketInstance) return socketInstance;
  try {
    const forcePolling = hostRequiresPollingOnly();
    // Polling zuerst: Intranet/Proxys blockieren oft WebSocket-Upgrade; optional nur Polling per Build-ENV.
    const t = String(import.meta.env.VITE_SOCKET_TRANSPORTS || '').trim();
    // Default: WebSocket-first (minimiert Latenz für Echtzeit-Verlauf). Fallback auf Polling bleibt aktiv.
    let transports = ['websocket', 'polling'];
    // Opt-in: explizit Polling-first (alte Proxys), oder Polling-only (az-intranet / ENV)
    if (t === 'polling-first') transports = ['polling', 'websocket'];
    if (t === 'polling-only' || t === 'polling' || forcePolling) transports = ['polling'];
    // Standard Prod (z. B. Schnelltest): Polling zuerst, dann WebSocket-Upgrade — sonst fehlen oft Echtzeit-Events.
    // Nur auf az-intranet (forcePolling) / oder VITE_SOCKET_NO_UPGRADE: kein Upgrade → keine wss://-Fehler in der Konsole.
    const noUpgrade =
      forcePolling || String(import.meta.env.VITE_SOCKET_NO_UPGRADE || '').trim() === 'true';
    const allowWsUpgrade = !noUpgrade;
    socketInstance = io(SOCKET_URL, {
      path: '/socket.io',
      transports,
      upgrade: allowWsUpgrade,
      rememberUpgrade: true,
      withCredentials: true,
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 20000
    });
    return socketInstance;
  } catch {
    return null;
  }
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
