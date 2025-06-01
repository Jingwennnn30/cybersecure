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
import { auth, db } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';

function PrivateRoute({ children }) {
  const [user, loading] = useAuthState(auth);
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

// RoleProtectedRoute: Only allows users with the required role(s)
function RoleProtectedRoute({ allowedRoles, children }) {
  const [user, loading] = useAuthState(auth);
  // Try to get role from sessionStorage first
  const [role, setRole] = useState(() => sessionStorage.getItem('userRole'));
  const [roleLoading, setRoleLoading] = useState(!role);

  useEffect(() => {
    const fetchRole = async () => {
      if (user && !role) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const fetchedRole = userDoc.data().role;
          setRole(fetchedRole);
          sessionStorage.setItem('userRole', fetchedRole);
        }
        setRoleLoading(false);
      } else {
        setRoleLoading(false);
      }
    };
    fetchRole();
  }, [user, role]);

  if (loading || roleLoading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(role)) return <Navigate to="/" />;

  return children;
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
          <RoleProtectedRoute allowedRoles={['admin']}>
            <Config darkMode={darkMode} setDarkMode={setDarkMode} />
          </RoleProtectedRoute>
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