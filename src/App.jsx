import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import HistoricalAlerts from './pages/HistoricalAlerts';
import AIInsights from './pages/AI-insights';
import Config from './pages/Config';
import Roles from './pages/Roles';
import Reports from './pages/Reports';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import { auth } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

function PrivateRoute({ children }) {
  const [user, loading] = useAuthState(auth);
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

function App() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Dashboard darkMode={darkMode} setDarkMode={setDarkMode} />
          </PrivateRoute>
        }
      />
      <Route
        path="/historical"
        element={
          <PrivateRoute>
            <HistoricalAlerts darkMode={darkMode} setDarkMode={setDarkMode} />
          </PrivateRoute>
        }
      />
      <Route
        path="/ai-insights"
        element={
          <PrivateRoute>
            <AIInsights darkMode={darkMode} setDarkMode={setDarkMode} />
          </PrivateRoute>
        }
      />
      <Route
        path="/config"
        element={
          <PrivateRoute>
            <Config darkMode={darkMode} setDarkMode={setDarkMode} />
          </PrivateRoute>
        }
      />
      <Route
        path="/roles"
        element={
          <PrivateRoute>
            <Roles darkMode={darkMode} setDarkMode={setDarkMode} />
          </PrivateRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <PrivateRoute>
            <Reports darkMode={darkMode} setDarkMode={setDarkMode} />
          </PrivateRoute>
        }
      />
      {/* Redirect any unknown route to login */}
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default App;