import { useState } from "react";
// import { useAuth } from '../../App.jsx';
import { useAuth } from '../contexts/auth.jsx';
import { Link, useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      // redirect to dashboard
    } catch (err) {
      alert(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <form onSubmit={submit} className="max-w-md mx-auto p-6 bg-white rounded-lg">
      <h2 className="text-lg font-semibold mb-4">Login</h2>
      <input className="w-full p-2 mb-2 border rounded" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" className="w-full p-2 mb-4 border rounded" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded">{loading ? 'Signing in…' : 'Sign in'}</button>
    </form>
    <div className="">Or <Link to='/signup'>Signup</Link></div>
    </>
  );
}