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
  const [alerts, setAlerts] = useState([])

  async function submit(e) {
    e.preventDefault();

    try {
      if(!functions.validateEmail(email)){
        setAlerts([{from: 1, type: "caution", message: "Invalid email."}, ...alerts]);
        return false;
      }
    
      setLoading(true);
        console.log("Login Page", JSON.stringify({name: null, email}));
      // const response = await fetch('http://localhost:4000/api/auth/usersign-oauth', {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/usersign-oauth`, {
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
      setAlerts([{from: 2, type: "caution", message: "Sorry. This process failed."}, ...alerts]);
    }finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50/40 to-emerald-50/50 flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      {alerts.length > 0 && functions.displayError(alerts)}
      <div className="w-full max-w-md space-y-6 sm:space-y-8">

        {/* Brand header */}
        <div className="text-center">
          <div
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-emerald-500 shadow-lg shadow-blue-500/20 transition-transform duration-300 hover:scale-105"
            aria-hidden="true"
          >
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
            SMS Distribution Portal
          </h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Sign in to manage your SMS campaigns
          </p>
        </div>

        {/* Login card */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/60">
          <form
            data-type="standard"
            onSubmit={submit}
            className="space-y-5 p-6 sm:p-8"
          >
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Welcome back</h2>
              <p className="mt-1 text-sm text-slate-500">Enter your email to continue</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())} required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-all duration-200 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-md"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative px-6 sm:px-8">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                or continue with
              </span>
            </div>
          </div>

          {/* Google login */}
          <div className="flex justify-center px-6 pb-6 pt-5 sm:px-8 sm:pb-8">
            <GoogleLoginArea />
          </div>
        </div>

        {/* Sign up link */}
        <p className="text-center text-sm text-slate-500">
          New here?{' '}
          <Link
            to="/signup"
            className="font-semibold text-emerald-600 transition-colors duration-200 hover:text-emerald-700 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
