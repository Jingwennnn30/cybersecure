import React, { useState } from "react";
import Navigation from "../components/Navigation";

const mockAlerts = [
    {
        id: 1,
        rule_name: "External Alerts",
        severity: "medium",
        status: "new",
        host_name: "Unknown",
        timestamp: "2025-06-04 13:33:46",
    },
    {
        id: 2,
        rule_name: "External Alerts",
        severity: "medium",
        status: "new",
        host_name: "Unknown",
        timestamp: "2025-06-04 13:03:46",
    },
    {
        id: 3,
        rule_name: "External Alerts",
        severity: "medium",
        status: "new",
        host_name: "Unknown",
        timestamp: "2025-06-04 12:33:46",
    },
    {
        id: 4,
        rule_name: "External Alerts",
        severity: "medium",
        status: "new",
        host_name: "Unknown",
        timestamp: "2025-06-04 12:03:46",
    },
    {
        id: 5,
        rule_name: "External Alerts",
        severity: "medium",
        status: "new",
        host_name: "Unknown",
        timestamp: "2025-06-04 11:33:46",
    },
];

function Alerts({ darkMode, setDarkMode }) {
    const [alerts] = useState(mockAlerts);
    const [selectedAlert, setSelectedAlert] = useState(null);

    return (
        <div className="min-h-screen bg-background-light text-text-default dark:bg-gray-900 dark:text-gray-100 transition-colors">
            <div className="flex min-h-screen">
                {/* Sidebar - match Dashboard style */}
                <aside className="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col py-8 px-6">
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-primary tracking-tight">CyberSecure</h1>
                        <div className="border-b border-gray-200 dark:border-gray-700 my-4" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">Security Analysis Dashboard</p>
                    </div>
                    <Navigation />
                </aside>
                <main className="flex-1 p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                            Alert Management
                        </h2>
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-xs font-semibold">
                            Timezone: Malaysia Time (GMT+8)
                        </span>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 flex flex-col md:flex-row gap-4">
                        <input
                            className="border border-gray-300 dark:border-gray-700 rounded px-3 py-2 flex-1"
                            placeholder="Search alerts..."
                            disabled
                        />
                        <select className="border border-gray-300 dark:border-gray-700 rounded px-3 py-2" disabled>
                            <option>Severity</option>
                        </select>
                        <select className="border border-gray-300 dark:border-gray-700 rounded px-3 py-2" disabled>
                            <option>Status</option>
                        </select>
                        <input
                            type="date"
                            className="border border-gray-300 dark:border-gray-700 rounded px-3 py-2"
                            disabled
                        />
                        <button className="bg-blue-600 text-white px-4 py-2 rounded font-semibold" disabled>
                            Refresh
                        </button>
                    </div>
                    <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead>
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Rule Name
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Severity
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Host
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Timestamp
                                    </th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {alerts.map((alert) => (
                                    <tr
                                        key={alert.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-900 transition cursor-pointer"
                                        onClick={() => setSelectedAlert(alert)}
                                    >
                                        <td className="px-4 py-3 font-medium">{alert.rule_name}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`px-2 py-1 rounded text-xs font-semibold ${alert.severity === "high"
                                                    ? "bg-red-100 text-red-800"
                                                    : alert.severity === "medium"
                                                        ? "bg-yellow-100 text-yellow-800"
                                                        : "bg-green-100 text-green-800"
                                                    }`}
                                            >
                                                {alert.severity}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`px-2 py-1 rounded text-xs font-semibold ${alert.status === "new"
                                                    ? "bg-red-100 text-red-800"
                                                    : "bg-green-100 text-green-800"
                                                    }`}
                                            >
                                                {alert.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">{alert.host_name}</td>
                                        <td className="px-4 py-3">{alert.timestamp}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                className="text-blue-600 hover:underline text-xs"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    setSelectedAlert(alert);
                                                }}
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {alerts.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-gray-400">
                                            No alerts found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {selectedAlert && (
                        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md relative">
                                <button
                                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                    onClick={() => setSelectedAlert(null)}
                                    aria-label="Close"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Alert Details</h3>
                                <div className="mb-2">
                                    <span className="font-semibold">Rule Name:</span> {selectedAlert.rule_name}
                                </div>
                                <div className="mb-2">
                                    <span className="font-semibold">Severity:</span>{" "}
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-semibold ${selectedAlert.severity === "high"
                                            ? "bg-red-100 text-red-800"
                                            : selectedAlert.severity === "medium"
                                                ? "bg-yellow-100 text-yellow-800"
                                                : "bg-green-100 text-green-800"
                                            }`}
                                    >
                                        {selectedAlert.severity}
                                    </span>
                                </div>
                                <div className="mb-2">
                                    <span className="font-semibold">Status:</span>{" "}
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-semibold ${selectedAlert.status === "new"
                                            ? "bg-red-100 text-red-800"
                                            : "bg-green-100 text-green-800"
                                            }`}
                                    >
                                        {selectedAlert.status}
                                    </span>
                                </div>
                                <div className="mb-2">
                                    <span className="font-semibold">Host:</span> {selectedAlert.host_name}
                                </div>
                                <div className="mb-2">
                                    <span className="font-semibold">Timestamp:</span> {selectedAlert.timestamp}
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default Alerts;