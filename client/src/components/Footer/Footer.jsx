import './Footer.scss';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <p>&copy; {new Date().getFullYear()} az-handy.berlin. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;