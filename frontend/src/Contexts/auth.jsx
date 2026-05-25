import { createContext, useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// Simple AuthContext
const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

// ProtectedRoute wrapper
export function ProtectedRoute({ children }) {
  const { accessToken } = useAuth();
  if (!accessToken) return <div className="p-6">Please login to access this page. <Link to="/">Login</Link></div>;
  
  // return children;
  return accessToken ? children : <Navigate to="/" />;
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to refresh token on app load
    async function refresh() {
      /* try {
        const r = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
        if (!r.ok) return;
        const data = await r.json();
        setAccessToken(data.accessToken);
        setUser(data.user);
      } catch (e) {
          console.log('refresh failed', e);
      } */
      
      try {
        // const storedToken = JSON.parse(localStorage.getItem("token"));
        const storedToken = localStorage.getItem("token");
        // const storedUser = localStorage.getItem("user");
        const response = await fetch("http://localhost:4000/api/auth/refresh", {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        })
        let storedUser = await response.json();
        // console.log('Stored User', storedUser);
        // if (storedUser) {
          setAccessToken(storedToken)
          setUser(storedUser);
          setLoading(false);
        // }
      } catch (e) {
          console.log('refresh failed', e);
      }
    }
    refresh();
  }, []);

  async function localLogin(email, password) {
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }), credentials: 'include' });
    if (!res.success) throw new Error('Login failed');
    const data = await res.json();
    
    localStorage.setItem('user', JSON.stringify(data.user))
    // localStorage.setItem('user', JSON.stringify(data.user))
    setAccessToken(data.token);
    setUser(data.user);
  }
  
  function googleLogin(data) {
    // console.log("Data Entry", data);
    // localStorage.setItem('token', JSON.stringify(data.token))
    localStorage.setItem('token', data.token)
    // localStorage.setItem('user', JSON.stringify(data.user))
    // setAccessToken(JSON.parse(localStorage.getItem('token')));
    setAccessToken(localStorage.getItem('token'));
    setUser(data.user);
  }

  async function logout() {
    // await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    localStorage.removeItem("token");
    // localStorage.removeItem("user");
    setAccessToken(null);
    setUser(null);
  }

  async function signup(payload) {
    const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Registration failed');
    return res.json();
  }

  // return <AuthContext.Provider value={{ user, accessToken, localLogin, logout, register }}>{children}</AuthContext.Provider>;
  return <AuthContext.Provider value={{ user, accessToken, localLogin, googleLogin, logout, signup, loading }}>{children}</AuthContext.Provider>;
}

export default AuthProvider;