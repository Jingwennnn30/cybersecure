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

    // Investigation state
    const [investigationStatuses, setInvestigationStatuses] = useState({});
    const [pollingAlerts, setPollingAlerts] = useState(new Set());

    // Escalation state
    const [showEscalationModal, setShowEscalationModal] = useState(false);
    const [escalatingAlert, setEscalatingAlert] = useState(null);
    const [analystIIList, setAnalystIIList] = useState([]);
    const [selectedAnalyst, setSelectedAnalyst] = useState('');
    const [escalationReason, setEscalationReason] = useState('');

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
                
                // For Analyst II, backend provides _uniqueId. For others, create it
                const alertsWithUniqueIds = data.map((alert, index) => {
                    if (alert._uniqueId) {
                        // Backend already provided uniqueId (for Analyst II)
                        return alert;
                    }
                    // For other roles, create uniqueId from array index
                    return {
                        ...alert,
                        _uniqueId: `${alert.correlation_key || 'no-key'}-${alert.timestamp || Date.now()}-${index}`
                    };
                });
                
                const keys = data.map(a => a.correlation_key);
                const uniqueKeys = new Set(keys.filter(k => k));
                console.log('Alerts with correlation_key:', uniqueKeys.size, '/ Total:', keys.length);
                if (uniqueKeys.size < keys.length) {
                    console.warn('⚠️ WARNING: Some alerts missing correlation_key or have duplicates!');
                }
                
                console.log('📊 Alert uniqueIds:', alertsWithUniqueIds.map(a => a._uniqueId));
                
                setAlerts(Array.isArray(alertsWithUniqueIds) ? alertsWithUniqueIds : []);
                
                // Load investigation statuses for all alerts
                await loadInvestigationStatuses(alertsWithUniqueIds);
                
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

    // Load investigation statuses for multiple alerts
    const loadInvestigationStatuses = async (alertsList) => {
        try {
            console.log('🔍 Loading investigation statuses for', alertsList.length, 'alerts');
            
            const currentUser = auth.currentUser;
            if (!currentUser || !role) {
                console.log('No user or role, skipping status fetch');
                return;
            }
            
            const params = new URLSearchParams({
                userId: currentUser.uid,
                userRole: role
            });
            
            // Single API call to get all statuses
            const response = await fetch(`/api/alerts/statuses/all?${params}`);
            if (!response.ok) {
                console.error('Failed to fetch statuses:', response.status);
                return;
            }
            
            const allStatuses = await response.json();
            console.log('📦 Received statuses from backend:', Object.keys(allStatuses).length);
            console.log('Sample status keys:', Object.keys(allStatuses).slice(0, 3));
            console.log('Sample alert IDs:', alertsList.slice(0, 3).map(a => a._uniqueId));
            
            const statuses = {};
            const polling = new Set();

            alertsList.forEach(alert => {
                const status = allStatuses[alert._uniqueId];
                if (status && (status.status === 'investigating' || status.status === 'responded')) {
                    statuses[alert._uniqueId] = status;
                    if (status.status === 'investigating') {
                        polling.add(alert._uniqueId);
                    }
                }
            });

            if (Object.keys(statuses).length > 0) {
                setInvestigationStatuses(statuses);
                setPollingAlerts(polling);
                console.log('✅ Loaded investigation statuses:', Object.keys(statuses).length);
            } else {
                console.log('⚠️ No matching investigation statuses found');
            }
        } catch (error) {
            console.error('❌ Error loading investigation statuses:', error);
        }
    };

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

    // Polling effect for investigation statuses
    useEffect(() => {
        if (pollingAlerts.size === 0) return;
        
        const pollInterval = setInterval(async () => {
            for (const alertId of pollingAlerts) {
                try {
                    const response = await fetch(`http://localhost:4000/api/alerts/${alertId}/status`);
                    const statusData = await response.json();
                    
                    if (statusData.status === 'responded') {
                        setInvestigationStatuses(prev => ({
                            ...prev,
                            [alertId]: statusData
                        }));
                        
                        // Stop polling this alert
                        setPollingAlerts(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(alertId);
                            return newSet;
                        });
                    }
                } catch (error) {
                    console.error('Error polling status for alert:', alertId, error);
                }
            }
        }, 3000); // Poll every 3 seconds
        
        return () => clearInterval(pollInterval);
    }, [pollingAlerts]);

    // Handle investigation button click
    const handleInvestigate = async (alert) => {
        const alertId = alert.correlation_key;
        const uniqueId = alert._uniqueId; // Use unique ID for tracking
        
        // Validate alert has correlation_key
        if (!alertId || !uniqueId) {
            console.error('Alert missing ID:', alert);
            window.alert('Cannot investigate: Alert ID is missing');
            return;
        }
        
        // Prevent multiple clicks - check by uniqueId
        if (investigationStatuses[uniqueId]) {
            console.log('Investigation already in progress for:', uniqueId);
            return;
        }
        
        console.log('Starting investigation for unique ID:', uniqueId, 'correlation_key:', alertId);
        console.log('Alert data:', alert);
        
        try {
            // Mark as investigating immediately using uniqueId
            setInvestigationStatuses(prev => ({
                ...prev,
                [uniqueId]: { status: 'investigating', userResponse: null }
            }));
            
            // Start polling for this alert using uniqueId
            setPollingAlerts(prev => new Set([...prev, uniqueId]));
            
            // Call backend to trigger n8n workflow (still use correlation_key for n8n)
            const response = await fetch('http://localhost:4000/api/alerts/investigate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alertId: uniqueId, // Send uniqueId to backend
                    correlationKey: alertId, // Also send original key
                    alertData: {
                        user: alert.user,
                        host: alert.host,
                        ip: alert.ip,
                        timestamp: alert.timestamp,
                        name: alert.name,
                        severity: alert.severity
                    }
                })
            });
            
            console.log('Backend response status:', response.status);
            
            if (!response.ok) {
                const text = await response.text();
                console.error('Backend error response:', text);
                throw new Error(`Backend returned ${response.status}: ${text.substring(0, 100)}`);
            }
            
            const result = await response.json();
            console.log('Backend result:', result);
            
            if (result.success) {
                console.log('Investigation started successfully for:', alertId);
            } else {
                throw new Error(result.message || 'Failed to start investigation');
            }
        } catch (error) {
            console.error('Error starting investigation:', error);
            window.alert('Failed to start investigation: ' + error.message);
            
            // Revert status using uniqueId
            setInvestigationStatuses(prev => {
                const newStatuses = { ...prev };
                delete newStatuses[uniqueId];
                return newStatuses;
            });
            
            setPollingAlerts(prev => {
                const newSet = new Set(prev);
                newSet.delete(uniqueId);
                return newSet;
            });
        }
    };

    // Handle escalation to SOC2
    const handleEscalate = async (alert) => {
        try {
            // Fetch Analyst II users
            const response = await fetch('/api/users/analyst-ii');
            if (!response.ok) {
                throw new Error('Failed to fetch Analyst II users');
            }
            
            const analysts = await response.json();
            
            if (analysts.length === 0) {
                window.alert('No Analyst II users available for escalation');
                return;
            }
            
            // Show modal
            setEscalatingAlert(alert);
            setAnalystIIList(analysts);
            setSelectedAnalyst('');
            setEscalationReason(alert.investigationStatus?.userResponse === 'no' ? 
                'User denied login attempt - potential security breach' : 
                'Manual escalation required for further investigation');
            setShowEscalationModal(true);
        } catch (error) {
            console.error('Error preparing escalation:', error);
            window.alert('Failed to load analysts: ' + error.message);
        }
    };

    // Submit escalation
    const submitEscalation = async () => {
        if (!selectedAnalyst) {
            window.alert('Please select an Analyst II to escalate to');
            return;
        }
        
        const analyst = analystIIList.find(a => a.uid === selectedAnalyst);
        if (!analyst) return;
        
        const alert = escalatingAlert;
        const uniqueId = alert._uniqueId;
        
        try {
            console.log('Escalating alert:', uniqueId, 'to:', analyst.name);
            
            const response = await fetch('/api/alerts/escalate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alertId: uniqueId,
                    alertData: {
                        user: alert.user,
                        host: alert.host,
                        ip: alert.ip,
                        timestamp: alert.timestamp,
                        name: alert.name,
                        severity: alert.severity
                    },
                    reason: escalationReason || 'Manual escalation',
                    escalatedBy: auth.currentUser?.email || 'Unknown',
                    assignedTo: analyst
                })
            });
            
            if (!response.ok) {
                throw new Error(`Escalation failed: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Escalation result:', result);
            
            // Update local state
            setInvestigationStatuses(prev => ({
                ...prev,
                [uniqueId]: {
                    ...prev[uniqueId],
                    escalated: true,
                    escalatedTo: 'analyst_ii',
                    assignedToName: analyst.name,
                    assignedToEmail: analyst.email,
                    escalatedAt: new Date().toISOString()
                }
            }));
            
            setShowEscalationModal(false);
            setEscalatingAlert(null);
            window.alert(`Alert escalated to ${analyst.name} successfully!`);
        } catch (error) {
            console.error('Error escalating alert:', error);
            window.alert('Failed to escalate alert: ' + error.message);
        }
    };

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
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                        <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm table-fixed">
                            <colgroup>
                                <col style={{width: '20%'}} />
                                <col style={{width: '10%'}} />
                                <col style={{width: '8%'}} />
                                <col style={{width: '6%'}} />
                                <col style={{width: '13%'}} />
                                {role === 'admin' && <col style={{width: '12%'}} />}
                                <col style={{width: '17%'}} />
                                <col style={{width: '10%'}} />
                            </colgroup>
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                        Alert Name
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                        IP
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                        Severity
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                        Risk
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                        Timestamp
                                    </th>
                                    {role === 'admin' && (
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                            Assigned
                                        </th>
                                    )}
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                        Investigation
                                    </th>
                                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
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
                                    paginatedAlerts.map((alert, idx) => {
                                        // Use _uniqueId for investigation status tracking
                                        const uniqueRowId = alert._uniqueId || `row-${idx}`;
                                        const investigationStatus = investigationStatuses[uniqueRowId];
                                        
                                        // Determine row background color - ONLY this specific row
                                        let rowClass = "hover:bg-gray-50 dark:hover:bg-gray-900 transition cursor-pointer";
                                        if (investigationStatus) {
                                            if (investigationStatus.status === 'investigating') {
                                                rowClass = "bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition";
                                            } else if (investigationStatus.status === 'responded') {
                                                if (investigationStatus.userResponse === 'yes') {
                                                    rowClass = "bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 transition";
                                                } else if (investigationStatus.userResponse === 'no') {
                                                    rowClass = "bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition";
                                                }
                                            }
                                        }
                                        
                                        return (
                                        <tr
                                            key={uniqueRowId}
                                            className={rowClass}
                                        >
                                            <td className="px-3 py-2 font-medium text-xs">{alert.name}</td>
                                            <td className="px-3 py-2 text-xs">{alert.ip}</td>
                                            <td className="px-3 py-2">
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
                                            <td className="px-3 py-2 text-xs">{alert.risk_score}</td>
                                            <td className="px-3 py-2 text-xs">
                                                {alert.timestamp
                                                    ? new Date(alert.timestamp).toLocaleString()
                                                    : ""}
                                            </td>
                                            {role === 'admin' && (
                                                <td className="px-3 py-2">
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
                                            <td className="px-3 py-2">
                                                {investigationStatus ? (
                                                    investigationStatus.status === 'investigating' ? (
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <svg className="w-4 h-4 text-yellow-600 animate-spin" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            <span className="text-yellow-700 dark:text-yellow-400 font-medium">Investigating...</span>
                                                        </div>
                                                    ) : investigationStatus.userResponse === 'yes' ? (
                                                        <div className="flex flex-col gap-1">
                                                            <div className="text-xs font-semibold text-green-700 dark:text-green-400">
                                                                ✓ User confirmed: YES
                                                            </div>
                                                            {!investigationStatus.escalated && (
                                                                <button
                                                                    onClick={() => handleEscalate(alert)}
                                                                    className="text-xs px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors"
                                                                >
                                                                    Escalate to Analyst II
                                                                </button>
                                                            )}
                                                            {investigationStatus.escalated && (
                                                                <div className="text-xs font-medium text-orange-600 dark:text-orange-400">
                                                                    Assigned to: {investigationStatus.assignedToName || 'Analyst II'}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : investigationStatus.userResponse === 'no' ? (
                                                        <div className="flex flex-col gap-1">
                                                            <div className="text-xs font-semibold text-red-700 dark:text-red-400">
                                                                ✗ User denied: NO
                                                            </div>
                                                            {!investigationStatus.escalated && (
                                                                <button
                                                                    onClick={() => handleEscalate(alert)}
                                                                    className="text-xs px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                                                                >
                                                                    Escalate to Analyst II
                                                                </button>
                                                            )}
                                                            {investigationStatus.escalated && (
                                                                <div className="text-xs font-medium text-orange-600 dark:text-orange-400">
                                                                    Assigned to: {investigationStatus.assignedToName || 'Analyst II'}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : null
                                                ) : (
                                                    <span className="text-gray-400 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-center">
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
                                    )})
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
                                        {investigationStatuses[selectedAlert.correlation_key] ? (
                                            <div className="text-sm">
                                                {investigationStatuses[selectedAlert.correlation_key].status === 'investigating' ? (
                                                    <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                                                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        <span className="font-semibold">Awaiting user response...</span>
                                                    </div>
                                                ) : investigationStatuses[selectedAlert.correlation_key].userResponse === 'yes' ? (
                                                    <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 text-green-800 dark:text-green-200 px-4 py-3 rounded">
                                                        <strong>✓ User responded: YES</strong> - They have confirmed this login.
                                                    </div>
                                                ) : investigationStatuses[selectedAlert.correlation_key].userResponse === 'no' ? (
                                                    <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-800 dark:text-red-200 px-4 py-3 rounded">
                                                        <strong>✗ User responded: NO</strong> - They have denied this login activity.
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : (
                                            <button
                                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow transition-all duration-150 flex items-center gap-2"
                                                onClick={() => {
                                                    handleInvestigate(selectedAlert);
                                                    setSelectedAlert(null);
                                                }}
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                                </svg>
                                                Investigate
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Escalation Modal */}
                    {showEscalationModal && (
                        <div 
                            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                            onClick={() => setShowEscalationModal(false)}
                        >
                            <div 
                                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                        ⚠️ Escalate Alert to Analyst II
                                    </h3>
                                    <button
                                        onClick={() => setShowEscalationModal(false)}
                                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                
                                {escalatingAlert && (
                                    <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            <strong>Alert:</strong> {escalatingAlert.name}
                                        </p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            <strong>User:</strong> {escalatingAlert.user || 'Unknown'}
                                        </p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            <strong>Host:</strong> {escalatingAlert.host || escalatingAlert.ip}
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Assign to Analyst II: *
                                        </label>
                                        <select
                                            value={selectedAnalyst}
                                            onChange={(e) => setSelectedAnalyst(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">-- Select Analyst --</option>
                                            {analystIIList.map((analyst) => (
                                                <option key={analyst.uid} value={analyst.uid}>
                                                    {analyst.name} ({analyst.email})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Escalation Reason:
                                        </label>
                                        <textarea
                                            value={escalationReason}
                                            onChange={(e) => setEscalationReason(e.target.value)}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                                            placeholder="Why is this alert being escalated?"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowEscalationModal(false)}
                                        className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={submitEscalation}
                                        disabled={!selectedAnalyst}
                                        style={{
                                            backgroundColor: selectedAnalyst ? '#f97316' : '#d1d5db',
                                            color: selectedAnalyst ? '#ffffff' : '#6b7280',
                                            cursor: selectedAnalyst ? 'pointer' : 'not-allowed'
                                        }}
                                        className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors"
                                    >
                                        {selectedAnalyst ? 'Escalate' : 'Select Analyst First'}
                                    </button>
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