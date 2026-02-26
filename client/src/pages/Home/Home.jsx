import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Home.scss';

const Home = () => {
  const { user } = useAuth();
  const [savedContent, setSavedContent] = useState('');

  useEffect(() => {
    // Lade gespeicherten Text aus localStorage
    const saved = localStorage.getItem('dashboard-content');
    if (saved) {
      setSavedContent(saved);
    }
  }, []);

  return (
    <div className="home">
    
      
      {savedContent && (
        <section className="saved-content">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">News</h2>
            </div>
            <div 
              className="card-body saved-text-content"
              dangerouslySetInnerHTML={{ __html: savedContent }}
            />
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;
