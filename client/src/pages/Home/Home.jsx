import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDashboardNote } from '../../services/dashboard.service';
import './Home.scss';

const Home = () => {
  const { user } = useAuth();
  const [savedContent, setSavedContent] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchNote = async () => {
      try {
        const res = await getDashboardNote();
        if (res.data?.content) setSavedContent(res.data.content);
      } catch (err) {
        console.error('Error loading note:', err);
      }
    };
    fetchNote();
  }, [user]);

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
