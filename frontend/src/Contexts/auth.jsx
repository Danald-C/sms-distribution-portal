import { createContext, useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// Simple AuthContext
const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

// ProtectedRoute wrapper
export function ProtectedRoute({ children }) {
  // const { accessToken } = useAuth();
  const { values: { data, functions } } = useAuth();
  
  if (!data.accessToken) return <div className="p-6">Please login to access this page. <Link to="/">Login</Link></div>;
  
  // return children;
  return data.accessToken ? children : <Navigate to="/" />;
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gateway, setGateway] = useState({type: 0, from: 'local'}); // '0 = signin' or '1 = signup'

  useEffect(() => {
    // Try to refresh token on app load
    async function refresh() {
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

  async function processLL(email, password) { // Local Login
    const res = await fetch('/api/auth/login', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ email, password }), 
      credentials: 'include' 
    });
    if (!res.success) throw new Error('Login failed');
    const data = await res.json();
    
    localStorage.setItem('user', JSON.stringify(data.user))
    // localStorage.setItem('user', JSON.stringify(data.user))
    setAccessToken(data.token);
    setUser(data.user);
  }
  
  function processGL(data) { // Google Login
    setGateway('google');
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

  function temporaryStore(data, save=1){
    if(save === 3){
      localStorage.removeItem(data.name);
    }else{
      save === 1 && localStorage.setItem(data.name, JSON.stringify(data.value));
    }

    return JSON.parse(localStorage.getItem(data.name)) || null;
  }
  
  function validateNumber(number, allAlerts = []){
    let checkNumber = {noPlus: function(){ return number.split("+")[1] }, lastNine: function(){ return this.noPlus().slice(-9) }, countryCode: function(){ return this.noPlus().length - this.lastNine().length }}
    
    // console.log(number)
    if(!number){
      allAlerts.push({from: 0, type: 0, message: "Enter a number"})
      // setAlerts(allAlerts)
      // return false
    }else{
      /* const noPlus = number.split("+")[1];
      var lastNine = noPlus.slice(-9);
      var countryCode = noPlus.length - lastNine.length; */
      if(checkNumber.noPlus().length <= 9){
        allAlerts.push({from: 1, type: 0, message: "Your provided number is not complete."})
        // setAlerts(allAlerts)
        // return false
      }else{
        if(checkNumber.countryCode() >= 4){
          allAlerts.push({from: 2, type: 0, message: "Your provided number exceeds the required length."})
          // setAlerts(allAlerts)
          // return false
        }
      }
    }

    return allAlerts;
  }


  
  const values = {data: {
    user,
    accessToken,
    loading
  }, functions: {
    processLL,
    processGL,
    logout,
    signup,
    temporaryStore,
    validateNumber,
  }, setStates: {
    GW: {gateway, setGateway}
  }}


  // return <AuthContext.Provider value={{ user, accessToken, gateway, processLL, processGL, logout, signup, loading }}>{children}</AuthContext.Provider>;
  return <AuthContext.Provider value={{ values }}>{children}</AuthContext.Provider>;
}

export default AuthProvider;