import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Home from './pages/Home/Home';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import ArchivAnweisung from './pages/ArchivAnweisung/ArchivAnweisung';
import ArchivNews from './pages/ArchivNews/ArchivNews';
import Settings from './pages/Settings/Settings';
import Imeis from './pages/Imeis/Imeis';
import Voucher from './pages/Voucher/Voucher';
import Documentation from './pages/Documentation/Documentation';
import FormularCenter from './pages/FormularCenter/FormularCenter';
import MitarbeiterOverview from './pages/Mitarbeiter/MitarbeiterOverview';
import MitarbeiterProfile from './pages/Mitarbeiter/MitarbeiterProfile';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import PartnerRestrictedRoute from './components/PartnerRestrictedRoute/PartnerRestrictedRoute';

function App() {
  return (
    <Layout>
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
      </Routes>
    </Layout>
  );
}

export default App;
