import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import HistoricalAlerts from './pages/HistoricalAlerts';
import AIInsights from './pages/AI-insights';
import Config from './pages/Config';
import Roles from './pages/Roles';
import Reports from './pages/Reports';

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
      <Route path="/" element={<Dashboard darkMode={darkMode} setDarkMode={setDarkMode} />} />
      <Route path="/historical" element={<HistoricalAlerts darkMode={darkMode} setDarkMode={setDarkMode} />} />
      <Route path="/ai-insights" element={<AIInsights darkMode={darkMode} setDarkMode={setDarkMode} />} />
      <Route path="/config" element={<Config darkMode={darkMode} setDarkMode={setDarkMode} />} />
      <Route path="/roles" element={<Roles darkMode={darkMode} setDarkMode={setDarkMode} />} />
      <Route path="/reports" element={<Reports darkMode={darkMode} setDarkMode={setDarkMode} />} />
    </Routes>
  );
}

export default App;