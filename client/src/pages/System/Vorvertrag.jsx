import { Navigate } from 'react-router-dom';

/** Alte URL – alles läuft über /system */
export default function Vorvertrag() {
  return <Navigate to="/system" replace />;
}
