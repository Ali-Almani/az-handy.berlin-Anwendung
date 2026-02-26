import { useState, useEffect, createContext, useContext } from 'react';
import { getUserProfile } from '../services/user.service';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkSessionTimeout = () => {
    const loginTimestamp = localStorage.getItem('loginTimestamp');
    if (loginTimestamp) {
      const nineHours = 9 * 60 * 60 * 1000;
      const timeSinceLogin = Date.now() - parseInt(loginTimestamp, 10);
      
      if (timeSinceLogin >= nineHours) {
        localStorage.removeItem('token');
        localStorage.removeItem('loginTimestamp');
        setUser(null);
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (token) {
      if (!localStorage.getItem('loginTimestamp')) {
        localStorage.setItem('loginTimestamp', Date.now().toString());
      }
      
      if (checkSessionTimeout()) {
        setLoading(false);
        return;
      }

      getUserProfile()
        .then((response) => {
          setUser(response.data.user);
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('loginTimestamp');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      localStorage.removeItem('loginTimestamp');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      checkSessionTimeout();
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('loginTimestamp');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
