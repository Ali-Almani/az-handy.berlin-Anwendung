import { useNavigate } from 'react-router-dom';
import Navbar from '../Navbar/Navbar';
import Footer from '../Footer/Footer';
import NewsPopup from '../NewsPopup/NewsPopup';
import { useNewsPopup } from '../../hooks/useNewsPopup';
import { useImeiReminderBadge } from '../../hooks/useImeiReminderPopup';
import './Layout.scss';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const { showPopup, content, authorName, onMarkAsRead } = useNewsPopup();
  const { hasUnreadReminders, reminderCount } = useImeiReminderBadge();

  const openVerlauf = () => {
    navigate('/imeis?showVerlauf=1');
  };

  return (
    <div className="app">
      <Navbar
        hasReminderBadge={hasUnreadReminders}
        reminderCount={reminderCount}
        onOpenVerlauf={openVerlauf}
      />
      <main className="main">
        <div className="container">
          {children}
        </div>
      </main>
      <Footer />
      {showPopup && (
        <NewsPopup content={content} authorName={authorName} onMarkAsRead={onMarkAsRead} />
      )}
    </div>
  );
};

export default Layout;
