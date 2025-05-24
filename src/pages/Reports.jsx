import React from 'react';
import { Card, Title, Text } from '@tremor/react';
import Navigation from '../components/Navigation';

function Reports({ darkMode, setDarkMode }) {
    // Sidebar and main content styling
    const sidebarClass = "w-72 bg-white dark:bg-gray-900 p-6 shadow-xl border-r border-gray-200 dark:border-gray-800 fixed h-screen flex flex-col";
    // Add extra padding-left to mainClass for spacing between sidebar and content
    const mainClass = "flex-1 pl-80 p-8 overflow-auto bg-background-light dark:bg-gray-900 transition-colors min-h-screen";

    // Toggle switch (standardized position)
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
                        // Moon icon
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                        </svg>
                    ) : (
                        // Sun icon
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 15a5 5 0 100-10 5 5 0 000 10zm0 2a7 7 0 110-14 7 7 0 010 14zm0-16a1 1 0 011 1v2a1 1 0 11-2 0V2a1 1 0 011-1zm0 16a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1zm8-8a1 1 0 01-1 1h-2a1 1 0 110-2h2a1 1 0 011 1zm-16 0a1 1 0 011 1H2a1 1 0 110-2h2a1 1 0 011 1zm12.071 5.071a1 1 0 010 1.415l-1.414 1.414a1 1 0 11-1.415-1.415l1.415-1.414a1 1 0 011.414 0zm-10.142 0a1 1 0 010 1.415L4.93 17.9a1 1 0 11-1.415-1.415l1.415-1.414a1 1 0 011.414 0zm10.142-10.142a1 1 0 00-1.415 0L13.9 4.93a1 1 0 101.415 1.415l1.414-1.415a1 1 0 000-1.414zm-10.142 0a1 1 0 00-1.415 0L2.1 4.93A1 1 0 103.515 6.343l1.415-1.415a1 1 0 000-1.414z" />
                        </svg>
                    )}
                </div>
            </div>
            <span className="ml-3 text-base text-gray-700 dark:text-gray-200 font-medium">
                {darkMode ? 'Dark' : 'Light'}
            </span>
        </label>
    );

    return (
        <div className="min-h-screen bg-background-light text-text-default dark:bg-gray-900 dark:text-gray-100 transition-colors">
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
                    {/* Standardized Toggle Switch Position */}
                    <div className="flex justify-end mb-6">
                        {Toggle}
                    </div>

                    {/* Heading Section - Standardized with Dashboard */}
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Reports</h2>
                        <p className="text-gray-600 dark:text-gray-300 text-lg">AI-powered security analysis reports and predictions</p>
                    </div>

                    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <div className="text-center py-12">
                            <Title className="text-gray-900 dark:text-gray-100 mb-4">Coming Soon</Title>
                            <Text className="text-gray-600 dark:text-gray-300">
                                AI-powered security analysis and prediction features are currently under development.
                                This section will provide detailed reports and insights based on AI model analysis.
                            </Text>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                            <Title className="text-gray-900 dark:text-gray-100">Planned Features</Title>
                            <div className="mt-4 space-y-2">
                                <Text className="text-gray-700 dark:text-gray-200">• Predictive Threat Analysis</Text>
                                <Text className="text-gray-700 dark:text-gray-200">• Risk Assessment Reports</Text>
                                <Text className="text-gray-700 dark:text-gray-200">• Security Posture Evaluation</Text>
                                <Text className="text-gray-700 dark:text-gray-200">• Trend Analysis and Forecasting</Text>
                            </div>
                        </Card>

                        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                            <Title className="text-gray-900 dark:text-gray-100">Benefits</Title>
                            <div className="mt-4 space-y-2">
                                <Text className="text-gray-700 dark:text-gray-200">• Proactive Threat Detection</Text>
                                <Text className="text-gray-700 dark:text-gray-200">• Data-Driven Decision Making</Text>
                                <Text className="text-gray-700 dark:text-gray-200">• Automated Risk Assessment</Text>
                                <Text className="text-gray-700 dark:text-gray-200">• Enhanced Security Planning</Text>
                            </div>
                        </Card>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Reports;