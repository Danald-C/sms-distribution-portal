import { useState } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Contexts/auth.jsx';

import GoogleLoginArea from "../Auth/GoogleLoginButton.jsx";

// 1056104116569-om836dd1557e22cesib082764h73f0bd.apps.googleusercontent.com
// 1056104116569-b426g26lcqi99n98bd0cucivbif7r3rb.apps.googleusercontent.com


export default function LoginPage() {
  // const { localLogin } = useAuth();
  const { values: { functions, setStates } } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    
    try {
        console.log("Login Page", JSON.stringify({name: null, email}));
      const response = await fetch('http://localhost:4000/api/auth/usersign-oauth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({name: null, email}),
        })
        const data = await response.json();
        
      if (data.Success) {
        functions.processLL(data);
        navigate(data.newUser ? "/verify-contact" : "/dashboard");
      }else{
        navigate("/");
      }
    } catch (error) {
      console.error("User authentication failed:", error);
    }
  }

  return (
    <>
      <form data-type="standard" onSubmit={submit} className="max-w-md mx-auto p-6 bg-white rounded-lg">
        <h2 className="text-2xl font-semibold mb-6">Sign in here.</h2>
        {/* <h1 className="text-2xl font-bold mb-6">Sign in to SMS Platform</h1> */}
        <input className="w-full p-2 mb-2 border rounded" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded">{loading ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <div className="">Or <Link to='/signup'>Sign up</Link> if you're new.</div>
      <GoogleLoginArea />
    </>
  )
}