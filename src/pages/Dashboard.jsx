import React, { useEffect, useState } from 'react';
import { Card, Title, Text, Grid, Metric, AreaChart } from '@tremor/react';
import Navigation from '../components/Navigation';
import { SunIcon, MoonIcon, LinkIcon, BellIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import AIChatbot from '../components/AIChatbot';
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useRole } from '../contexts/RoleContext';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

// Telegram SVG icon (since Heroicons doesn't have Telegram)
const TelegramIcon = (props) => (
  <svg {...props} fill="currentColor" viewBox="0 0 24 24">
    <path d="M21.944 2.506a1.5 1.5 0 0 0-1.63-.23L2.7 10.01a1.5 1.5 0 0 0 .13 2.77l4.45 1.56 1.7 5.09a1.5 1.5 0 0 0 2.7.23l2.13-3.5 4.38 3.23a1.5 1.5 0 0 0 2.37-1.01l2.25-13.5a1.5 1.5 0 0 0-.17-1.34z" />
  </svg>
);

// --- Real Data State ---
const initialStats = {
  alertsToday: 0,
  criticalAlerts: 0,
  aiProcessed: 0,
  aiAnalyzed: 0,
  systemHealth: "Unknown",
  alertsChange: 0,
  alertTrends: [],
  severityDist: [],
};

