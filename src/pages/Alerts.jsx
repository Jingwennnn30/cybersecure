import React, { useState, useEffect } from "react";
import Navigation from "../components/Navigation";
import { useRole } from "../contexts/RoleContext";
import { auth } from "../firebase";

function Alerts({ darkMode, setDarkMode }) {
    const [alerts, setAlerts] = useState([]);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedSections, setExpandedSections] = useState({
        asset: true,
        auth: false,
        correlation: false,
        identity: false,
        normalized: false
    });
    const role = useRole();
    const [showAssignmentMessage, setShowAssignmentMessage] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 20;

    // Filter states
    const [search, setSearch] = useState("");
    const [severity, setSeverity] = useState("");
    const [status, setStatus] = useState("");
    const [riskScore, setRiskScore] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const currentUser = auth.currentUser;
                if (!currentUser || !role) {
                    console.log('No user or role, skipping fetch');
                    setLoading(false);
                    return;
                }
                
                console.log('Fetching alerts for user:', currentUser.uid, 'role:', role);
                
                const params = new URLSearchParams({
                    userId: currentUser.uid,
                    userRole: role
                });
                
                const response = await fetch(`/api/alerts?${params}`);
                const data = await response.json();
                
                console.log('Received alerts data count:', data.length);
                console.log('Sample alert:', data[0]);
                setAlerts(Array.isArray(data) ? data : []);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching alerts:', error);
                setAlerts([]);
                setLoading(false);
            }
        };

        if (role) {
            fetchAlerts();
        }
    }, [role]);

    // Filtering logic
    const filteredAlerts = alerts.filter(alert => {
        const matchesSearch =
            search === "" ||
            alert.name?.toLowerCase().includes(search.toLowerCase()) ||
            alert.ip?.toLowerCase().includes(search.toLowerCase());

        const matchesSeverity = severity === "" || alert.severity === severity;
        const matchesStatus = status === "" || (alert.status && alert.status === status);
        const matchesRiskScore = riskScore === "" || String(alert.risk_score) === riskScore;

        const alertDate = alert.timestamp ? new Date(alert.timestamp) : null;
        const matchesFromDate = !fromDate || (alertDate && alertDate >= new Date(fromDate));
        const matchesToDate = !toDate || (alertDate && alertDate <= new Date(toDate + "T23:59:59"));

        return (
            matchesSearch &&
            matchesSeverity &&
            matchesStatus &&
            matchesRiskScore &&
            matchesFromDate &&
            matchesToDate
        );
    });

    // Pagination after filtering
    const totalPages = Math.ceil(filteredAlerts.length / rowsPerPage);
    const paginatedAlerts = filteredAlerts.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const handlePrev = () => setCurrentPage(p => Math.max(1, p - 1));
    const handleNext = () => setCurrentPage(p => Math.min(totalPages, p + 1));
    const handlePage = (n) => setCurrentPage(n);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, severity, status, riskScore, fromDate, toDate]);

    // Handle initial assignment (Admin only)
    const handleInitialAssignment = async () => {
        if (role !== 'admin') return;
        
        setShowAssignmentMessage(false);
        setLoading(true);
        
        try {
            const response = await fetch('/api/alerts/auto-assign-initial', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();
            
            if (result.success) {
                setShowAssignmentMessage(`Successfully assigned ${result.assignmentCount} alerts to ${result.analystICount} Analyst I and ${result.analystIICount} Analyst II users.`);
                // Refresh alerts
                const params = new URLSearchParams({
                    userId: auth.currentUser.uid,
                    userRole: role
                });
                const alertsResponse = await fetch(`/api/alerts?${params}`);
                const data = await alertsResponse.json();
                setAlerts(Array.isArray(data) ? data : []);
            } else {
                setShowAssignmentMessage(result.message || 'Assignment failed');
            }
        } catch (error) {
            console.error('Error during assignment:', error);
            setShowAssignmentMessage('Error: Failed to assign alerts');
        }
        
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-background-light text-text-default dark:bg-gray-900 dark:text-gray-100 transition-colors">
            <div className="flex min-h-screen">
                {/* Sidebar */}
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
                        <div className="flex items-center gap-4">
                            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                                Alert Management
                            </h2>
                            {role === 'admin' && (
                                <button
                                    onClick={handleInitialAssignment}
                                    disabled={loading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
                                >
                                    {loading ? 'Assigning...' : 'Auto-Assign Alerts'}
                                </button>
                            )}
                        </div>
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-xs font-semibold">
                            Timezone: Malaysia Time (GMT+8)
                        </span>
                    </div>
                    
                    {/* Assignment Success Message */}
                    {showAssignmentMessage && (
                        <div className="bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 text-green-800 dark:text-green-200 px-4 py-3 rounded mb-4">
                            {showAssignmentMessage}
                        </div>
                    )}
                    
                    {/* Role Info Banner */}
                    {(role === 'analyst_i' || role === 'analyst_ii') && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 px-4 py-3 rounded mb-4">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                {filteredAlerts.length === 0 ? (
                                    <span><strong>No alerts assigned yet.</strong> Please contact an administrator to assign alerts to you.</span>
                                ) : (
                                    <span>Showing only alerts assigned to you ({filteredAlerts.length} alerts)</span>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* Filters */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex items-center border border-gray-300 dark:border-gray-700 rounded px-2 py-1 flex-1">
                            <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <circle cx="11" cy="11" r="8" />
                                <path d="M21 21l-4.35-4.35" />
                            </svg>
                            <input
                                className="bg-transparent outline-none flex-1"
                                placeholder="Search alerts..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <select
                            className="border border-gray-300 dark:border-gray-700 rounded px-7 py-2"
                            value={severity}
                            onChange={e => setSeverity(e.target.value)}
                        >
                            <option value="">Severity</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                        <select
                            className="border border-gray-300 dark:border-gray-700 rounded px-3 py-2"
                            value={status}
                            onChange={e => setStatus(e.target.value)}
                        >
                            <option value="">Status</option>
                            <option value="open">Open</option>
                            <option value="closed">Closed</option>
                            <option value="investigating">Investigating</option>
                        </select>
                        <input
                            type="number"
                            min="0"
                            className="border border-gray-300 dark:border-gray-700 rounded px-3 py-2 w-28"
                            placeholder="Risk Score"
                            value={riskScore}
                            onChange={e => setRiskScore(e.target.value)}
                        />
                        <input
                            type="date"
                            className="border border-gray-300 dark:border-gray-700 rounded px-3 py-2"
                            value={fromDate}
                            onChange={e => setFromDate(e.target.value)}
                            placeholder="From Date"
                        />
                        <input
                            type="date"
                            className="border border-gray-300 dark:border-gray-700 rounded px-3 py-2"
                            value={toDate}
                            onChange={e => setToDate(e.target.value)}
                            placeholder="To Date"
                        />
                        <button
                            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded font-semibold"
                            onClick={() => {
                                setSearch("");
                                setSeverity("");
                                setStatus("");
                                setRiskScore("");
                                setFromDate("");
                                setToDate("");
                            }}
                        >
                            Reset
                        </button>
                    </div>
                    {/* Alerts Table */}
                    <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead>
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Alert Name
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        IP
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Port
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Severity
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Risk Score
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Timestamp
                                    </th>
                                    {role === 'admin' && (
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Assigned To
                                        </th>
                                    )}
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={role === 'admin' ? 8 : 7} className="text-center py-8">Loading...</td>
                                    </tr>
                                ) : paginatedAlerts.length === 0 ? (
                                    <tr>
                                        <td colSpan={role === 'admin' ? 8 : 7} className="text-center py-8 text-gray-400">
                                            No alerts found.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedAlerts.map((alert, idx) => (
                                        <tr
                                            key={idx + (currentPage - 1) * rowsPerPage}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-900 transition cursor-pointer"
                                        >
                                            <td className="px-4 py-3 font-medium">{alert.name}</td>
                                            <td className="px-4 py-3">{alert.ip}</td>
                                            <td className="px-4 py-3">{alert.port}</td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`px-2 py-1 rounded text-xs font-semibold ${alert.severity === "critical"
                                                        ? "bg-red-600 text-white"
                                                        : alert.severity === "high"
                                                            ? "bg-red-200 text-red-800"
                                                            : alert.severity === "medium"
                                                                ? "bg-yellow-200 text-yellow-800"
                                                                : "bg-green-200 text-green-800"
                                                        }`}
                                                >
                                                    {alert.severity}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">{alert.risk_score}</td>
                                            <td className="px-4 py-3">
                                                {alert.timestamp
                                                    ? new Date(alert.timestamp).toLocaleString()
                                                    : ""}
                                            </td>
                                            {role === 'admin' && (
                                                <td className="px-4 py-3">
                                                    {alert.assignment ? (
                                                        <div className="text-xs">
                                                            <div className="font-semibold">{alert.assignment.assignedToName}</div>
                                                            <div className="text-gray-500">
                                                                {alert.assignment.assignedToRole === 'analyst_i' ? 'Analyst I' : 
                                                                 alert.assignment.assignedToRole === 'analyst_ii' ? 'Analyst II' : 
                                                                 alert.assignment.assignedToRole}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs italic">Unassigned</span>
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    className="p-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900"
                                                    onClick={() => setSelectedAlert(alert)}
                                                    title="View Details"
                                                >
                                                    {/* Eye icon SVG */}
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination controls */}
                    <div className="flex justify-center items-center gap-2 mt-4">
                        <button
                            onClick={handlePrev}
                            disabled={currentPage === 1}
                            className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50"
                        >
                            &lt;
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button
                                key={i + 1}
                                onClick={() => handlePage(i + 1)}
                                className={`px-3 py-1 rounded ${currentPage === i + 1
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                                    }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button
                            onClick={handleNext}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50"
                        >
                            &gt;
                        </button>
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
                                        {selectedAlert.ip && (
                                            <div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">Source IP</div>
                                                <div className="font-semibold">{selectedAlert.ip}</div>
                                            </div>
                                        )}
                                        {selectedAlert.user && (
                                            <div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">User</div>
                                                <div className="font-semibold">{selectedAlert.user}</div>
                                            </div>
                                        )}
                                        {selectedAlert.host && (
                                            <div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">Host</div>
                                                <div className="font-semibold">{selectedAlert.host}</div>
                                            </div>
                                        )}
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
                                        {selectedAlert.risk_level && (
                                            <div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">Risk Level</div>
                                                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold
                                                    ${selectedAlert.risk_level === "critical" || selectedAlert.risk_level === "high"
                                                        ? "bg-red-200 text-red-800"
                                                        : selectedAlert.risk_level === "medium"
                                                            ? "bg-yellow-200 text-yellow-800"
                                                            : "bg-green-200 text-green-800"
                                                    }`}>
                                                    {selectedAlert.risk_level}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mb-4">
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Alert Name</div>
                                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                            {selectedAlert.name}
                                        </div>
                                    </div>
                                    {selectedAlert.alert_type && (
                                        <div className="mb-4">
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Alert Type</div>
                                            <div className="text-sm text-gray-800 dark:text-gray-200">
                                                {selectedAlert.alert_type}
                                            </div>
                                        </div>
                                    )}
                                    {selectedAlert.kill_chain_phase && (
                                        <div className="mb-4">
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Kill Chain Phase</div>
                                            <div className="text-sm">
                                                <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded text-xs font-semibold">
                                                    {selectedAlert.kill_chain_phase}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    {selectedAlert.correlation_key && (
                                        <div className="mb-4">
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Correlation Key</div>
                                            <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded inline-block">
                                                {selectedAlert.correlation_key}
                                            </div>
                                        </div>
                                    )}

                                    {/* Enhanced Payload Information */}
                                    {selectedAlert.parsedPayload && Object.keys(selectedAlert.parsedPayload).length > 0 && (
                                        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Enrichment Details</h4>
                                            
                                            {/* Asset Information */}
                                            {selectedAlert.parsedPayload.asset && (
                                                <div className="mb-4">
                                                    <button
                                                        onClick={() => toggleSection('asset')}
                                                        className="flex items-center justify-between w-full text-left text-sm font-semibold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    >
                                                        <span>Asset Information</span>
                                                        <svg className={`w-4 h-4 transform transition-transform ${expandedSections.asset ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                                    {expandedSections.asset && (
                                                        <div className="mt-2 pl-4 grid grid-cols-2 gap-3 text-sm">
                                                            {selectedAlert.parsedPayload.asset.business_unit && (
                                                                <div>
                                                                    <span className="text-gray-500 dark:text-gray-400">Business Unit:</span>
                                                                    <span className="ml-2 font-medium">{selectedAlert.parsedPayload.asset.business_unit}</span>
                                                                </div>
                                                            )}
                                                            {selectedAlert.parsedPayload.asset.criticality && (
                                                                <div>
                                                                    <span className="text-gray-500 dark:text-gray-400">Criticality:</span>
                                                                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${
                                                                        selectedAlert.parsedPayload.asset.criticality === 'high' ? 'bg-red-200 text-red-800' :
                                                                        selectedAlert.parsedPayload.asset.criticality === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                                                                        'bg-green-200 text-green-800'
                                                                    }`}>{selectedAlert.parsedPayload.asset.criticality}</span>
                                                                </div>
                                                            )}
                                                            {selectedAlert.parsedPayload.asset.environment && (
                                                                <div>
                                                                    <span className="text-gray-500 dark:text-gray-400">Environment:</span>
                                                                    <span className="ml-2 font-medium">{selectedAlert.parsedPayload.asset.environment}</span>
                                                                </div>
                                                            )}
                                                            {selectedAlert.parsedPayload.asset.internet_exposed !== undefined && (
                                                                <div>
                                                                    <span className="text-gray-500 dark:text-gray-400">Internet Exposed:</span>
                                                                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${
                                                                        selectedAlert.parsedPayload.asset.internet_exposed ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'
                                                                    }`}>{selectedAlert.parsedPayload.asset.internet_exposed ? 'Yes' : 'No'}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Authentication Enrichment */}
                                            {selectedAlert.parsedPayload.auth_enrichment && (
                                                <div className="mb-4">
                                                    <button
                                                        onClick={() => toggleSection('auth')}
                                                        className="flex items-center justify-between w-full text-left text-sm font-semibold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    >
                                                        <span>Authentication Details</span>
                                                        <svg className={`w-4 h-4 transform transition-transform ${expandedSections.auth ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                                    {expandedSections.auth && (
                                                        <div className="mt-2 pl-4 space-y-2 text-sm">
                                                            {selectedAlert.parsedPayload.auth_enrichment.attack_type && (
                                                                <div>
                                                                    <span className="text-gray-500 dark:text-gray-400">Attack Type:</span>
                                                                    <span className="ml-2 font-medium text-red-600 dark:text-red-400">{selectedAlert.parsedPayload.auth_enrichment.attack_type}</span>
                                                                </div>
                                                            )}
                                                            {selectedAlert.parsedPayload.auth_enrichment.failed_logon !== undefined && (
                                                                <div>
                                                                    <span className="text-gray-500 dark:text-gray-400">Failed Logon:</span>
                                                                    <span className="ml-2 font-medium">{selectedAlert.parsedPayload.auth_enrichment.failed_logon ? 'Yes' : 'No'}</span>
                                                                </div>
                                                            )}
                                                            {selectedAlert.parsedPayload.auth_enrichment.mitigation && (
                                                                <div>
                                                                    <span className="text-gray-500 dark:text-gray-400">Mitigation:</span>
                                                                    <span className="ml-2 font-medium text-blue-600 dark:text-blue-400">{selectedAlert.parsedPayload.auth_enrichment.mitigation}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Correlation Information */}
                                            {selectedAlert.parsedPayload.correlation && (
                                                <div className="mb-4">
                                                    <button
                                                        onClick={() => toggleSection('correlation')}
                                                        className="flex items-center justify-between w-full text-left text-sm font-semibold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    >
                                                        <span>Correlation Analysis</span>
                                                        <svg className={`w-4 h-4 transform transition-transform ${expandedSections.correlation ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                                    {expandedSections.correlation && (
                                                        <div className="mt-2 pl-4 space-y-2 text-sm">
                                                            {selectedAlert.parsedPayload.correlation.correlation_key && (
                                                                <div>
                                                                    <span className="text-gray-500 dark:text-gray-400">Correlation Key:</span>
                                                                    <span className="ml-2 font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{selectedAlert.parsedPayload.correlation.correlation_key}</span>
                                                                </div>
                                                            )}
                                                            {selectedAlert.parsedPayload.correlation.kill_chain && (
                                                                <div className="mt-2">
                                                                    <div className="text-gray-500 dark:text-gray-400 mb-1">Kill Chain:</div>
                                                                    <div className="pl-2 space-y-1">
                                                                        {selectedAlert.parsedPayload.correlation.kill_chain.phase && (
                                                                            <div>
                                                                                <span className="text-gray-500 dark:text-gray-400">Phase:</span>
                                                                                <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded text-xs font-semibold">{selectedAlert.parsedPayload.correlation.kill_chain.phase}</span>
                                                                            </div>
                                                                        )}
                                                                        {selectedAlert.parsedPayload.correlation.kill_chain.confidence && (
                                                                            <div>
                                                                                <span className="text-gray-500 dark:text-gray-400">Confidence:</span>
                                                                                <span className="ml-2 font-medium">{selectedAlert.parsedPayload.correlation.kill_chain.confidence}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Identity Enrichment */}
                                            {selectedAlert.parsedPayload.identity_enrichment && (
                                                <div className="mb-4">
                                                    <button
                                                        onClick={() => toggleSection('identity')}
                                                        className="flex items-center justify-between w-full text-left text-sm font-semibold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    >
                                                        <span>Identity Information</span>
                                                        <svg className={`w-4 h-4 transform transition-transform ${expandedSections.identity ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                                    {expandedSections.identity && (
                                                        <div className="mt-2 pl-4 grid grid-cols-2 gap-3 text-sm">
                                                            {selectedAlert.parsedPayload.identity_enrichment.detection_method && (
                                                                <div>
                                                                    <span className="text-gray-500 dark:text-gray-400">Detection Method:</span>
                                                                    <span className="ml-2 font-medium">{selectedAlert.parsedPayload.identity_enrichment.detection_method}</span>
                                                                </div>
                                                            )}
                                                            {selectedAlert.parsedPayload.identity_enrichment.identity_type && (
                                                                <div>
                                                                    <span className="text-gray-500 dark:text-gray-400">Identity Type:</span>
                                                                    <span className="ml-2 font-medium">{selectedAlert.parsedPayload.identity_enrichment.identity_type}</span>
                                                                </div>
                                                            )}
                                                            {selectedAlert.parsedPayload.identity_enrichment.is_service_account !== undefined && (
                                                                <div>
                                                                    <span className="text-gray-500 dark:text-gray-400">Service Account:</span>
                                                                    <span className="ml-2 font-medium">{selectedAlert.parsedPayload.identity_enrichment.is_service_account ? 'Yes' : 'No'}</span>
                                                                </div>
                                                            )}
                                                            {selectedAlert.parsedPayload.identity_enrichment.privilege_level && (
                                                                <div>
                                                                    <span className="text-gray-500 dark:text-gray-400">Privilege Level:</span>
                                                                    <span className="ml-2 font-medium">{selectedAlert.parsedPayload.identity_enrichment.privilege_level}</span>
                                                                </div>
                                                            )}
                                                            {selectedAlert.parsedPayload.identity_enrichment.risk_level && (
                                                                <div className="col-span-2">
                                                                    <span className="text-gray-500 dark:text-gray-400">Risk Level:</span>
                                                                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${
                                                                        selectedAlert.parsedPayload.identity_enrichment.risk_level === 'high' ? 'bg-red-200 text-red-800' :
                                                                        selectedAlert.parsedPayload.identity_enrichment.risk_level === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                                                                        'bg-green-200 text-green-800'
                                                                    }`}>{selectedAlert.parsedPayload.identity_enrichment.risk_level}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Investigate Button */}
                                    <div className="flex justify-end">
                                        <button
                                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow transition-all duration-150 flex items-center gap-2"
                                            onClick={() => alert('Investigate action!')}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                            </svg>
                                            Investigate
                                        </button>
                                    </div>
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