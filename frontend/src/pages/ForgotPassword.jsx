import React, { useState } from 'react';
import { useAuth } from '../Contexts/auth.jsx';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import PhoneInput from "react-phone-number-input";

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function ForgotPassword() {
    const navigate = useNavigate();
  const { values: { data, functions, setStates } } = useAuth();
  
  // Email
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  
  // General
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [changePasswordBy, setChangePasswordBy] = useState(0);

  // Phone
  const [number, setNumber] = useState('')
  const [otp, setOTP] = useState({code: '', resend: false})
  // const [otp, setOTP] = useState('');
  const [controls, setControls] = useState({isSending: false});

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setMessage('');
    setError('');

    try {
      // let endpointSuffix = "email", dataObj = {type: 0, data: {email: email.trim().toLowerCase()}};
      let endpointSuffix = "email", dataObj = {email: email.trim().toLowerCase()};
      if(changePasswordBy === 1){
        let numberErrors = functions.validateNumber(number);
        if(numberErrors.length > 0){
          throw new Error(numberErrors[0].message || 'Please check your number, something happened..');
        }

        endpointSuffix = "number";
        dataObj = {number, otp};
      }

      console.log(JSON.stringify(dataObj));
      const response = await fetch(`${API_URL}/auth/forgot-password-${endpointSuffix}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        // body: JSON.stringify({ email: email.trim() })
        body: JSON.stringify(dataObj)
      });

      const returnedData = await response.json();
      // const returnedData = {ok: false, message: 'Testing!'}

        if(changePasswordBy === 1) setControls({...controls, isSending: true});
        if (!response.ok) {
          throw new Error(returnedData.error || 'Unable to process your request. Please try again.');
        }

      
      if(changePasswordBy === 1){
        if(returnedData.complete){
          navigate(`/reset-password?type=phone&token=${otp.code}`);
        }
      }else{
        setMessage(
          returnedData.message ||
            'If an account exists for that email address, a password-reset link will be sent.'
        );
      }
    } catch (err) {
      setError(
        err.message || 'Unable to contact the server. Please try again.'
      );
    } finally {
      setLoading(false);
    }

  }

  function handleChangePasswordBy(e){
    setChangePasswordBy(Number(e.target.value));
  }

  function cancelResetOTP(){
    setChangePasswordBy(0);
    setControls({...controls, isSending: false});
    setNumber('');
    // navigate('/forgot-password');
  }

  return ( 
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100 px-4 py-12">
      {controls.isSending ?
        <form onSubmit={handleSubmit} className="space-y-5">
          <input className="w-full border rounded-lg px-4 py-3 mt-6" type="text" maxLength={6} inputMode="numeric" value={otp.code} onChange={(e) => setOTP({...otp, code: e.target.value})} placeholder="Enter 6-digit OTP" autoFocus />
          <button type="submit" disabled={loading} className="w-full mt-4 bg-primary text-black py-3 rounded-lg">Verify OTP</button>
          <button type="button" onClick={cancelResetOTP} className="w-full mt-4 bg-primary text-black py-3 rounded-lg">Cancel</button>
        </form>
        :
        <section className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl shadow-blue-900/5"> <div className="h-2 bg-gradient-to-r from-blue-600 to-blue-800" />
          <div className="px-6 py-9 sm:px-9">
            <div className="mb-7 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                🔐
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Forgot your password?
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">Enter your
                {changePasswordBy === 0 ? " email address and we'll send a reset link." : " phone number and we'll send you an otp code."}
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
                {/* Style this area only. Add border, cursor-pointer */}
                <div>
                  <span>Reset by </span>
                  <input type="radio" id='account-type-email' name='account-type' value={0} onChange={handleChangePasswordBy} checked={changePasswordBy === 0} /> <label htmlFor="account-type-email" className="mb-1 text-sm font-medium text-slate-700">Email</label> &nbsp;&nbsp;&nbsp;
                  <input type="radio" id='account-type-phone' name='account-type' value={1} onChange={handleChangePasswordBy} checked={changePasswordBy === 1} /> <label htmlFor="account-type-phone" className="mb-1 text-sm font-medium text-slate-700">Phone</label>
                  <em>We will be reseting by which mode you will choose.</em>
                </div>
                  {changePasswordBy === 0 ? 
                    <div>
                      <label htmlFor="forgot-password-email" className="mb-2 block text-sm font-medium text-slate-700">Email address</label>
                      <input id="forgot-password-email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20" autoFocus />
                    </div>
                    :
                    <div>
                      <label htmlFor="forgot-password-number" className="mb-2 block text-sm font-medium text-slate-700">Phone Number</label>
                      <PhoneInput id="forgot-password-number" international defaultCountry="GH" value={number} onChange={setNumber} className="border p-3 rounded-lg" autoFocus />
                    </div>
                  }

                {error && (
                  <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700" >{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 font-semibold text-white shadow-md transition hover:from-blue-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {/* {loading ? 'Sending reset link...' : 'Send reset link'} */}
                  {loading ? 'Sending reset ' + (changePasswordBy === 1 ? 'otp...' : 'link...') : 'Send reset ' + (changePasswordBy === 1 ? 'otp' : 'link')}
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
      }
    </main>
  );
}
