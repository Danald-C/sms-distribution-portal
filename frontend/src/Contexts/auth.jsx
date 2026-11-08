import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import { Link, Navigate } from 'react-router-dom';

// Share one refresh request across duplicate effect executions.
// This prevents React Strict Mode from rotating the same cookie twice.
// Share an in-flight refresh request across Strict Mode effect replays.
let refreshRequestPromise = null;

/* function refreshSessionOnce(API_URL) {
  if (!refreshRequestPromise) {
    refreshRequestPromise = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    }).finally(() => {
      refreshRequestPromise = null;
    });
  }

  return refreshRequestPromise;
} */

// Simple AuthContext
const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function requestRefreshToken(API_URL) {
  if (!refreshRequestPromise) {
    refreshRequestPromise = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(async (response) => {
        const data = await response.json();

        return {
          ok: response.ok,
          status: response.status,
          data
        };
      })
      .finally(() => {
        refreshRequestPromise = null;
      });
  }

  return refreshRequestPromise;
}

// ProtectedRoute wrapper
// ProtectedRoute wrapper
export function ProtectedRoute({ children }) {
  const {
    values: {
      data: { accessToken, authReady }
    }
  } = useAuth();

  // Wait for initial session restoration to finish.
  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Checking your session...</p>
      </div>
    );
  }

  // Redirect unauthenticated users to the login page.
  if (!accessToken) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AuthProvider({ children }) {
  const [API_URL, setAPI_URL] = useState(import.meta.env.VITE_API_URL || "http://localhost:4000");
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(false);
  // const [loadContent, setLoadContent] = useState(false);
  const [gateway, setGateway] = useState({type: 0, from: 'local'}); // '0 = signin' or '1 = signup'
  const [phoneNumbersData, setPhoneNumbersData] = useState([]);
  const [authReady, setAuthReady] = useState(false);
  const authOperationRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    // console.log('[AUTH] Session restoration effect started', {
    //   API_URL,
    //   operationId
    // });

    // Assign an ID to this specific restoration attempt.
    const operationId = ++authOperationRef.current;
    const isCurrentOperation = () => !cancelled && authOperationRef.current === operationId;
    // isCurrentOperation = () => !cancelled && authOperationRef.current === operationId;

    async function refresh() {
        try {
            setLoading(true);

            const refreshResult = await requestRefreshToken(API_URL);
    // console.log("In AuthContext: ", refreshResult);

            // Ignore results from outdated operations.
            if (!isCurrentOperation()) return;

            if (!refreshResult.ok) {
                console.error(
                    '[AUTH] Refresh failed:',
                    refreshResult.status,
                    refreshResult.data
                );

                temporaryStore({ name: 'token' }, 2);

                setAccessToken(null);
                setUser(null);
                setPhoneNumbersData([]);

                return;
            }

            const refreshData = refreshResult.data;
            const newToken = refreshData.accessToken;

            if (!refreshData.Success || !newToken) {
                throw new Error(
                    'Refresh response did not contain an access token.'
                );
            }

            temporaryStore({name: 'token', value: newToken}, 1);

            const profileResponse = await fetch(`${API_URL}/auth/reload-data`, {
              method: 'GET',
              cache: 'no-store',
              headers: {
                Authorization: `Bearer ${newToken}`
              }
            });

            if (!isCurrentOperation()) return;

            if (!profileResponse.ok) {
                throw new Error(
                    `Profile request failed: HTTP ${profileResponse.status}`
                );
            }

            const profileData = await profileResponse.json();

            if (!profileData.Success) {
                throw new Error('Unable to load the user profile.');
            }

            // Check again before committing the authenticated state.
            if (!isCurrentOperation()) return;

            setAccessToken(newToken);
            setUser(profileData.user || null);
            setPhoneNumbersData(profileData.allData || []);

        } catch (error) {
            if (!isCurrentOperation()) return;

            console.error(
                '[AUTH] Session restoration failed:',
                error
            );

            temporaryStore({ name: 'token' }, 2);

            setAccessToken(null);
            setUser(null);
            setPhoneNumbersData([]);

        } finally {
            if (isCurrentOperation()) {
                setLoading(false);
                setAuthReady(true);
            }
        }
    }

    refresh();

    return () => {
        cancelled = true;
    };
  }, [API_URL]);


  



  async function authenticatedFetch(url, options = {}) {
    const currentToken = accessToken;

    const sendRequest = (token) => {
      const headers = new Headers(options.headers || {});
      headers.set("Authorization", `Bearer ${token}`);

      return fetch(url, {
        ...options,
        headers,
        // Preserve any existing credentials option, otherwise use same-origin.
        credentials: options.credentials ?? "same-origin",
      });
    };

    let response = await sendRequest(currentToken);
      // console.log('Old Token ', currentToken)

    if (response.status !== 401) {
      return response;
    }

    const errorData = await response.clone().json().catch(() => null);

    // Only refresh for the backend's observed expired/invalid access-token response.
    if (errorData?.error !== "Invalid or expired token") {
      return response;
    }

    const refreshResult = await requestRefreshToken(API_URL);

    if (!refreshResult.ok || !refreshResult.data?.accessToken) {
      // Refresh cookie is missing/invalid/expired; end the local session.
      authOperationRef.current += 1;
      temporaryStore({ name: "token" }, 2);
      setAccessToken(null);
      setUser(null);
      setPhoneNumbersData([]);
      setAuthReady(true);
      return response;
    }

    const newToken = refreshResult.data.accessToken;
      // console.log('New Token ', newToken)

    temporaryStore({ name: "token", value: newToken }, 1);
    setAccessToken(newToken);

    // Retry once only. Do not recursively refresh if this request also fails.
    return sendRequest(newToken);
  }



  /* function processLL(data) {
    const tokenValue = data?.token || data?.accessToken;

    if (!tokenValue) {
      console.error('Login response did not contain an access token.');
      return false;
    }

    // Invalidate any session-restoration request already in progress.
    authOperationRef.current += 1;

    temporaryStore({ name: 'token', value: tokenValue }, 1);

    setAccessToken(tokenValue);
    setUser(data.user || null);
    console.log("In the login: ", data.allData);
    setPhoneNumbersData(data.allData || []);

    setLoading(false);
    setAuthReady(true);

    return true;
  } */
 async function processLL(data) {
    const tokenValue = data?.token || data?.accessToken;

    if (!tokenValue) {
      console.error("Login response did not contain an access token.");
      return false;
    }

    // Invalidate any startup session-restoration request still in progress.
    const operationId = ++authOperationRef.current;

    temporaryStore({ name: "token", value: tokenValue }, 1);

    // Establish the login immediately using the response data.
    setAccessToken(tokenValue);
    setUser(data.user || null);
    setPhoneNumbersData(data.allData || []);
    setLoading(true);
    setAuthReady(true);

    try {
      const response = await fetch(`${API_URL}/auth/reload-data`, {
        method: "GET",
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${tokenValue}`,
        },
      });

      const profileData = await response.json();

      // Ignore this response if another auth operation happened meanwhile.
      if (authOperationRef.current !== operationId) {
        return true;
      }

      if (!response.ok || !profileData.Success) {
        throw new Error(
          `Profile request failed: HTTP ${response.status}`
        );
      }

      setUser(profileData.user || data.user || null);
      setPhoneNumbersData(profileData.allData || []);
    } catch (error) {
      // Login itself succeeded; keep the login response's user/data as fallback.
      console.error("[AUTH] Could not reload profile after login:", error);
    } finally {
      if (authOperationRef.current === operationId) {
        setLoading(false);
      }
    }

    return true;
  }

  /* function processGL(data) {
    const tokenValue = data?.accessToken || data?.token;

    if (!tokenValue) {
      console.error('Google login response did not contain an access token.');
      return false;
    }

    // Invalidate any session-restoration request already in progress.
    authOperationRef.current += 1;

    temporaryStore({ name: 'token', value: tokenValue }, 1);

    setAccessToken(tokenValue);
    setUser(data.user || null);
    setPhoneNumbersData(data.allData || []);

    setLoading(false);
    setAuthReady(true);

    return true;
  } */
 async function processGL(data) {
    const tokenValue = data?.accessToken || data?.token;

    if (!tokenValue) {
      console.error("Google login response did not contain an access token.");
      return false;
    }

    // Invalidate any session-restoration request already in progress.
    const operationId = ++authOperationRef.current;

    temporaryStore({ name: "token", value: tokenValue }, 1);

    // Establish the login immediately using the response data.
    setAccessToken(tokenValue);
    setUser(data.user || null);
    setPhoneNumbersData(data.allData || []);
    setLoading(true);
    setAuthReady(true);

    try {
      const response = await fetch(`${API_URL}/auth/reload-data`, {
        method: "GET",
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${tokenValue}`,
        },
      });

      const profileData = await response.json();

      // Ignore this response if another auth operation happened meanwhile.
      if (authOperationRef.current !== operationId) {
        return true;
      }

      if (!response.ok || !profileData.Success) {
        throw new Error(
          `Profile request failed: HTTP ${response.status}`
        );
      }

      setUser(profileData.user || data.user || null);
      setPhoneNumbersData(profileData.allData || []);
    } catch (error) {
      // Login itself succeeded; keep the login response's user/data as fallback.
      console.error("[AUTH] Could not reload profile after Google login:", error);
    } finally {
      if (authOperationRef.current === operationId) {
        setLoading(false);
      }
    }

    return true;
 }

  /* async function logout() {
    // await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });

    // localStorage.removeItem("token");
    temporaryStore({name: "token"}, 2);

    // localStorage.removeItem("user");
    setAccessToken(null);
    setUser(null);
  } */
  async function logout() {
    // Invalidate outstanding session-restoration requests immediately.
    authOperationRef.current += 1;

    try {
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        console.error(
          'Server logout returned HTTP status:',
          response.status
        );
      }
    } catch (error) {
      console.error('Server logout request failed:', error);
    } finally {
      temporaryStore({ name: 'token' }, 2);

      setAccessToken(null);
      setUser(null);
      setPhoneNumbersData([]);

      setLoading(false);
      setAuthReady(true);
    }
  }

  async function signup(payload) {
    const res = await fetch(`${API_URL}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Registration failed');
    return res.json();
  }

  // function temporaryStore(data, save=0){
  function temporaryStore(data, save=0, parse=false){
    if(save === 2){ // Remove
      localStorage.removeItem(data.name);
    }else{ // Set
      // save === 1 && localStorage.setItem(data.name, JSON.stringify(data.value));
      if(save === 1){
        (parse) ? localStorage.setItem(data.name, JSON.stringify(data.value)) : localStorage.setItem(data.name, data.value);;
      }
    }

    // console.log(localStorage.getItem(data.name))
    return (parse) ? JSON.parse(localStorage.getItem(data.name)) : localStorage.getItem(data.name) || null;
  }
  
  function validateNumber(number, allAlerts = []){
    let checkNumber = {noPlus: function(){ return number.split("+")[1] }, lastNine: function(){ return this.noPlus().slice(-9) }, countryCode: function(){ return this.noPlus().length - this.lastNine().length }}
    
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

  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };


  // *** *** *** Error Handling Functions *** *** ***
  function processError(localAlerts, alert, set=0){
    // localAlerts = alerts;
    if(set == 1){ // set alert
      if(localAlerts.length == 0 || !localAlerts.filter(each => each.number == alert.number)){ // New
        localAlerts.push(alert);
        // setAlerts(alerts);
      }else{ // Exists
        localAlerts.map((each, i) => {
          if(each.number == alert.number){
            // each.type = alert.type;
            // each.message = alert.message;
            localAlerts[i].type = alert.type;
            localAlerts[i].message = alert.message;
          }
        });
        // setAlerts(alerts);
      }
    }else{ // remove alert
      localAlerts.filter(each => each.number !== alert.number);
    }
        // console.log(alerts);

    return localAlerts;
  }

  function displayError(alerts){
    return alerts.map((alert, i) => (<p key={i} className={alert.type}>{alert.message}</p>))
  }
  // *** *** *** End of Error Handling Functions *** *** ***


  async function fetchFromBackend({path, data}){
    const response = await fetch(`${API_URL}/${path}`, {
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
    API_URL,
    user,
    accessToken,
    loading,
    authReady,
    authOperationRef,
    // loadContent,
    phoneNumbersData
  }, functions: {
    processLL,
    processGL,
    logout,
    signup,
    temporaryStore,
    validateNumber,
    validateEmail,
    displayElements,
    fetchFromBackend,
    displayError,
    processError,
    // setLoadContent,
    setPhoneNumbersData,
    authenticatedFetch,
  }}

  


  // return <AuthContext.Provider value={{ user, accessToken, gateway, processLL, processGL, logout, signup, loading }}>{children}</AuthContext.Provider>;
  return <AuthContext.Provider value={{ values }}>{children}</AuthContext.Provider>;
}

export default AuthProvider;