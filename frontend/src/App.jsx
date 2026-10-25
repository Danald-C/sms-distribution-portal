import React, { useState } from 'react';
import AuthProvider, { useAuth, ProtectedRoute } from './Contexts/auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import GetContacts from './components/GetContacts/gc-file.jsx';
import ContactUs from './pages/ContactUs.jsx';
// import GoogleLoginButton from './components/Auth/GoogleLoginButton.jsx';
// import SmsPortalDemo from './pages/composeSMS.jsx';
// import LetsFindOut from  './pages/letsfindout.jsx';

import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import './App.css'

import { Routes, Route } from 'react-router-dom'
import LoginPage from './components/LoginPage/lp-file.jsx'
import ProfilePage from './components/ProfilePage/pp-file.jsx'
import SignupPage from './components/SignupPage/sp-file.jsx'
import VerifyContactPage from './components/Verification/Verify-Contact.jsx'
import ComposeSMS from './components/SmsComposer/sc-file.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';

// http://localhost:3000

function App() {
  // const [count, setCount] = useState(0)

  return (
    <>
      {/* <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p> */}

      {/* <AuthProvider> */}
        {/* <ProtectedRoute> */}
          <Routes>
            <Route exact path="/" element={<LoginPage />} />
            <Route exact path="/verify-contact" element={<VerifyContactPage />} />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route
              path="/forgot-password"
              element={<ForgotPassword />}
            />
            <Route
              path="/reset-password"
              element={<ResetPassword />}
            />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
              } />
            <Route path="/contacts" element={
              <ProtectedRoute>
                <GetContacts />
              </ProtectedRoute>
              } />
            <Route path="/send-sms" element={
              <ProtectedRoute>
                <ComposeSMS />
              </ProtectedRoute>
              } />
            <Route path="/contact-us" element={
              <ProtectedRoute>
                <ContactUs />
              </ProtectedRoute>
              } />
          </Routes>
        {/* </ProtectedRoute> */}
      {/* </AuthProvider> */}
    </>
  )
}

export default App
