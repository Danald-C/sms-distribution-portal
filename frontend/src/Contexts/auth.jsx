import { createContext, useContext, useEffect, useState } from 'react';

// Simple AuthContext
const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

// ProtectedRoute wrapper
export function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <div className="p-6">Please login to access this page.</div>;
  return children;
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    // Try to refresh token on app load
    async function refresh() {
      try {
        const r = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
        if (!r.ok) return;
        const data = await r.json();
        setAccessToken(data.accessToken);
        setUser(data.user);
      } catch (e) {
        console.log('refresh failed', e);
      }
    }
    refresh();
  }, []);

  async function login(email, password) {
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }), credentials: 'include' });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    setAccessToken(data.accessToken);
    setUser(data.user);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setAccessToken(null);
    setUser(null);
  }

  async function register(payload) {
    const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Registration failed');
    return res.json();
  }

  return <AuthContext.Provider value={{ user, accessToken, login, logout, register }}>{children}</AuthContext.Provider>;
}

export default AuthProvider;