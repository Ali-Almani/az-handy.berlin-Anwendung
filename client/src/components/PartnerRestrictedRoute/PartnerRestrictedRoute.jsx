import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isPartner } from '../../utils/roles';

/** Leitet Rolle Partner von geschützten Hauptseiten auf Formular Center um (Einstellungen bleiben ohne diesen Wrapper erreichbar). */
export default function PartnerRestrictedRoute({ children }) {
  const { user } = useAuth();
  if (isPartner(user)) {
    return <Navigate to="/formular-center" replace />;
  }
  return children;
}
