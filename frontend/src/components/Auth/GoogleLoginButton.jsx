// import React from 'react'
// import { initializeApp } from 'firebase/app'
import { signInWithPopup } from 'firebase/auth'
import firebase from './FirebaseConfig'

import { useAuth } from '../../Contexts/auth.jsx';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google'


/* const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_FIREBASE_PROJECT.firebaseapp.com",
    projectId: "YOUR_FIREBASE_PROJECT",
    storageBucket: "YOUR_FIREBASE_PROJECT.appspot.com",
    messagingSenderId: "SENDER_ID",
    appId: "APP_ID"
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider(); */

/* export default function GoogleLoginButton({ onLogin }){
    async function handleLogin(){
        try {
        const result = await signInWithPopup(firebase.auth, firebase.provider)
        const user = result.user;
        const idToken = await user.getIdToken()
        const [selDir, apiDir] = [0, ['login/hybrid', 'auth/firebase-login']]
        // send to backend hybrid login
        const res = await fetch('/api/'+apiDir[selDir], {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({idToken}), credentials:'include'})
        alert('Logged in')
        } catch(e){
        console.error(e); alert('Login failed')
        }
    }

    return <button onClick={handleLogin} className="px-4 py-2 bg-red-600 text-white rounded">Sign in with Google</button>
} */

export function FirebaseAuthWatcher({ onUserChanged }) {
  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        onUserChanged(null);
      } else {
        const idToken = await firebaseUser.getIdToken();
        // optionally refresh backend session
        const res = await fetch('/api/auth/firebase-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
          credentials: 'include'
        });
        const data = await res.json();
        onUserChanged(data.user, data.accessToken);
      }
    });
  }, [onUserChanged]);
  return null;
}

/* export function LogoutButton() {
  localStorage.removeItem('token')
  return (
    <button onClick={() => signOut(auth)} className="px-4 py-2 bg-gray-600 text-white rounded-lg">
      Logout
    </button>
  );
} */


function GoogleLoginButton() {
  // const { googleLogin } = useAuth();
  const { values: { functions } } = useAuth();
  const navigate = useNavigate();

  const handleSuccess = async (credentialResponse) => {

    console.log(JSON.stringify(credentialResponse))
    
    try {
      const response = await fetch('http://localhost:4000/api/auth/googleoauth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            credential: credentialResponse.credential,
          }),
        })
      const data = await response.json()
      
      // console.log(JSON.parse(localStorage.getItem('user')))
      // console.log(functions)
      if (data.success) {
        functions.processGL(data);
        // navigate("/profile");
        navigate(functions.temporaryStore({name: 'gateway', value: {}}, 0).type === 1 ? "/verify-contact" : "/profile");
      }else{
        navigate("/");
      }
    } catch (error) {
      console.error("Google login failed:", error);
    }
  }

  const handleError = () => {
    console.log('Login Failed')
  }

  return <GoogleLogin onSuccess={handleSuccess} onError={handleError} />
}

export default function GoogleLoginArea(){
  // console.log(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  return(
    <>
      {/* {loading && <div>Loading...</div>} */}
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-2xl shadow-lg">
          <GoogleLoginButton />
        </div>
      </div>
    </>
  )
}