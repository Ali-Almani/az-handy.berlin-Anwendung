import { Routes, Route } from 'react-router-dom';
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
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';

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
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/archiv-anweisung"
          element={
            <ProtectedRoute>
              <ArchivAnweisung />
            </ProtectedRoute>
          }
        />
        <Route
          path="/archiv-news"
          element={
            <ProtectedRoute>
              <ArchivNews />
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
          path="/imeis"
          element={
            <ProtectedRoute>
              <Imeis />
            </ProtectedRoute>
          }
        />
        <Route
          path="/voucher"
          element={
            <ProtectedRoute>
              <Voucher />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dokumentation"
          element={
            <ProtectedRoute>
              <Documentation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/formular-center"
          element={
            <ProtectedRoute>
              <FormularCenter />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Layout>
  );
}

export default App;
