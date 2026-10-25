import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

export default function VerifyEmail() {
  const API_URL = import.meta.env.VITE_API_URL || '/api';

  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    const token = searchParams.get('token'); // Get the token from the URL's query parameters

    if (!token) {
      setStatus('error');
      setMessage('This verification link is missing its token.');
      return;
    }

    const controller = new AbortController();

    async function verifyEmail() {
      try {
        const response = await fetch(`${API_URL}/auth/verify-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token }),
          signal: controller.signal
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || 'This verification link is invalid or expired.'
          );
        }

        setStatus('success');
        setMessage(
          result.message ||
          'Your email has been verified. You can now sign in.'
        );
      } catch (error) {
        if (error.name === 'AbortError') return;

        setStatus('error');
        setMessage(error.message || 'Email verification failed.');
      }
    }

    verifyEmail();

    return () => controller.abort();
  }, [API_URL, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-emerald-50/50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-xl">
        <div
          className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
            status === 'success'
              ? 'bg-emerald-100 text-emerald-700'
              : status === 'error'
                ? 'bg-red-100 text-red-700'
                : 'bg-blue-100 text-blue-700'
          }`}
          aria-hidden="true"
        >
          {status === 'success' ? '✓' : status === 'error' ? '!' : '…'}
        </div>

        <h1 className="mb-3 text-2xl font-bold text-slate-800">
          {status === 'success'
            ? 'Email verified!'
            : status === 'error'
              ? 'Verification unsuccessful'
              : 'Verifying your email'}
        </h1>

        <p
          role={status === 'error' ? 'alert' : 'status'}
          className="mb-6 text-sm leading-6 text-slate-600"
        >
          {message}
        </p>

        {status === 'success' && (
          <Link
            to="/"
            className="inline-block rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Continue to sign in
          </Link>
        )}

        {status === 'error' && (
          <Link
            to="/"
            className="inline-block rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Return to sign in
          </Link>
        )}
      </div>
    </div>
  );
}