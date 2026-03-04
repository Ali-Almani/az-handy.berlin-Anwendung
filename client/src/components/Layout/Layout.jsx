import Navbar from '../Navbar/Navbar';
import Footer from '../Footer/Footer';
import NewsPopup from '../NewsPopup/NewsPopup';
import { useNewsPopup } from '../../hooks/useNewsPopup';
import './Layout.scss';

const Layout = ({ children }) => {
  const { showPopup, content, authorName, onMarkAsRead } = useNewsPopup();

  return (
    <div className="app">
      <Navbar />
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
