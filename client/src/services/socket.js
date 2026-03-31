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
