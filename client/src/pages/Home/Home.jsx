import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import PerformanceDashboard from '../../components/PerformanceDashboard/PerformanceDashboard';
import { isAdmin } from '../../utils/roles';
import Login from '../Auth/Login';
import './Home.scss';

const Home = () => {
  const { user } = useAuth();
  const [metricsMeta, setMetricsMeta] = useState(null);

  // Startseite: Login-Form anzeigen wenn nicht eingeloggt
  if (!user) {
    return <Login />;
  }

  return (
    <div className="home">
      <div className="card home__kennzahlen">
        <div className="card-header card-header--kennzahlen">
          <h2 className="card-title">Kennzahlen</h2>
          <div className="card-header__meta">
            <span className="card-header__meta-item">
              <strong>Stand der Daten</strong> {metricsMeta?.dataStatus ?? '–'}
            </span>
            <span className="card-header__meta-item">
              <strong>Resttage im Monat</strong> {metricsMeta?.resttage ?? metricsMeta?.workingDays ?? '–'}
            </span>
          </div>
        </div>
        <div className="card-body">
          <PerformanceDashboard
            isAdmin={isAdmin(user)}
            readOnly
            metaInHeader
            onMetricsLoaded={setMetricsMeta}
          />
        </div>
      </div>
    </div>
  );
};

export default Home;
