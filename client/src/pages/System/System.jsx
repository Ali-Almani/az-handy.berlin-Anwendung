import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isAdmin } from '../../utils/roles';
import './System.scss';

const System = () => {
  const { user } = useAuth();

  if (!user || !isAdmin(user)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="system-page container">
      <h1 className="system-page-title">System</h1>
      <div className="system-card-grid">
        <Link to="/system/vorvertrag" className="system-card">
          <h2>Vorvertrag</h2>
          <p>
            Vorverträge erfassen, bearbeiten und die Bearbeitungs-Historie einsehen (Filiale, Kunde, Ausgabe- und
            Eingabedetails).
          </p>
        </Link>
      </div>
    </div>
  );
};

export default System;
