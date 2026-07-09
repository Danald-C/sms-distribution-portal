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
  // const { values } = useAuth();

  // console.log(values)
  
  if (!data.accessToken) return <div className="p-6">Please login to access this page. <Link to="/">Login</Link></div>;
  
  // return children;
  return data.accessToken ? children : <Navigate to="/" />;
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gateway, setGateway] = useState({type: 0, from: 'local'}); // '0 = signin' or '1 = signup'
  const [phoneNumbersData, setPhoneNumbersData] = useState([]);

  useEffect(() => {
    // Try to refresh token on app load
    async function refresh() {
      try {
        const storedToken = localStorage.getItem("token");
        console.log("Stored Token..", storedToken);
        // const storedUser = localStorage.getItem("user");
        const response = await fetch(`http://localhost:4000/api/auth/refresh`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        })
        let storedUser = await response.json();
        // if (storedUser) {
          // temporaryStore({name: 'gateway', value: {type: 0, from: 'local'}}, 0) // type: 0 signin, 1 signup. from: local/gmail/facebook etc 
          
          // const resPhoneNumbers = await fetch(`http://localhost:4000/api/auth/fetch-contacts?page=1&limit=10&user_id="${storedUser.user.user.user_id}"`, {  })
          // let contacts = await resPhoneNumbers.json();
          console.log("This one...", storedUser)
        if(storedUser.success){ 
          setAccessToken(storedToken)
          setUser(storedUser.user.user);
          setPhoneNumbersData(storedUser.allData);
        }
      } catch (e) {
          console.log('refresh failed', e);
      }finally{
        // console.log('Did we get here after all?');
        setLoading(false);
      }
    }
    refresh();
    // loadPage();
  }, []);


  
  async function loadPage() {
    try {
      setLoading(true);

      // const response = await fetch(`http://localhost:4000/api/auth/get-contacts?page=1&limit=10&user_id=${user.id}`, {  })
      // let contacts = await response.json();
    } catch (e) {
        console.log('Could not load phone numbers, ', e);
        // setAlerts([{from: 2, type: "warning", message: `Could not load phone numbers, ${e}`}]);
    }finally{
      setLoading(false);
    }
  }



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
    // localStorage.setItem('token', JSON.stringify(data.token))
    localStorage.setItem('token', data.token)
    // console.log("Data Entry", localStorage.getItem('token'));
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
    if(save === 3){ // Remove
      localStorage.removeItem(data.name);
    }else{ // Set
      save === 1 && localStorage.setItem(data.name, JSON.stringify(data.value));
    }

    return JSON.parse(localStorage.getItem(data.name)) || null;
  }
  
  function validateNumber(number, allAlerts = []){
    let checkNumber = {noPlus: function(){ return number.split("+")[1] }, lastNine: function(){ return this.noPlus().slice(-9) }, countryCode: function(){ return this.noPlus().length - this.lastNine().length }}
    
    // console.log(number)
    if(!number){
      // allAlerts.push({from: 0, type: 0, message: "Enter a number"})
      allAlerts.push({from: 0, type: "caution", message: "Enter a number"})
    }else{
      if(checkNumber.noPlus().length <= 9){
        allAlerts.push({from: 1, type: "caution", message: "Your provided number is not complete."})
      }else{
        if(checkNumber.countryCode() >= 4){
          allAlerts.push({from: 2, type: "caution", message: "Your provided number exceeds the required length."})
        }
      }
    }

    return allAlerts;
    // return displayError(allAlerts);
  }

  function displayError(alerts){
    return alerts.map(alert => (<p className={alert.type}>{alert.message}</p>))
  }

  async function fetchFromBackend({path, data}){
    const response = await fetch(`http://localhost:4000/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return fesponse.json()
  }
  
  
  // const displayElements = () => {
  const displayElements = (type, contacts=[], payload=[]) => {
      /* return contacts.map((contact, index) => (
        <span key={index} className="mr-2">{contact[0]}: {contact[1]} {contact[2]}</span>
      )); */
      let elements = '';
      
      if(type == 0){
          elements = contacts?.map((contact, index) => (
              // <span key={index} className="mr-2">{contact[0]}: {contact[1]} {contact[2]}</span>
              <span key={index} className="mr-2">{contact.full_name || "No Name"}: {contact.phone_number} {contact.email}</span>
          ));
      }
      
      if(type == 1){
          elements = payload.map((eachMess, index) => (
              <textarea key={index} value={eachMess.message} />
              // <textarea key={index} defaultValue={eachMess.message} />
          ))
      }

      return elements;
  }

  let values = {data: {
    user,
    accessToken,
    loading,
    phoneNumbersData
  }, functions: {
    processLL,
    processGL,
    logout,
    signup,
    temporaryStore,
    validateNumber,
    displayElements,
    fetchFromBackend,
    displayError
  }}

  


  // return <AuthContext.Provider value={{ user, accessToken, gateway, processLL, processGL, logout, signup, loading }}>{children}</AuthContext.Provider>;
  return <AuthContext.Provider value={{ values }}>{children}</AuthContext.Provider>;
}

export default AuthProvider;