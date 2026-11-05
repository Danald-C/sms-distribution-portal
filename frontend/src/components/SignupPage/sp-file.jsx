import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../Contexts/auth.jsx';
import GoogleLoginArea from '../Auth/GoogleLoginButton.jsx';
import PhoneInput from "react-phone-number-input";

export default function SignupPage() {
  const navigate = useNavigate();
  const { values: { data, functions, setStates } } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || '/api';

  const [payload, setPayload] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [number, setNumber] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verifyBy, setVerifyBy] = useState(0);
  
  let localAlerts = [[], 0];
  const [alerts, setAlerts] = useState(localAlerts);

  // functions.temporaryStore({name: "redirect"}, 2)
  // console.log("PLEASE CHECK FOR ME: ", functions.temporaryStore({name: "redirect"}, 0, true))
  // console.log("PLEASE CHECK FOR ME: ", functions.temporaryStore({name: "token"}))

  async function signinNow(e) {
    e.preventDefault();

    setMessage('');
    setError('');
    
    const name = payload.name.trim();
    const email = payload.email.trim().toLowerCase();
    // const num = number.trim();

    let endpointSuffix = verifyBy === 0 ? 'email' : 'number';
    
    if (!name || !email || !payload.password) {
      // setError('Please complete all required fields.');
      localAlerts[0].push({number: ++localAlerts[1], type: 'caution', message: 'Please complete all required fields.'});
      return;
    }
    
    let numberErrors = functions.validateNumber(number);
    if(numberErrors.length > 0){
      numberErrors.map(each => localAlerts[0].push({number: ++localAlerts[1], type: each.type, message: each.message}));
      setAlerts(localAlerts);
      
      return
    }
    
    if (payload.password.length < 8) {
      // setError('Your password must contain at least 8 characters.');
      localAlerts[0].push({number: ++localAlerts[1], type: 'caution', message: 'Your password must contain at least 8 characters.'});
      setAlerts(localAlerts);

      return;
    }
    
    if (payload.password !== payload.confirmPassword) {
      // setError('Your passwords do not match.');
      localAlerts[0].push({number: ++localAlerts[1], type: 'caution', message: 'Your passwords do not match.'});
      setAlerts(localAlerts);

      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch(`${API_URL}/auth/register-${endpointSuffix}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          number,
          password: payload.password
        })
      });
      
      const result = await response.json();

      // console.log('Check Validate Number', result)
      
      if (!result.Success || result.Success && result.newUser.taken) {
      // if (!result.Success) {
        localAlerts[0].push({number: ++localAlerts[1], type: 'caution', message: result.error || 'Sorry, you\'re not authorized to use this account. Registration failed. Please try again.'});
        setAlerts(localAlerts);

        return

        // throw new Error(
        //   result.error || 'Registration failed. Please try again.'
        // );
      }
      
      if(verifyBy === 1){
        if(!result.newUser.taken){
          // Save the newly issued access token.
          functions.processLL(result);
          navigate("/verify-contact"); // Redirect to OTP number verifying page
        }
      }else{
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
        setNumber('');
      }
    } catch (err) {
      setError(err.message || 'Unable to register right now.');
    } finally {
      setLoading(false);
    }
  }

  function handleVerifyBy(e){
    setVerifyBy(Number(e.target.value));
  }

  return (
    <>
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50/40 to-emerald-50/50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xl sm:p-8">
            <h1 className="mb-2 text-2xl font-bold text-slate-800">
              Create your account
            </h1>

            <p className="mb-6 text-sm text-slate-500">
              Carefully fill the form below to register.
            </p>

            {message && (
              <div
                role="status"
                className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
              >
                {message}
              </div>
            )}

            {/* {error && (
              <div
                role="alert"
                className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
              </div>
            )} */}
            {alerts[0].length > 0 && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{alerts[0].map((each, i) => <p key={i+1}>{each.message}</p>)}</div>}

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
                  htmlFor="signup-email"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Phone Number
                </label>

                {/* Style here */}
                <PhoneInput international defaultCountry="GH" value={number} onChange={setNumber} className="border p-3 rounded-lg" />
              </div>

              {/* Add Password Strength display */}
              <div>
                <label
                  htmlFor="signup-password"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>


                <div className="relative">
                  <input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    value={payload.password}
                    onChange={(e) =>
                      setPayload({ ...payload, password: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 pr-20"
                    placeholder="At least 8 characters"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-3 my-auto h-fit text-sm font-medium text-blue-700 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="signup-confirm-password"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Confirm password
                </label>

                <div className="relative">
                  <input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
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
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 pr-20"
                    placeholder="Enter your password again"
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((previous) => !previous)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    aria-pressed={showConfirmPassword}
                    className="absolute inset-y-0 right-3 my-auto h-fit text-sm font-medium text-blue-700 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              
              {/* Style this area only. Add border, cursor-pointer */}
              <div>
                <span>Verify me by </span>
                <input type="radio" id='account-type-email' name='account-type' value={0} onChange={handleVerifyBy} checked={verifyBy === 0} /> <label htmlFor="account-type-email" className="mb-1 text-sm font-medium text-slate-700">Email</label> &nbsp;&nbsp;&nbsp;
                <input type="radio" id='account-type-phone' name='account-type' value={1} onChange={handleVerifyBy} checked={verifyBy === 1} /> <label htmlFor="account-type-phone" className="mb-1 text-sm font-medium text-slate-700">Phone</label>
                <em>We will be verifying you by which mode you will choose.</em>
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
    </>
  );
}