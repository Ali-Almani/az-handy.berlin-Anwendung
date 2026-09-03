import { Navigate } from 'react-router-dom';
import { TICKETING_SYSTEM_PATH } from '../../constants/routes';

/** Alte URL – alles läuft über Ticketing System */
export default function Vorvertrag() {
  return <Navigate to={TICKETING_SYSTEM_PATH} replace />;
}
