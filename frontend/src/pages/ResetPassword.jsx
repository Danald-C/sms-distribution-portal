import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function ResetPassword() {
const [searchParams] = useSearchParams();
const navigate = useNavigate();

// const token = searchParams.get('token') || '';
const params = {type: searchParams.get('type') || '', token: searchParams.get('token') || ''};

const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
const [success, setSuccess] = useState(false);

async function handleSubmit(event) {
event.preventDefault();

setError('');

// if (!/^[a-f0-9]{64}$/i.test(token)) {
if (!/^[a-f0-9]{64}$/i.test(params.token)) {
  setError('This password-reset link is invalid or incomplete.');
  return;
}

if (password.length < 8 || password.length > 128) {
  setError('Your password must be between 8 and 128 characters.');
  return;
}

if (password !== confirmPassword) {
  setError('The passwords do not match.');
  return;
}

setLoading(true);

try {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    // body: JSON.stringify({ token, password })
    body: JSON.stringify({ token, password })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || 'Unable to reset your password. Please try again.'
    );
  }

  setSuccess(true);
  setPassword('');
  setConfirmPassword('');

  // Remove the reset token from the visible URL.
  window.history.replaceState(
    window.history.state,
    '',
    window.location.pathname
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
          🔑
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Reset your password
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Choose a new password for your account.
        </p>
      </div>

      {success ? (
        <div className="space-y-5">
          <div
            role="status"
            className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800"
          >
            Your password has been reset successfully. You can now sign
            in using your new password.
          </div>

          <button
            type="button"
            onClick={() => navigate('/', { replace: true })}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 font-semibold text-white transition hover:from-blue-700 hover:to-blue-800"
          >
            Go to sign in
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="reset-password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              New password
            </label>

            <div className="relative">
              <input
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your new password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pr-20 text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              />

              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-3 my-auto h-fit rounded text-sm font-medium text-blue-700 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="reset-confirm-password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Confirm new password
            </label>

            <div className="relative">
              <input
                id="reset-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Enter your new password again"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pr-20 text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword((value) => !value)
                }
                aria-label={
                  showConfirmPassword
                    ? 'Hide confirmation password'
                    : 'Show confirmation password'
                }
                aria-pressed={showConfirmPassword}
                className="absolute inset-y-0 right-3 my-auto h-fit rounded text-sm font-medium text-blue-700 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
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
            {loading ? 'Resetting password...' : 'Reset password'}
          </button>
        </form>
      )}

      {!success && (
        <div className="mt-7 text-center">
          <Link
            to="/"
            className="text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            ← Back to sign in
          </Link>
        </div>
      )}
    </div>
  </section>
</main>

);
}
