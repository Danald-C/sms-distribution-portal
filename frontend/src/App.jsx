import React, { useState } from 'react';
import AuthProvider, { useAuth, ProtectedRoute } from './components/contexts/auth.jsx';
// import Dashboard from './components/dashboard/file.jsx';
import SmsComposer from './components/SmsComposer/file.jsx';
// import GoogleLoginButton from './components/Auth/GoogleLoginButton.jsx';
// import SmsPortalDemo from './pages/composeSMS.jsx';
// import LetsFindOut from  './pages/letsfindout.jsx';

import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import './App.css'

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

      <AuthProvider>
        {/* <ProtectedRoute> */}
          <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
              <header className="mb-6 flex justify-between items-center">
                <h1 className="text-2xl font-bold">SMS Portal</h1>
                {/* <GoogleLoginButton /> */}
              </header>

              <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="col-span-2">
                  <SmsComposer />
                </div>
                <div>
                  {/* <Dashboard /> */}
                </div>
                <div>
                  {/* <SmsPortalDemo /> */}
                </div>
                <div>
                  {/* <LetsFindOut /> */}
                </div>
              </main>
            </div>
          </div>
        {/* </ProtectedRoute> */}
      </AuthProvider>
    </>
  )
}

export default App
