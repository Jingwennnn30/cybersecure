import React from 'react';
import { Card, Title, Text, Grid, Metric, AreaChart, DonutChart } from '@tremor/react';
import Navigation from '../components/Navigation';
import { SunIcon, MoonIcon, LinkIcon } from '@heroicons/react/24/solid';
import AIChatbot from '../components/AIChatbot';

// Telegram SVG icon (since Heroicons doesn't have Telegram)
const TelegramIcon = (props) => (
  <svg {...props} fill="currentColor" viewBox="0 0 24 24">
    <path d="M21.944 2.506a1.5 1.5 0 0 0-1.63-.23L2.7 10.01a1.5 1.5 0 0 0 .13 2.77l4.45 1.56 1.7 5.09a1.5 1.5 0 0 0 2.7.23l2.13-3.5 4.38 3.23a1.5 1.5 0 0 0 2.37-1.01l2.25-13.5a1.5 1.5 0 0 0-.17-1.34z" />
  </svg>
);

const alertData = [
  { date: '2024-01', alerts: 234, resolved: 220 },
  { date: '2024-02', alerts: 278, resolved: 260 },
  { date: '2024-03', alerts: 189, resolved: 180 },
  { date: '2024-04', alerts: 245, resolved: 230 },
  { date: '2024-05', alerts: 215, resolved: 205 },
  { date: '2024-06', alerts: 290, resolved: 275 },
];

const severityData = [
  { name: 'Critical', value: 15 },
  { name: 'High', value: 45 },
  { name: 'Medium', value: 120 },
  { name: 'Low', value: 180 },
];

function Dashboard({ darkMode, setDarkMode }) {
  const sidebarClass = "w-72 bg-white dark:bg-gray-900 p-6 shadow-xl border-r border-gray-200 dark:border-gray-800 fixed h-screen flex flex-col";
  const mainClass = "flex-1 pl-80 p-8 overflow-auto bg-background-light dark:bg-gray-900 transition-colors min-h-screen";

  // Telegram
  const telegramLink = "https://t.me/+oO1pnXg2Qh00ZDY1"; // <-- Replace with your actual link
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(telegramLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
          {/* Toggle */}
          <div className="flex justify-end mb-6">
            {Toggle}
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Dashboard</h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg">Real-time security monitoring and analysis</p>
          </div>

          {/* Telegram Channel Section */}
          <div className="flex items-center gap-3 mb-6">
            <a
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
              title="Open Telegram Channel"
            >
              <TelegramIcon className="w-5 h-5" />
              <span className="font-medium">Telegram Channel</span>
            </a>
            <button
              onClick={handleCopy}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Copy Telegram Channel Link"
              type="button"
            >
              <LinkIcon className="w-5 h-5 text-blue-500" />
            </button>
            {copied && (
              <span className="ml-2 text-xs text-green-600 dark:text-green-400 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow">
                Copied the telegram channel invite link
              </span>
            )}
          </div>
          {/* End Telegram Channel Section */}

          {/* Stats Grid */}
          <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-6 mb-6">
            <Card decoration="top" decorationColor="blue" className="hover:shadow-glow transition-shadow duration-200">
              <Text>Alerts Today</Text>
              <Metric className="text-primary">24</Metric>
              <Text className="text-xs text-success-light mt-2">↑ 12% from yesterday</Text>
            </Card>
            <Card decoration="top" decorationColor="red" className="hover:shadow-glow transition-shadow duration-200">
              <Text>Critical Alerts</Text>
              <Metric className="text-danger">3</Metric>
              <Text className="text-xs text-danger-light mt-2">Requires immediate attention</Text>
            </Card>
            <Card decoration="top" decorationColor="blue" className="hover:shadow-glow transition-shadow duration-200">
              <Text>AI Processed</Text>
              <Metric className="text-info">98%</Metric>
              <Text className="text-xs text-info-light mt-2">2,450 alerts analyzed</Text>
            </Card>
            <Card decoration="top" decorationColor="green" className="hover:shadow-glow transition-shadow duration-200">
              <Text>System Health</Text>
              <Metric className="text-success">Good</Metric>
              <Text className="text-xs text-success-light mt-2">All systems operational</Text>
            </Card>
          </Grid>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card className="hover:shadow-card transition-shadow duration-200">
              <Title className="text-gray-900 dark:text-gray-100">Alert Trends</Title>
              <Text className="mt-2 text-gray-500 dark:text-gray-300">6-month alert history and resolution rate</Text>
              <AreaChart
                className="mt-6 h-72"
                data={alertData}
                index="date"
                categories={["alerts", "resolved"]}
                colors={["blue", "green"]}
                valueFormatter={(number) => number.toString()}
                showAnimation={true}
                showLegend={true}
                showGridLines={false}
                showYAxis={false}
              />
            </Card>

            <Card className="hover:shadow-card transition-shadow duration-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <Title className="text-gray-900 dark:text-gray-100">Alert Severity Distribution</Title>
              <Text className="mt-2 text-gray-600 dark:text-gray-300">Current alert levels by severity</Text>
              <div className="mt-6">
                <DonutChart
                  data={severityData}
                  category="value"
                  index="name"
                  valueFormatter={(number) => `${number} Alerts`}
                  colors={["red", "amber", "yellow", "green"]}
                  showAnimation={true}
                  showTooltip={true}
                  className="h-72"
                />
              </div>
            </Card>
          </div>

          {/* Live Alerts Feed */}
          <Card className="hover:shadow-card transition-shadow duration-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <div>
                <Title className="text-gray-900 dark:text-gray-100">Live Alerts</Title>
                <Text className="mt-2 text-gray-500 dark:text-gray-300">Real-time security notifications</Text>
              </div>
              <button className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors duration-200">
                View All
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-amber-500 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="font-medium text-gray-900 dark:text-gray-100">Brute Force Attempt</Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-300 mt-1">Source IP: 192.168.1.100</Text>
                  </div>
                  <span className="px-3 py-1 text-xs bg-danger text-white rounded-full">Critical</span>
                </div>
                <div className="mt-3 flex items-center space-x-4">
                  <button className="text-xs text-primary hover:text-primary-hover transition-colors">
                    Investigate
                  </button>
                  <button className="text-xs text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 transition-colors">
                    Dismiss
                  </button>
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-amber-500 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="font-medium text-gray-900 dark:text-gray-100">Suspicious Login</Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-300 mt-1">User: admin@example.com</Text>
                  </div>
                  <span className="px-3 py-1 text-xs bg-warning text-white rounded-full">Warning</span>
                </div>
                <div className="mt-3 flex items-center space-x-4">
                  <button className="text-xs text-primary hover:text-primary-hover transition-colors">
                    Investigate
                  </button>
                  <button className="text-xs text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 transition-colors">
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </main>
        {/* AI Chatbot (always visible, fixed position) */}
        <AIChatbot />
      </div>
    </div>
  );
}

export default Dashboard;