import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './index.css'
import App from './App.jsx'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
// import AuthProvider from './components/contexts/auth.jsx';
// import LoginPage from './components/loginPage/file.jsx';
// import ProfilePage from './components/profilePage/file.jsx';
// import SignupPage from './components/signupPage/file.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <App />
      {/* <AuthProvider>
        <Routes>
          <Route exact path="/" element={<LoginPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Routes>
      </AuthProvider> */}
    </Router>
  </StrictMode>,
)
