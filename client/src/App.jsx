import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import PartnerRestrictedRoute from './components/PartnerRestrictedRoute/PartnerRestrictedRoute';
import { TICKETING_SYSTEM_PATH } from './constants/routes';

const Home = React.lazy(() => import('./pages/Home/Home'));
const Dashboard = React.lazy(() => import('./pages/Dashboard/Dashboard'));
const ArchivAnweisung = React.lazy(() => import('./pages/ArchivAnweisung/ArchivAnweisung'));
const ArchivNews = React.lazy(() => import('./pages/ArchivNews/ArchivNews'));
const Settings = React.lazy(() => import('./pages/Settings/Settings'));
const Imeis = React.lazy(() => import('./pages/Imeis/Imeis'));
const Voucher = React.lazy(() => import('./pages/Voucher/Voucher'));
const Documentation = React.lazy(() => import('./pages/Documentation/Documentation'));
const FormularCenter = React.lazy(() => import('./pages/FormularCenter/FormularCenter'));
const MitarbeiterOverview = React.lazy(() => import('./pages/Mitarbeiter/MitarbeiterOverview'));
const MitarbeiterProfile = React.lazy(() => import('./pages/Mitarbeiter/MitarbeiterProfile'));
const MarketingShopTshirtGroessen = React.lazy(() => import('./pages/MarketingShopTshirtGroessen/MarketingShopTshirtGroessen'));
const System = React.lazy(() => import('./pages/System/System'));
const Logs = React.lazy(() => import('./pages/Logs/Logs'));

const PageLoader = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '60vh',
      fontSize: '1rem',
      color: '#666'
    }}
  >
    Seite wird geladen…
  </div>
);

function App() {
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <PartnerRestrictedRoute>
                  <Dashboard />
                </PartnerRestrictedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/archiv-anweisung"
            element={
              <ProtectedRoute>
                <PartnerRestrictedRoute>
                  <ArchivAnweisung />
                </PartnerRestrictedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/archiv-news"
            element={
              <ProtectedRoute>
                <PartnerRestrictedRoute>
                  <ArchivNews />
                </PartnerRestrictedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mitarbeiter"
            element={
              <ProtectedRoute>
                <MitarbeiterOverview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mitarbeiter/:userId"
            element={
              <ProtectedRoute>
                <MitarbeiterProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/marketing/tshirt-groessen"
            element={
              <ProtectedRoute>
                <MarketingShopTshirtGroessen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/imeis"
            element={
              <ProtectedRoute>
                <PartnerRestrictedRoute>
                  <Imeis />
                </PartnerRestrictedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/voucher"
            element={
              <ProtectedRoute>
                <PartnerRestrictedRoute>
                  <Voucher />
                </PartnerRestrictedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/benutzerhandbuch"
            element={
              <ProtectedRoute>
                <PartnerRestrictedRoute>
                  <Documentation />
                </PartnerRestrictedRoute>
              </ProtectedRoute>
            }
          />
          <Route path="/dokumentation" element={<Navigate to="/benutzerhandbuch" replace />} />
          <Route path="/formular-center" element={<FormularCenter />} />
          <Route
            path={TICKETING_SYSTEM_PATH}
            element={
              <ProtectedRoute>
                <PartnerRestrictedRoute>
                  <System />
                </PartnerRestrictedRoute>
              </ProtectedRoute>
            }
          />
          <Route path="/system" element={<Navigate to={TICKETING_SYSTEM_PATH} replace />} />
          <Route path="/system/vorvertrag" element={<Navigate to={TICKETING_SYSTEM_PATH} replace />} />
          <Route path="/Ticketing System" element={<Navigate to={TICKETING_SYSTEM_PATH} replace />} />
          <Route
            path="/logs"
            element={
              <ProtectedRoute>
                <PartnerRestrictedRoute>
                  <Logs />
                </PartnerRestrictedRoute>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default App;
