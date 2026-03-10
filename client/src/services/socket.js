import { io } from 'socket.io-client';

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true' ||
  import.meta.env.VITE_API_URL === 'mock' ||
  !import.meta.env.VITE_API_URL;

// In Dev: Vite proxy leitet /socket.io an Backend weiter → gleicher Origin nutzen
// In Prod: Gleicher Origin oder VITE_API_URL als Backend-Basis
const SOCKET_URL = import.meta.env.VITE_API_URL && !import.meta.env.DEV
  ? (import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '').replace(/\/$/, '') || window.location.origin)
  : window.location.origin;

let socketInstance = null;

/** Socket-Verbindung für Echtzeit-Updates (News-Popup). Bei Mock-API wird kein Socket verwendet. */
export function getSocket() {
  if (USE_MOCK_API) return null;
  if (socketInstance?.connected) return socketInstance;
  if (socketInstance) return socketInstance;
  try {
    socketInstance = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000
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
