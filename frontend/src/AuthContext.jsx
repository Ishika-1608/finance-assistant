import { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in (on page refresh)
  useEffect(() => {
    if (token) {
fetch(`https://ishika1608.pythonanywhere.com/api/check_session`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.logged_in) {
            setUser(data.username);
          } else {
            localStorage.removeItem('authToken');
            setToken(null);
          }
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
          localStorage.removeItem('authToken');
          setToken(null);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (username, password) => {
fetch(`https://ishika1608.pythonanywhere.com/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('authToken', data.token);
      setToken(data.token);
      setUser(username);
      return true;
    } else {
      throw new Error(data.error);
    }
  };

  const register = async (username, password) => {
fetch(`https://ishika1608.pythonanywhere.com/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok) {
      return true;
    } else {
      throw new Error(data.error);
    }
  };

  const logout = async () => {
    if (token) {
fetch(`https://ishika1608.pythonanywhere.com/api/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {});
    }
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};