function Dashboard({ darkMode, setDarkMode }) {
  const sidebarClass = "w-72 bg-white dark:bg-gray-900 p-6 shadow-xl border-r border-gray-200 dark:border-gray-800 fixed h-screen flex flex-col";
  const mainClass = "flex-1 pl-80 p-8 overflow-auto bg-background-light dark:bg-gray-900 transition-colors min-h-screen";

  // Telegram
  const telegramLink = "https://t.me/+ecL0Fe0dTntkN2Nl";
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(telegramLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // --- Dashboard Stats State ---
  const [stats, setStats] = useState(initialStats);

  // Fetch dashboard stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/dashboard-stats`);
        if (res.ok) {
          const data = await res.json();
          setStats({
            alertsToday: data.alertsToday || 0,
            criticalAlerts: data.criticalAlerts || 0,
            aiProcessed: data.aiProcessed || 0,
            aiAnalyzed: data.aiAnalyzed || 0,
            systemHealth: data.systemHealth || "Unknown",
            alertsChange: data.alertsChange || 0,
            alertTrends: Array.isArray(data.alertTrends) ? data.alertTrends : [],
            severityDist: Array.isArray(data.severityDist) ? data.severityDist : [],
          });
        }
      } catch (err) {
        // Optionally handle error
      }
    };
    fetchStats();
  }, []);

  // Live Alerts state
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);

  // Fetch live alerts from backend every 5 seconds
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/alerts`);
        if (res.ok) {
          const data = await res.json();
          setLiveAlerts(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        // Optionally handle error
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  // Dismiss handler
  const handleDismiss = (idx) => {
    setLiveAlerts((prev) => prev.filter((_, i) => i !== idx));
  };

  // Toggle switch
  const Toggle = (
    <label className="flex items-center cursor-pointer select-none">
      <div className="relative">
        <input
          type="checkbox"
          checked={darkMode}
          onChange={() => setDarkMode(!darkMode)}
          className="sr-only"
          aria-label="Toggle dark mode"
        />
        <div className="block w-14 h-8 rounded-full bg-gray-300 dark:bg-gray-700 transition-colors"></div>
        <div
          className={`dot absolute left-1 top-1 w-6 h-6 rounded-full flex items-center justify-center transition transform
            ${darkMode ? 'translate-x-6 bg-gray-900 text-yellow-400' : 'bg-white text-gray-700'}
          `}
        >
          {darkMode ? (
            <MoonIcon className="w-4 h-4" />
          ) : (
            <SunIcon className="w-4 h-4" />
          )}
        </div>
      </div>
      <span className="ml-3 text-base text-gray-700 dark:text-gray-200 font-medium">
        {darkMode ? 'Dark' : 'Light'}
      </span>
    </label>
  );

  // Helper for badge color
  const getSeverityBadge = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-red-600';
      case 'high':
        return 'bg-amber-500';
      case 'medium':
        return 'bg-yellow-400 text-gray-900';
      case 'low':
        return 'bg-green-600';
      default:
        return 'bg-gray-400';
    }
  };

  // Count alerts by severity for summary
  const severitySummary = liveAlerts.reduce(
    (acc, alert) => {
      const sev = alert.severity?.toLowerCase();
      if (sev && acc[sev] !== undefined) acc[sev]++;
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0 }
  );

  // --- Role Request Notification Logic ---
  const role = useRole();
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [roleRequests, setRoleRequests] = useState([]);

  // Fetch pending role requests for admin
  useEffect(() => {
    if (role === "admin") {
      const fetchRequests = async () => {
        const querySnapshot = await getDocs(collection(db, "roleRequests"));
        const requests = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(req => req.status === "pending");
        setRoleRequests(requests);
      };
      fetchRequests();
      // Optionally poll for new requests every 10s
      const interval = setInterval(() => {
        if (role === "admin") fetchRequests();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [role]);

  // Admin approve/reject actions (optional, for quick action in dashboard)
  const handleApprove = async (req) => {
    // Update user role in users collection
    const userRef = doc(db, "users", req.requesterUID);
    await updateDoc(userRef, { role: req.requestedRole });
    // Mark request as approved
    const reqRef = doc(db, "roleRequests", req.id);
    await updateDoc(reqRef, { status: "approved" });
    setRoleRequests(prev => prev.filter(r => r.id !== req.id));
  };
  const handleReject = async (req) => {
    const reqRef = doc(db, "roleRequests", req.id);
    await updateDoc(reqRef, { status: "rejected" });
    setRoleRequests(prev => prev.filter(r => r.id !== req.id));
  };

  // --- Notification Recipients Panel State ---
  const [showRecipientsPanel, setShowRecipientsPanel] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  // Fetch notification recipients from backend
  const handleShowRecipients = async () => {
    setShowRecipientsPanel(true);
    setLoadingRecipients(true);
    try {
      const res = await fetch('http://localhost:4000/get-notification-recipients');
      const data = await res.json();
      setRecipients(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      setRecipients([]);
    }
    setLoadingRecipients(false);
  };

  const navigate = useNavigate();

  // --- Severity Color Mapping for PieChart ---
  const severityColors = {
    critical: "#ef4444",   // red-500
    high: "#f59e42",      // orange-400
    medium: "#facc15",    // yellow-400
    low: "#22c55e",       // green-500
    unknown: "#94a3b8"    // gray-400
  };

  const pieData = stats.severityDist.map(item => ({
    name: item.name,
    value: item.value,
  }));

  return (
    <div className="min-h-screen bg-background-light dark:bg-gray-900 dark:text-gray-100 transition-colors">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className={sidebarClass}>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-primary tracking-tight">CyberSecure</h1>
            <div className="border-b border-gray-200 dark:border-gray-700 my-4" />
            <p className="text-xs text-gray-500 dark:text-gray-400">Security Analysis Dashboard</p>
          </div>
          <Navigation />
        </aside>

        {/* Main Content */}
        <main className={mainClass}>
          {/* Top bar with toggle, notification bell, and recipients icon */}
          <div className="flex justify-end items-center mb-6 gap-4">
            {/* Notification Recipients Icon (visible to all users) */}
            <button
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors relative"
              onClick={handleShowRecipients}
              aria-label="Show email notification recipients"
              title="Show email notification recipients"
            >
              <EnvelopeIcon className="w-6 h-6 text-blue-500" />
            </button>
            {/* Notification Bell (admin only) */}
            {role === "admin" && (
              <div className="relative">
                <button
                  className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setShowNotifPanel(!showNotifPanel)}
                  aria-label="Role Change Requests"
                >
                  <BellIcon className="w-6 h-6 text-amber-500" />
                  {roleRequests.length > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                      {roleRequests.length}
                    </span>
                  )}
                </button>
                {/* Notification Side Panel */}
                {showNotifPanel && (
                  <div className="fixed top-0 right-0 w-full max-w-sm h-full bg-white dark:bg-gray-900 shadow-2xl z-50 border-l border-gray-200 dark:border-gray-700 flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                      <Title className="text-lg">Notifications</Title>
                      <button
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                        onClick={() => setShowNotifPanel(false)}
                        aria-label="Close"
                      >
                        <XMarkIcon className="w-6 h-6" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      {roleRequests.length === 0 ? (
                        <Text className="text-gray-500 dark:text-gray-400">No messages</Text>
                      ) : (
                        roleRequests.map((req) => (
                          <Card key={req.id} className="mb-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                            <div>
                              <Text className="font-semibold mb-2">Role Change Request</Text>
                              <Text><b>Name:</b> {req.name || "-"}</Text>
                              <Text><b>Email:</b> {req.email}</Text>
                              <Text><b>Current Role:</b> {req.currentRole}</Text>
                              <Text><b>Requested Role:</b> {req.requestedRole}</Text>
                              <Text className="text-xs text-gray-400 mt-1">
                                {req.timestamp?.toDate ? req.timestamp.toDate().toLocaleString() : ""}
                              </Text>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button
                                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                                onClick={() => handleApprove(req)}
                              >
                                Approve
                              </button>
                              <button
                                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                onClick={() => handleReject(req)}
                              >
                                Reject
                              </button>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {Toggle}
          </div>

          {/* Notification Recipients Side Panel */}
          {showRecipientsPanel && (
            <div className="fixed top-0 right-0 w-full max-w-md h-full bg-white dark:bg-gray-900 shadow-2xl z-50 border-l border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300">
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">
                  Email Notification Recipients
                </span>
                <button
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={() => setShowRecipientsPanel(false)}
                  aria-label="Close"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
                {loadingRecipients ? (
                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    <svg className="animate-spin h-5 w-5 mr-3 text-blue-500" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Loading...
                  </div>
                ) : recipients.length === 0 ? (
                  <span className="text-gray-500 dark:text-gray-400">No recipients found</span>
                ) : (
                  <ul className="space-y-4">
                    {recipients.map((user, idx) => (
                      <li key={idx} className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-lg uppercase">
                          {user.name ? user.name.charAt(0) : user.email.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{user.name || user.email}</span>
                            <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium
                              ${user.role === "admin"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200"
                                : "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200"
                              }`}>
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{user.email}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Dashboard</h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg">Real-time security monitoring and analysis</p>
          </div>

          {/* Telegram Group Section */}
          <div className="flex items-center gap-3 mb-6">
            <a
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
              title="Open Telegram Group"
            >
              <TelegramIcon className="w-5 h-5" />
              <span className="font-medium">Telegram Group</span>
            </a>
            <button
              onClick={handleCopy}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Copy Telegram Group Link"
              type="button"
            >
              <LinkIcon className="w-5 h-5 text-blue-500" />
            </button>
            {copied && (
              <span className="ml-2 text-xs text-green-600 dark:text-green-400 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow">
                Copied the telegram group invite link
              </span>
            )}
          </div>
          {/* End Telegram Group Section */}

          {/* Stats Grid */}
          <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-6 mb-6">
            <Card decoration="top" decorationColor="blue" className="hover:shadow-glow transition-shadow duration-200">
              <Text>Alerts Today</Text>
              <Metric className="text-primary">{stats.alertsToday}</Metric>
              <Text className="text-xs text-success-light mt-2">
                {stats.alertsChange >= 0 ? "↑" : "↓"} {Math.abs(stats.alertsChange)}% from yesterday
              </Text>
            </Card>
            <Card decoration="top" decorationColor="red" className="hover:shadow-glow transition-shadow duration-200">
              <Text>Critical Alerts</Text>
              <Metric className="text-danger">{stats.criticalAlerts}</Metric>
              <Text className="text-xs text-danger-light mt-2">Requires immediate attention</Text>
            </Card>
            <Card decoration="top" decorationColor="blue" className="hover:shadow-glow transition-shadow duration-200">
              <Text>AI Processed</Text>
              <Metric className="text-info">{stats.aiProcessed}%</Metric>
              <Text className="text-xs text-info-light mt-2">{stats.aiAnalyzed} alerts analyzed</Text>
            </Card>
            <Card decoration="top" decorationColor="green" className="hover:shadow-glow transition-shadow duration-200">
              <Text>System Health</Text>
              <Metric className="text-success">{stats.systemHealth}</Metric>
              <Text className="text-xs text-success-light mt-2">
                {stats.systemHealth === "Good" ? "All systems operational" : "Check system status"}
              </Text>
            </Card>
          </Grid>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card className="hover:shadow-card transition-shadow duration-200">
              <Title className="text-gray-900 dark:text-gray-100">Alert Trends</Title>
              <Text className="mt-2 text-gray-500 dark:text-gray-300">2-month alert history and resolution rate</Text>
              <AreaChart
                className="mt-6 h-72"
                data={stats.alertTrends}
                index="date"
                categories={["Alerts"]}
                colors={["blue"]}
                valueFormatter={(number) => number.toString()}
                showAnimation={true}
                showLegend={true}
                showGridLines={false}
                showYAxis={true}
                showXAxis={false}
              />
            </Card>

            <Card className="hover:shadow-card transition-shadow duration-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <Title className="text-gray-900 dark:text-gray-100">Alert Severity Distribution</Title>
              <Text className="mt-2 text-gray-600 dark:text-gray-300">Current alert levels by severity</Text>
              <div className="mt-6 flex justify-center">
                <PieChart width={320} height={320}>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    labelLine={true}
                    label
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={severityColors[entry.name] || "#8884d8"} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </div>
            </Card>
          </div>

          {/* Live Alerts Feed */}
          <Card className="hover:shadow-card transition-shadow duration-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-amber-500">
            <div className="flex justify-between items-center mb-4">
              <div>
                <Title className="text-gray-900 dark:text-gray-100">Live Alerts</Title>
                <Text className="mt-2 text-gray-500 dark:text-gray-300">Most recent security notifications</Text>
              </div>
              {/* Removed View All button */}
            </div>
            {/* Severity summary badges */}
            <div className="flex gap-2 mb-4">
              <span className="bg-red-600 text-white px-2 py-1 rounded text-xs">Critical: {severitySummary.critical}</span>
              <span className="bg-amber-500 text-white px-2 py-1 rounded text-xs">High: {severitySummary.high}</span>
              <span className="bg-yellow-400 text-gray-900 px-2 py-1 rounded text-xs">Medium: {severitySummary.medium}</span>
              <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">Low: {severitySummary.low}</span>
            </div>
            <div className="space-y-4">
              {liveAlerts.length === 0 ? (
                <div className="p-4 text-gray-500 dark:text-gray-400">No live alerts.</div>
              ) : (
                liveAlerts
                  .slice(0, 4)
                  .map((alert, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-amber-500 transition-colors duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <Text className="font-medium text-gray-900 dark:text-gray-100">
                            {alert.name}
                          </Text>
                          <Text className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                            {alert.short_description}
                          </Text>
                          <div className="mt-1 flex gap-4 flex-wrap">
                            <span className="text-xs text-gray-700 dark:text-gray-200">
                              <b>Risk Score:</b> {alert.risk_score}
                            </span>
                            <span className="text-xs text-gray-700 dark:text-gray-200">
                              <b>Severity:</b> {alert.severity}
                            </span>
                            {alert.timestamp && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(alert.timestamp).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`px-3 py-1 text-xs rounded-full text-white ${getSeverityBadge(alert.severity)}`}>
                          {alert.severity ? alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1) : 'Unknown'}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center space-x-4">
                        <button
                          className="text-xs text-primary hover:text-primary-hover transition-colors"
                          onClick={() => setSelectedAlert(alert)}
                        >
                          Details
                        </button>
                        <button
                          className="text-xs text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                          onClick={() => handleDismiss(idx)}
                        >
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
            {/* Modal for Alert Details */}
            {selectedAlert && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl relative border border-blue-200 dark:border-blue-900">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-blue-50 dark:bg-blue-950 rounded-t-xl">
                    <div className="flex items-center gap-3">
                      {/* Alert icon */}
                      <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
                      </svg>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedAlert.name}</h3>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {selectedAlert.timestamp ? new Date(selectedAlert.timestamp).toLocaleString() : ""}
                        </div>
                      </div>
                    </div>
                    <button
                      className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      onClick={() => setSelectedAlert(null)}
                      aria-label="Close"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {/* Body */}
                  <div className="px-8 py-6">
                    <div className="mb-4 flex flex-wrap gap-6">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">IP</div>
                        <div className="font-semibold">{selectedAlert.ip}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Port</div>
                        <div className="font-semibold">{selectedAlert.port}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Severity</div>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold
                          ${selectedAlert.severity === "critical"
                            ? "bg-red-600 text-white"
                            : selectedAlert.severity === "high"
                              ? "bg-red-200 text-red-800"
                              : selectedAlert.severity === "medium"
                                ? "bg-yellow-200 text-yellow-800"
                                : "bg-green-200 text-green-800"
                          }`}>
                          {selectedAlert.severity}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Risk Score</div>
                        <div className="font-semibold">{selectedAlert.risk_score}</div>
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reason</div>
                      <div className="text-sm text-gray-800 dark:text-gray-200">{selectedAlert.reason}</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Threat Category</div>
                        <div className="font-semibold">{selectedAlert.threat_category}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Sub Type</div>
                        <div className="font-semibold">{selectedAlert.sub_type}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Host Name</div>
                        <div className="font-semibold">{selectedAlert.hostname}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Region</div>
                        <div className="font-semibold">{selectedAlert.region_name}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Country</div>
                        <div className="font-semibold">{selectedAlert.country_name}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </main>
        {/* AI Chatbot (always visible, fixed position) */}
        <AIChatbot />
      </div>
    </div>
  );
}

export default Dashboard;