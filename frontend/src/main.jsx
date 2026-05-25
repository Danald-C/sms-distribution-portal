import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './styles.css'
import './index.css'
import App from './App.jsx'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import AuthProvider from './Contexts/auth.jsx';
import LoginPage from './components/LoginPage/lp-file.jsx'
import ProfilePage from './components/ProfilePage/pp-file.jsx'
import SignupPage from './components/SignupPage/sp-file.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
      {/* <App /> */}
      {<AuthProvider>
        <Routes>
          <Route exact path="/" element={<LoginPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Routes>
      </AuthProvider>}
      </GoogleOAuthProvider>
    </Router>
  </StrictMode>,
)
