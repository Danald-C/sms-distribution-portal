import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function ForgotPassword() {
const [email, setEmail] = useState('');
const [loading, setLoading] = useState(false);
const [message, setMessage] = useState('');
const [error, setError] = useState('');

async function handleSubmit(event) {
event.preventDefault();

setLoading(true);
setMessage('');
setError('');

try {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email: email.trim() })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || 'Unable to process your request. Please try again.'
    );
  }

  setMessage(
    data.message ||
      'If an account exists for that email address, a password-reset link will be sent.'
  );
} catch (err) {
  setError(
    err.message || 'Unable to contact the server. Please try again.'
  );
} finally {
  setLoading(false);
}

}

return ( <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100 px-4 py-12"> <section className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl shadow-blue-900/5"> <div className="h-2 bg-gradient-to-r from-blue-600 to-blue-800" />
    <div className="px-6 py-9 sm:px-9">
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
          🔐
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Forgot your password?
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Enter your email address and we'll send a reset link.
        </p>
      </div>

      {message ? (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800"
        >
          {message}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="forgot-password-email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email address
            </label>

            <input
              id="forgot-password-email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              autoFocus
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 font-semibold text-white shadow-md transition hover:from-blue-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Sending reset link...' : 'Send reset link'}
          </button>
        </form>
      )}

      <div className="mt-7 text-center">
        <Link
          to="/"
          className="text-sm font-semibold text-blue-700 hover:text-blue-900"
        >
          ← Back to sign in
        </Link>
      </div>
    </div>
  </section>
</main>

);
}
