import { useState } from "react";
import { useAuth } from '../../Contexts/auth.jsx';
import { Link, useNavigate } from 'react-router-dom';
import GoogleLoginArea from "../Auth/GoogleLoginButton.jsx";


export default function SignupPage() {
  // const { signup } = useAuth();
  const { values: { functions, setStates } } = useAuth();
  const [payload, setPayload] = useState({ name: '', email: '', password: '' });
  
    useEffect(() => {
      // Try to refresh token on app load
      function refresh() {
        if(!functions.temporaryStore({name: 'gateway', value: {}}, 0)) navigate("/");
      }
      refresh();
    }, []);
  
  async function submit(e) {
    e.preventDefault();

    try {
      console.log(setStates.GW.gateway);
      // await functions.signup(payload);
      alert('Registered — please verify your email');
    } catch (err) {
      alert(err.message || 'Register failed');
    }
  }


  //  *** ***
  function handleCredentialResponse(response) {
    // This credential is a JWT that should be sent to your backend for verification
    console.log("Encoded JWT ID token: " + response.credential);
    
    // Decoding the JWT locally (for UI updates only - NOT for security)
    const responsePayload = parseJwt(response.credential);
    console.log("ID: " + responsePayload.sub);
    console.log('Full Name: ' + responsePayload.name);
    console.log("Email: " + responsePayload.email);
  }

  function parseJwt (token) {
      var base64Url = token.split('.')[1];
      var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(window.atob(base64));
  }


  return (
    <>
      <form id="g_id_onload" data-client_id="YOUR_GOOGLE_CLIENT_ID" data-callback={handleCredentialResponse} onSubmit={submit} className="max-w-md mx-auto p-6 bg-white rounded-lg">
        <h2 className="text-2xl font-semibold mb-6">Sign up here.</h2>
        <input className="w-full p-2 mb-2 border rounded" placeholder="Full name" value={payload.name} onChange={(e) => setPayload({ ...payload, name: e.target.value })} />
        <input className="w-full p-2 mb-2 border rounded" placeholder="Email" value={payload.email} onChange={(e) => setPayload({ ...payload, email: e.target.value })} />
        {/* <input type="password" className="w-full p-2 mb-4 border rounded" placeholder="Password" value={payload.password} onChange={(e) => setPayload({ ...payload, password: e.target.value })} /> */}
        <button className="px-4 py-2 bg-indigo-600 text-white rounded">Create account</button>
      </form>
      <div className="">Have an account already? <Link to='/'>Login</Link></div>
      <GoogleLoginArea />
    </>
  );
}