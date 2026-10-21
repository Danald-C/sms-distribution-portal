import { useState } from 'react';
import { Link } from 'react-router-dom';
import GoogleLoginArea from '../Auth/GoogleLoginButton.jsx';

export default function SignupPage() {
  const API_URL = import.meta.env.VITE_API_URL || '/api';

  const [payload, setPayload] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function signinNow(e) {
    e.preventDefault();

    setMessage('');
    setError('');

    const name = payload.name.trim();
    const email = payload.email.trim().toLowerCase();

    if (!name || !email || !payload.password) {
      setError('Please complete all required fields.');
      return;
    }

    if (payload.password.length < 8) {
      setError('Your password must contain at least 8 characters.');
      return;
    }

    if (payload.password !== payload.confirmPassword) {
      setError('Your passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          password: payload.password
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'Registration failed. Please try again.'
        );
      }

      setMessage(
        result.message ||
        'Registration successful. Please check your email to verify your account.'
      );

      setPayload({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
    } catch (err) {
      setError(err.message || 'Unable to register right now.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50/40 to-emerald-50/50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xl sm:p-8">
          <h1 className="mb-2 text-2xl font-bold text-slate-800">
            Create your account
          </h1>

          <p className="mb-6 text-sm text-slate-500">
            Register to start managing your SMS campaigns.
          </p>

          {message && (
            <div
              role="status"
              className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
            >
              {message}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <form onSubmit={signinNow} className="space-y-4">
            <div>
              <label
                htmlFor="signup-name"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Full name
              </label>

              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                maxLength={150}
                required
                value={payload.name}
                onChange={(e) =>
                  setPayload({ ...payload, name: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label
                htmlFor="signup-email"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Email address
              </label>

              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                value={payload.email}
                onChange={(e) =>
                  setPayload({ ...payload, email: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="signup-password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                value={payload.password}
                onChange={(e) =>
                  setPayload({ ...payload, password: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label
                htmlFor="signup-confirm-password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Confirm password
              </label>

              <input
                id="signup-confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                value={payload.confirmPassword}
                onChange={(e) =>
                  setPayload({
                    ...payload,
                    confirmPassword: e.target.value
                  })
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                placeholder="Enter your password again"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 font-semibold text-white shadow-md transition hover:from-blue-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs uppercase tracking-wide text-slate-400">
              or sign up with
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="flex justify-center">
            <GoogleLoginArea />
          </div>
        </div>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link
            to="/"
            className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}