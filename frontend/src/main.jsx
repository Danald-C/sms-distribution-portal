import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AuthProvider from './Contexts/auth.jsx';
import { GoogleOAuthProvider } from '@react-oauth/google'
import './styles.css'
import './index.css'
import App from './App.jsx'
import { BrowserRouter as Router } from 'react-router-dom'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <Router>
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
          <App />
        </GoogleOAuthProvider>
      </Router>
    </AuthProvider>
  </StrictMode>,
)
