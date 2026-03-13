import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  if (!user) {
    // Redirect-URL speichern, damit nach Login z.B. Verlauf (/imeis?showVerlauf=1) funktioniert
    const redirectTo = location.pathname + location.search;
    return <Navigate to={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login'} replace />;
  }

  return children;
};

export default ProtectedRoute;