import { useState } from "react";
// import { useAuth } from '../../App.jsx';
import { useAuth } from '../../Contexts/auth.jsx';
import { Link } from 'react-router-dom';

import GoogleLoginArea from "../Auth/GoogleLoginButton.jsx";

/* export default function LoginPage() {

  return (
    <>
      //
    </>
  );
} */
// 1056104116569-om836dd1557e22cesib082764h73f0bd.apps.googleusercontent.com
// 1056104116569-b426g26lcqi99n98bd0cucivbif7r3rb.apps.googleusercontent.com


export default function LoginPage() {
  const { localLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await localLogin(email, password);
      // redirect to dashboard
    } catch (err) {
      alert(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form class="g_id_signin" data-type="standard" onSubmit={submit} className="max-w-md mx-auto p-6 bg-white rounded-lg">
        <h2 className="text-2xl font-semibold mb-6">Sign in here.</h2>
        {/* <h1 className="text-2xl font-bold mb-6">Sign in to SMS Platform</h1> */}
        <input className="w-full p-2 mb-2 border rounded" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" className="w-full p-2 mb-4 border rounded" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded">{loading ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <div className="">Or <Link to='/signup'>Sign up</Link> if you're new.</div>
      <GoogleLoginArea />
    </>
  )
}