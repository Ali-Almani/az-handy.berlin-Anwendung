import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Navbar/Navbar';
import Footer from '../Footer/Footer';
import NewsPopup from '../NewsPopup/NewsPopup';
import ExtraCopyRequestsModal from '../ExtraCopyRequestsModal/ExtraCopyRequestsModal';
import ExtraCopyNotificationModal from '../ExtraCopyNotificationModal/ExtraCopyNotificationModal';
import ReminderResponseNotificationModal from '../ReminderResponseNotificationModal/ReminderResponseNotificationModal';
import { useAuth } from '../../hooks/useAuth';
import { useNewsPopup } from '../../hooks/useNewsPopup';
import { useImeiReminderBadge } from '../../hooks/useImeiReminderPopup';
import { getSocket } from '../../services/socket';
import { useExtraCopyRequests } from '../../hooks/useExtraCopyRequests';
import { useExtraCopyNotification } from '../../hooks/useExtraCopyNotification';
import { useReminderResponseNotification } from '../../hooks/useReminderResponseNotification';
import './Layout.scss';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Socket früh verbinden, damit Echtzeit-Updates (z.B. Excel-Upload durch Büro) bei allen funktionieren
  useEffect(() => {
    if (user?.id) getSocket();
  }, [user?.id]);

  useEffect(() => {
    const host = window.location.hostname.toLowerCase();
    const isSchnelltest =
      host === 'az-schnelltest.berlin' || host === 'www.az-schnelltest.berlin';
    const cls = 'layout-host--schnelltest';
    if (isSchnelltest) {
      document.body.classList.add(cls);
    }
    return () => {
      document.body.classList.remove(cls);
    };
  }, []);
  const [showExtraCopyModal, setShowExtraCopyModal] = useState(false);
  const [showExtraCopyNotificationModal, setShowExtraCopyNotificationModal] = useState(false);
  const [showReminderResponseModal, setShowReminderResponseModal] = useState(false);
  const { showPopup, content, onMarkAsRead } = useNewsPopup();
  const { hasUnreadReminders, reminderCount } = useImeiReminderBadge();
  const { requests, hasPendingRequests, requestCount, loading, approve, reject } = useExtraCopyRequests();
  const { notifications, hasUnreadNotifications, notificationCount, markAsRead } = useExtraCopyNotification();
  const { notifications: reminderResponseNotifications, hasUnreadNotifications: hasReminderResponseNotifications, notificationCount: reminderResponseCount, markAsRead: markReminderResponseRead } = useReminderResponseNotification();

  const openVerlauf = () => {
    navigate('/imeis?showVerlauf=1');
  };

  useEffect(() => {
    if (hasUnreadNotifications) setShowExtraCopyNotificationModal(true);
  }, [hasUnreadNotifications]);

  useEffect(() => {
    if (hasReminderResponseNotifications) setShowReminderResponseModal(true);
  }, [hasReminderResponseNotifications]);

  return (
    <div className="app">
      <Navbar
        hasReminderBadge={hasUnreadReminders}
        reminderCount={reminderCount}
        onOpenVerlauf={openVerlauf}
        hasExtraCopyBadge={hasPendingRequests}
        extraCopyCount={requestCount}
        onOpenExtraCopyModal={() => setShowExtraCopyModal(true)}
        hasExtraCopyResultBadge={hasUnreadNotifications}
        extraCopyResultCount={notificationCount}
        onOpenExtraCopyResultModal={() => setShowExtraCopyNotificationModal(true)}
        hasReminderResponseBadge={hasReminderResponseNotifications}
        reminderResponseCount={reminderResponseCount}
        onOpenReminderResponseModal={() => setShowReminderResponseModal(true)}
      />
      <main className="main">
        <div className="container">
          {children}
        </div>
      </main>
      <Footer />
      {showPopup && (
        <NewsPopup content={content} onMarkAsRead={onMarkAsRead} />
      )}
      <ExtraCopyRequestsModal
        isOpen={showExtraCopyModal}
        onClose={() => setShowExtraCopyModal(false)}
        requests={requests}
        loading={loading}
        onApprove={approve}
        onReject={reject}
      />
      <ExtraCopyNotificationModal
        isOpen={showExtraCopyNotificationModal}
        onClose={() => setShowExtraCopyNotificationModal(false)}
        notifications={notifications}
        onMarkAsRead={markAsRead}
      />
      <ReminderResponseNotificationModal
        isOpen={showReminderResponseModal}
        onClose={() => setShowReminderResponseModal(false)}
        notifications={reminderResponseNotifications}
        onMarkAsRead={markReminderResponseRead}
      />
    </div>
  );
};

export default Layout;
