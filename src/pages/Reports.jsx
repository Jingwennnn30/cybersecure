import React, { useState } from 'react';
import { Card, Title, Text } from '@tremor/react';
import Navigation from '../components/Navigation';

function Reports({ darkMode, setDarkMode }) {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [mode, setMode] = useState('weekly'); // weekly, monthly, custom
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState(null);
    const [error, setError] = useState(null);
    const [showDownloadModal, setShowDownloadModal] = useState(false);

    // Function to generate report by calling n8n webhook
    const generateReport = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // If no end date is provided, use start date (single day report)
            const effectiveEndDate = endDate || startDate;
            
            // Always use 'custom' mode when user has manually selected dates
            // This ensures n8n uses the actual selected dates instead of calculating from "now"
            const payload = {
                mode: 'custom',
                start_date: startDate,
                end_date: effectiveEndDate
            };

            // Call backend proxy endpoint to avoid CORS issues
            const response = await fetch('http://localhost:4000/api/generate-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Failed to generate report');
            }

            const data = await response.json();
            setReport(data);
        } catch (err) {
            setError(err.message || 'Failed to generate report. Please try again.');
            console.error('Error generating report:', err);
        } finally {
            setLoading(false);
        }
    };

    // Download report as PDF
    const downloadPDF = () => {
        if (!report) return;
        
        // Create a printable HTML document
        const printWindow = window.open('', '', 'width=1200,height=800');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Security Analysis Report - ${startDate} to ${endDate || startDate}</title>
                <style>
                    @page {
                        margin: 20mm 25mm;
                        size: A4 portrait;
                    }
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Calibri', 'Arial', sans-serif;
                        color: #1a1a1a;
                        line-height: 1.6;
                        background: #ffffff;
                        font-size: 10pt;
                    }
                    .page {
                        max-width: 210mm;
                        margin: 0 auto;
                        padding: 0;
                        background: white;
                    }
                    
                    /* Professional Letterhead */
                    .letterhead {
                        border-bottom: 4px solid #003d82;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }
                    .letterhead .company {
                        font-size: 24pt;
                        font-weight: 700;
                        color: #003d82;
                        letter-spacing: 2px;
                        margin-bottom: 5px;
                    }
                    .letterhead .tagline {
                        font-size: 9pt;
                        color: #666666;
                        font-weight: 400;
                    }
                    
                    /* Report Title */
                    .report-title {
                        text-align: center;
                        margin: 35px 0;
                        padding: 25px;
                        background: #f8f9fa;
                        border-top: 3px solid #003d82;
                        border-bottom: 3px solid #003d82;
                    }
                    .report-title h1 {
                        font-size: 20pt;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 3px;
                        color: #1a1a1a;
                        margin-bottom: 12px;
                    }
                    .report-title .subtitle {
                        font-size: 11pt;
                        color: #555555;
                        font-weight: 400;
                    }
                    
                    /* Document Information */
                    .doc-info {
                        margin: 25px 0;
                        border: 2px solid #003d82;
                        background: #ffffff;
                    }
                    .doc-info table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .doc-info td {
                        padding: 10px 15px;
                        font-size: 10pt;
                        border-bottom: 1px solid #e0e0e0;
                    }
                    .doc-info td:first-child {
                        font-weight: 600;
                        width: 180px;
                        background: #f5f6f7;
                        color: #003d82;
                    }
                    .doc-info tr:last-child td {
                        border-bottom: none;
                    }
                    
                    /* Classification Banner */
                    .classification {
                        background: #003d82;
                        color: #ffffff;
                        text-align: center;
                        padding: 8px;
                        font-weight: 700;
                        font-size: 10pt;
                        letter-spacing: 4px;
                        margin: 25px 0;
                    }
                    
                    /* Section Headings */
                    .section {
                        margin: 30px 0;
                        page-break-inside: avoid;
                    }
                    .section-title {
                        font-size: 13pt;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 1.5px;
                        color: #003d82;
                        border-bottom: 3px solid #003d82;
                        padding-bottom: 8px;
                        margin-bottom: 18px;
                    }
                    
                    /* Executive Summary Box */
                    .executive-summary {
                        border: 2px solid #003d82;
                        padding: 25px;
                        margin: 25px 0;
                        background: #f8f9fa;
                    }
                    .executive-summary .summary-title {
                        font-size: 12pt;
                        font-weight: 700;
                        margin-bottom: 15px;
                        text-transform: uppercase;
                        letter-spacing: 1.5px;
                        color: #003d82;
                    }
                    .executive-summary p {
                        text-align: justify;
                        line-height: 1.7;
                        color: #2a2a2a;
                    }
                    
                    /* Statistics Table */
                    .stats-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 18px 0;
                        border: 2px solid #003d82;
                    }
                    .stats-table th {
                        background: #003d82;
                        color: #ffffff;
                        padding: 12px;
                        text-align: left;
                        font-size: 10pt;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .stats-table td {
                        padding: 12px;
                        border: 1px solid #d0d0d0;
                        font-size: 10pt;
                    }
                    .stats-table tr:nth-child(even) {
                        background: #f8f9fa;
                    }
                    .stats-table .value-cell {
                        font-weight: 700;
                        text-align: center;
                        font-size: 16pt;
                        color: #003d82;
                    }
                    
                    /* Data Tables */
                    .data-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 18px 0;
                        font-size: 9pt;
                        border: 1px solid #d0d0d0;
                    }
                    .data-table th {
                        background: #e8ecef;
                        padding: 10px;
                        text-align: left;
                        font-weight: 700;
                        border: 1px solid #a0a0a0;
                        font-size: 9pt;
                        color: #1a1a1a;
                    }
                    .data-table td {
                        padding: 10px;
                        border: 1px solid #d0d0d0;
                        vertical-align: top;
                    }
                    .data-table tr:nth-child(even) {
                        background: #f8f9fa;
                    }
                    
                    /* Recommendations List */
                    .recommendations {
                        margin: 18px 0;
                    }
                    .recommendation-item {
                        padding: 12px 12px 12px 35px;
                        margin-bottom: 10px;
                        border-left: 4px solid #003d82;
                        background: #f8f9fa;
                        position: relative;
                        text-align: justify;
                    }
                    .recommendation-item::before {
                        content: "▪";
                        position: absolute;
                        left: 15px;
                        font-weight: 700;
                        color: #003d82;
                        font-size: 12pt;
                    }
                    
                    /* Footer */
                    .report-footer {
                        margin-top: 45px;
                        padding-top: 18px;
                        border-top: 3px solid #003d82;
                        font-size: 8pt;
                        color: #666666;
                    }
                    .footer-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 6px;
                    }
                    .confidential-footer {
                        text-align: center;
                        font-size: 8pt;
                        color: #888888;
                        margin-top: 12px;
                        padding-top: 12px;
                        border-top: 1px solid #d0d0d0;
                        line-height: 1.4;
                    }
                    
                    @media print {
                        body { font-size: 10pt; }
                        .page { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="page">
                    <!-- Letterhead -->
                    <div class="letterhead">
                        <div class="company">CYBERSECURE</div>
                        <div class="tagline">Security Intelligence & Threat Analysis Division</div>
                    </div>
                    
                    <!-- Classification -->
                    <div class="classification">CONFIDENTIAL</div>
                    
                    <!-- Report Title -->
                    <div class="report-title">
                        <h1>Security Analysis Report</h1>
                        <div class="subtitle">Comprehensive Threat Assessment and Incident Analysis</div>
                    </div>
                    
                    <!-- Document Information -->
                    <div class="doc-info">
                        <table>
                            <tr>
                                <td>Report ID:</td>
                                <td>CSR-${Date.now().toString().slice(-8)}</td>
                            </tr>
                            <tr>
                                <td>Reporting Period:</td>
                                <td>${startDate} to ${endDate || startDate}</td>
                            </tr>
                            <tr>
                                <td>Date of Issue:</td>
                                <td>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                            </tr>
                            <tr>
                                <td>Time Generated:</td>
                                <td>${new Date().toLocaleTimeString('en-US')}</td>
                            </tr>
                            <tr>
                                <td>Classification:</td>
                                <td>CONFIDENTIAL - INTERNAL USE ONLY</td>
                            </tr>
                        </table>
                    </div>
                    
                    <!-- Executive Summary -->
                    <div class="section">
                        <div class="executive-summary">
                            <div class="summary-title">Executive Summary</div>
                            <p>${report.summary || 'No security incidents were detected during the reporting period. All monitored systems and networks maintained normal operational status with no unusual activity or policy violations observed.'}</p>
                        </div>
                    </div>
                    
                    <!-- Security Metrics -->
                    <div class="section">
                        <div class="section-title">I. Security Metrics Overview</div>
                        <table class="stats-table">
                            <thead>
                                <tr>
                                    <th>Metric</th>
                                    <th style="width: 120px; text-align: center;">Count</th>
                                    <th>Classification</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Critical Security Alerts</td>
                                    <td class="value-cell">${report.counts?.critical || 0}</td>
                                    <td>Immediate action required</td>
                                </tr>
                                <tr>
                                    <td>High Priority Incidents</td>
                                    <td class="value-cell">${report.counts?.high || 0}</td>
                                    <td>Elevated risk level</td>
                                </tr>
                                <tr>
                                    <td>Unique IP Addresses Detected</td>
                                    <td class="value-cell">${report.unique_ips?.length || 0}</td>
                                    <td>Network traffic analysis</td>
                                </tr>
                                <tr>
                                    <td>Security Rules Triggered</td>
                                    <td class="value-cell">${report.unique_rules?.length || 0}</td>
                                    <td>Policy enforcement events</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    ${report.unique_ips && report.unique_ips.length > 0 ? `
                        <!-- IP Address Analysis -->
                        <div class="section">
                            <div class="section-title">II. Network Address Analysis</div>
                            <p style="margin-bottom: 12px; font-size: 10pt; color: #2a2a2a;">The following IP addresses were identified during the analysis period:</p>
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th style="width: 50px;">No.</th>
                                        <th>IP Address</th>
                                        <th style="width: 120px;">Network Type</th>
                                        <th style="width: 150px;">Classification</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${report.unique_ips.map((ip, index) => `
                                        <tr>
                                            <td style="text-align: center;">${index + 1}</td>
                                            <td style="font-family: 'Courier New', monospace; font-weight: 600;">${ip}</td>
                                            <td>${ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.') ? 'Internal' : 'External'}</td>
                                            <td>${ip.startsWith('10.') || ip.startsWith('192.168.') ? 'Private Network' : 'Public Internet'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : ''}
                    
                    ${report.unique_rules && report.unique_rules.length > 0 ? `
                        <!-- Security Rules -->
                        <div class="section">
                            <div class="section-title">III. Security Policy Violations</div>
                            <p style="margin-bottom: 12px; font-size: 10pt; color: #2a2a2a;">The following security rules were triggered during the reporting period:</p>
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th style="width: 50px;">No.</th>
                                        <th>Rule Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${report.unique_rules.map((rule, index) => `
                                        <tr>
                                            <td style="text-align: center;">${index + 1}</td>
                                            <td>${rule}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : ''}
                    
                    ${report.recommendations && report.recommendations.length > 0 ? `
                        <!-- Recommendations -->
                        <div class="section">
                            <div class="section-title">IV. Recommendations & Action Items</div>
                            <p style="margin-bottom: 12px; font-size: 10pt; color: #2a2a2a;">Based on the analysis conducted, the following recommendations are provided:</p>
                            <div class="recommendations">
                                ${report.recommendations.map(rec => `
                                    <div class="recommendation-item">${rec}</div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- Footer -->
                    <div class="report-footer">
                        <div class="footer-row">
                            <div><strong>CyberSecure</strong> | Security Intelligence Division</div>
                            <div>Page 1 of 1</div>
                        </div>
                        <div class="footer-row">
                            <div>Report Generated: ${new Date().toLocaleString('en-US')}</div>
                            <div>Version 1.0</div>
                        </div>
                        <div class="confidential-footer">
                            This document contains confidential information and is intended solely for the use of authorized personnel.
                            <br>Unauthorized reproduction or distribution of this report is strictly prohibited.
                            <br>© ${new Date().getFullYear()} CyberSecure. All rights reserved.
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
        setShowDownloadModal(false);
    };

    // Download report as CSV
    const downloadCSV = () => {
        if (!report) return;
        
        const reportId = `CSR-${Date.now().toString().slice(-8)}`;
        const generatedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const generatedTime = new Date().toLocaleTimeString('en-US', { hour12: false });
        
        // Professional, clean CSV format for data analysis
        let csvContent = '';
        
        // REPORT METADATA
        csvContent += 'Report Type,Security Analysis Report\n';
        csvContent += `Report ID,${reportId}\n`;
        csvContent += `Organization,CyberSecure - Security Intelligence Division\n`;
        csvContent += `Report Period,${startDate} to ${endDate || startDate}\n`;
        csvContent += `Generated Date,${generatedDate}\n`;
        csvContent += `Generated Time,${generatedTime}\n`;
        csvContent += `Classification,CONFIDENTIAL\n`;
        csvContent += `Version,1.0\n\n`;
        
        // EXECUTIVE SUMMARY
        csvContent += 'Executive Summary\n';
        const summary = report.summary || 'No security incidents detected during the reporting period.';
        csvContent += `"${summary.replace(/"/g, '""')}"\n\n`;
        
        // SECURITY METRICS
        csvContent += 'Security Metrics\n';
        csvContent += 'Metric,Count,Severity Level,Priority\n';
        csvContent += `Total Alerts,${report.counts?.total_alerts || report.counts?.total || 0},All,N/A\n`;
        csvContent += `Critical Alerts,${report.counts?.critical || 0},Critical,P1\n`;
        csvContent += `High Priority Alerts,${report.counts?.high || 0},High,P2\n`;
        csvContent += `Unique IP Addresses,${report.unique_ips?.length || 0},N/A,N/A\n`;
        csvContent += `Unique Security Rules,${report.unique_rules?.length || 0},N/A,N/A\n\n`;
        
        // IP ADDRESS ANALYSIS
        if (report.unique_ips && report.unique_ips.length > 0) {
            csvContent += 'IP Address Analysis\n';
            csvContent += 'No.,IP Address,Network Type,Classification\n';
            report.unique_ips.forEach((ip, index) => {
                const isInternal = ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.');
                const networkType = isInternal ? 'Internal' : 'External';
                const classification = ip.startsWith('10.') || ip.startsWith('192.168.') ? 'Private Network' : 'Public Internet';
                csvContent += `${index + 1},${ip},${networkType},${classification}\n`;
            });
            csvContent += '\n';
        }
        
        // SECURITY RULES TRIGGERED
        if (report.unique_rules && report.unique_rules.length > 0) {
            csvContent += 'Security Rules Triggered\n';
            csvContent += 'No.,Rule Name,Category\n';
            report.unique_rules.forEach((rule, index) => {
                // Auto-categorize based on rule name
                let category = 'General Security';
                if (rule.toLowerCase().includes('command') || rule.toLowerCase().includes('execution')) {
                    category = 'Command Execution';
                } else if (rule.toLowerCase().includes('dns')) {
                    category = 'DNS Security';
                } else if (rule.toLowerCase().includes('backdoor')) {
                    category = 'Malware/Backdoor';
                } else if (rule.toLowerCase().includes('bot') || rule.toLowerCase().includes('c2') || rule.toLowerCase().includes('c&c')) {
                    category = 'Botnet/C2';
                }
                csvContent += `${index + 1},"${rule.replace(/"/g, '""')}",${category}\n`;
            });
            csvContent += '\n';
        }
        
        // RECOMMENDATIONS
        if (report.recommendations && report.recommendations.length > 0) {
            csvContent += 'Recommendations\n';
            csvContent += 'Priority,No.,Recommendation\n';
            report.recommendations.forEach((rec, index) => {
                // Auto-assign priority
                let priority = 'Medium';
                if (rec.toLowerCase().includes('immediately') || rec.toLowerCase().includes('critical') || rec.toLowerCase().includes('isolate')) {
                    priority = 'High';
                } else if (rec.toLowerCase().includes('review') || rec.toLowerCase().includes('monitor')) {
                    priority = 'Low';
                }
                csvContent += `${priority},${index + 1},"${rec.replace(/"/g, '""')}"\n`;
            });
            csvContent += '\n';
        }
        
        // FOOTER
        csvContent += 'Report Footer\n';
        csvContent += `Generated By,CyberSecure Security Platform\n`;
        csvContent += `Timestamp,${new Date().toISOString()}\n`;
        csvContent += `Confidentiality,This report contains confidential information for authorized personnel only\n`;
        
        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `CyberSecure_Report_${reportId}_${startDate.replace(/-/g, '')}_${(endDate || startDate).replace(/-/g, '')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setShowDownloadModal(false);
    };

    // Set date range based on mode
    const setQuickDateRange = (selectedMode) => {
        setMode(selectedMode);
        const today = new Date();
        let start = new Date();
        
        if (selectedMode === 'weekly') {
            start.setDate(today.getDate() - 7);
        } else if (selectedMode === 'monthly') {
            start.setMonth(today.getMonth() - 1);
        }
        
        if (selectedMode !== 'custom') {
            setStartDate(start.toISOString().split('T')[0]);
            setEndDate(today.toISOString().split('T')[0]);
        }
    };

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
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Security Reports</h2>
                        <p className="text-gray-600 dark:text-gray-300 text-lg">AI-powered security analysis and threat intelligence reports</p>
                    </div>

                    {/* Date Range Selection */}
                    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mb-6">
                        <Title className="text-gray-900 dark:text-gray-100 mb-4">Generate Report</Title>
                        
                        {/* Mode Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Select Time Range
                            </label>
                            <div className="flex gap-3 flex-wrap">
                                <button
                                    onClick={() => setQuickDateRange('weekly')}
                                    className={`px-6 py-2 rounded-lg font-medium transition-all ${
                                        mode === 'weekly'
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    Last 7 Days
                                </button>
                                <button
                                    onClick={() => setQuickDateRange('monthly')}
                                    className={`px-6 py-2 rounded-lg font-medium transition-all ${
                                        mode === 'monthly'
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    Last 30 Days
                                </button>
                                <button
                                    onClick={() => { setMode('custom'); setStartDate(''); setEndDate(''); }}
                                    className={`px-6 py-2 rounded-lg font-medium transition-all ${
                                        mode === 'custom'
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    Custom Range
                                </button>
                            </div>
                        </div>

                        {/* Date Inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Start Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    End Date <span className="text-gray-400 text-xs">(Optional - defaults to start date)</span>
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Generate Button - Aligned Right */}
                        <div className="flex justify-end">
                            <button
                                onClick={generateReport}
                                disabled={!startDate || loading}
                                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2.5 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                                        </svg>
                                        Generate Report
                                    </>
                                )}
                            </button>
                        </div>

                        {error && (
                            <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                <div className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-red-800 dark:text-red-300 font-medium">{error}</span>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Report Display */}
                    {report && (
                        <div className="space-y-6">
                            {/* Summary Section with Download Button */}
                            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border border-blue-200 dark:border-gray-600">
                                <div className="flex items-start gap-4">
                                    <div className="bg-blue-600 p-3 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <Title className="text-gray-900 dark:text-gray-100 text-xl mb-3">Executive Summary</Title>
                                        <Text className="text-gray-700 dark:text-gray-300 text-base leading-relaxed whitespace-pre-wrap">
                                            {report.summary || report.json?.summary || 'No summary available'}
                                        </Text>
                                    </div>
                                </div>
                            </Card>

                            {/* Statistics Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Critical Alerts */}
                                {report.counts?.critical !== undefined && (
                                    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Text className="text-gray-500 dark:text-gray-400 text-sm">Critical</Text>
                                                <Title className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                                                    {report.counts.critical}
                                                </Title>
                                            </div>
                                            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                {/* High Alerts */}
                                {report.counts?.high !== undefined && (
                                    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Text className="text-gray-500 dark:text-gray-400 text-sm">High</Text>
                                                <Title className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                                                    {report.counts.high}
                                                </Title>
                                            </div>
                                            <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                {/* Unique IPs */}
                                {report.unique_ips !== undefined && Array.isArray(report.unique_ips) && (
                                    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Text className="text-gray-500 dark:text-gray-400 text-sm">Unique IPs</Text>
                                                <Title className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                                                    {report.unique_ips.length}
                                                </Title>
                                            </div>
                                            <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                                </svg>
                                            </div>
                                        </div>
                                    </Card>
                                )}
                            </div>

                            {/* Download Button Section */}
                            <div className="flex justify-end mt-6 mb-6">
                                <button
                                    onClick={() => setShowDownloadModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    Download Report
                                </button>
                            </div>

                            {/* Detailed Sections */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Unique IPs List */}
                                {report.unique_ips && Array.isArray(report.unique_ips) && report.unique_ips.length > 0 && (
                                    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                        <Title className="text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                            </svg>
                                            Unique IP Addresses
                                        </Title>
                                        <div className="max-h-64 overflow-y-auto">
                                            <div className="space-y-2">
                                                {report.unique_ips.map((ip, index) => (
                                                    <div key={index} className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 rounded-lg flex items-center gap-2">
                                                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">#{index + 1}</span>
                                                        <span className="font-mono text-gray-900 dark:text-gray-100">{ip}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                {/* Unique Rules List */}
                                {report.unique_rules && Array.isArray(report.unique_rules) && report.unique_rules.length > 0 && (
                                    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                        <Title className="text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                            Triggered Rules
                                        </Title>
                                        <div className="max-h-64 overflow-y-auto">
                                            <div className="space-y-2">
                                                {report.unique_rules.map((rule, index) => (
                                                    <div key={index} className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 rounded-lg">
                                                        <Text className="text-gray-900 dark:text-gray-100 text-sm">{rule}</Text>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </Card>
                                )}
                            </div>

                            {/* Raw JSON Data (Collapsible) */}
                            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                <details className="group">
                                    <summary className="cursor-pointer list-none">
                                        <div className="flex items-center justify-between">
                                            <Title className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                                </svg>
                                                Raw Report Data
                                            </Title>
                                            <svg className="h-5 w-5 text-gray-600 group-open:rotate-180 transition-transform" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </summary>
                                    <div className="mt-4">
                                        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs font-mono max-h-96 overflow-y-auto">
                                            {JSON.stringify(report, null, 2)}
                                        </pre>
                                    </div>
                                </details>
                            </Card>
                        </div>
                    )}

                    {/* Info Cards when no report */}
                    {!report && !loading && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="bg-blue-600 p-2 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <Title className="text-gray-900 dark:text-gray-100">Threat Analysis</Title>
                                </div>
                                <Text className="text-gray-700 dark:text-gray-300">
                                    Get AI-powered analysis of security threats detected in your selected time period
                                </Text>
                            </Card>

                            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="bg-purple-600 p-2 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <Title className="text-gray-900 dark:text-gray-100">Quick Insights</Title>
                                </div>
                                <Text className="text-gray-700 dark:text-gray-300">
                                    Identify patterns, unique IPs, and rule violations instantly with automated reporting
                                </Text>
                            </Card>

                            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="bg-green-600 p-2 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    </div>
                                    <Title className="text-gray-900 dark:text-gray-100">Data-Driven</Title>
                                </div>
                                <Text className="text-gray-700 dark:text-gray-300">
                                    Make informed security decisions based on comprehensive data analysis and trends
                                </Text>
                            </Card>
                        </div>
                    )}
                </main>
            </div>

            {/* Download Modal */}
            {showDownloadModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDownloadModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Download Report</h3>
                                <button
                                    onClick={() => setShowDownloadModal(false)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                Choose the format for your security report:
                            </p>

                            <div className="space-y-3">
                                {/* PDF Option */}
                                <button
                                    onClick={downloadPDF}
                                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                                >
                                    <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg group-hover:bg-red-500 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600 dark:text-red-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="font-semibold text-gray-900 dark:text-gray-100">PDF Document</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Professional report for sharing</div>
                                    </div>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                </button>

                                {/* CSV Option */}
                                <button
                                    onClick={downloadCSV}
                                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all group"
                                >
                                    <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg group-hover:bg-green-500 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600 dark:text-green-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="font-semibold text-gray-900 dark:text-gray-100">CSV Spreadsheet</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Raw data for analysis</div>
                                    </div>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Reports;