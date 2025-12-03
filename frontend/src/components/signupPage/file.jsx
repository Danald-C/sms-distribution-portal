import { useState } from "react";
import { useAuth } from '../contexts/auth.jsx';
import { Link, useNavigate } from 'react-router-dom';


export default function SignupPage() {
  const { register } = useAuth();
  const [payload, setPayload] = useState({ name: '', email: '', password: '' });
  console.log('register payload');

  async function submit(e) {
    e.preventDefault();
    try {
      await register(payload);
      alert('Registered — please verify your email');
    } catch (err) {
      alert(err.message || 'Register failed');
    }
  }

  return (
    <>
      <form onSubmit={submit} className="max-w-md mx-auto p-6 bg-white rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Register</h2>
        <input className="w-full p-2 mb-2 border rounded" placeholder="Full name" value={payload.name} onChange={(e) => setPayload({ ...payload, name: e.target.value })} />
        <input className="w-full p-2 mb-2 border rounded" placeholder="Email" value={payload.email} onChange={(e) => setPayload({ ...payload, email: e.target.value })} />
        <input type="password" className="w-full p-2 mb-4 border rounded" placeholder="Password" value={payload.password} onChange={(e) => setPayload({ ...payload, password: e.target.value })} />
        <button className="px-4 py-2 bg-indigo-600 text-white rounded">Create account</button>
      </form>
      <div className="">Have an account already? <Link to='/'>Login</Link></div>
    </>
  );
}