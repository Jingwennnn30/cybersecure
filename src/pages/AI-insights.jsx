import React, { useState, useEffect } from 'react';
import { Card, Title, Text, Grid } from '@tremor/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Navigation from '../components/Navigation';
import { API_BASE_URL } from '../config';

function AIInsights({ darkMode, setDarkMode }) {
  const [insightData, setInsightData] = useState([]);
  const [threatTypes, setThreatTypes] = useState([]);
  const [categorizedRecommendations, setCategorizedRecommendations] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState({}); // Track which items are expanded

  useEffect(() => {
    fetchAIInsights();
    fetchCategorizedRecommendations();
  }, []);

  // Toggle expand/collapse for a specific recommendation
  const toggleExpand = (category, index) => {
    const key = `${category}_${index}`;
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const fetchCategorizedRecommendations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-recommendations`);
      
      if (!response.ok) {
        console.error('Failed to fetch recommendations:', response.status);
        return;
      }
      
      const data = await response.json();
      
      if (data) {
        setCategorizedRecommendations(data);
      }
    } catch (error) {
      console.error('Error fetching categorized recommendations:', error);
      // Keep default empty state on error
      setCategorizedRecommendations({});
    }
  };

  const fetchAIInsights = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-insights`);
      const data = await response.json();

      // Process category data for bar chart
      if (data.categoryData && data.categoryData.length > 0) {
        setInsightData(data.categoryData);
      }

      // Process threat type data for donut chart
      if (data.threatTypeData && data.threatTypeData.length > 0) {
        const total = data.threatTypeData.reduce((sum, item) => sum + parseInt(item.count), 0);
        setThreatTypes(data.threatTypeData
          .filter(item => item.threat_type !== 'Other' || parseInt(item.count) > 0)
          .map(item => ({
            name: item.threat_type,
            value: total > 0 ? Math.round((parseInt(item.count) / total) * 100) : 0
          }))
        );
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      setLoading(false);
    }
  };

  // Helper function to format category name for display
  const formatCategoryName = (category) => {
    // Format the category names
    const nameMap = {
      'multiple_logon_failure': 'Multiple Logon Failure',
      'xz_backdoor_execution': 'XZ Backdoor Execution',
      'dns_botnet_c2': 'DNS Botnet C2'
    };
    return nameMap[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  // Helper function to get category color based on name
  const getCategoryColor = (category) => {
    // Generate colors based on category name hash for consistency
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('auth') || categoryLower.includes('logon') || categoryLower.includes('credential')) {
      return { bg: 'from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20', border: 'border-red-500', badge: 'bg-red-500' };
    } else if (categoryLower.includes('backdoor') || categoryLower.includes('xz') || categoryLower.includes('execution')) {
      return { bg: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20', border: 'border-purple-500', badge: 'bg-purple-500' };
    } else if (categoryLower.includes('dns') || categoryLower.includes('botnet') || categoryLower.includes('c2')) {
      return { bg: 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20', border: 'border-blue-500', badge: 'bg-blue-500' };
    } else if (categoryLower.includes('malware') || categoryLower.includes('virus')) {
      return { bg: 'from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20', border: 'border-yellow-500', badge: 'bg-yellow-500' };
    } else {
      return { bg: 'from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900', border: 'border-gray-500', badge: 'bg-gray-500' };
    }
  };

  // Helper function to format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      return new Date(timestamp).toLocaleString('en-MY', { 
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  // Sidebar and main content styling
  const sidebarClass = "w-72 bg-white dark:bg-gray-900 p-6 shadow-xl border-r border-gray-200 dark:border-gray-800 fixed h-screen flex flex-col";
  const mainClass = "flex-1 pl-80 p-8 overflow-auto bg-background-light dark:bg-gray-900 transition-colors min-h-screen";

  // Toggle switch (standardized position, larger size)
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
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 20 20">
              <path
                fill="currentColor"
                d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"
              />
            </svg>
          ) : (
            // Sun icon
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 20 20">
              <path
                fill="currentColor"
                d="M10 15a5 5 0 100-10 5 5 0 000 10zm0 2a7 7 0 110-14 7 7 0 010 14zm0-16a1 1 0 011 1v2a1 1 0 11-2 0V2a1 1 0 011-1zm0 16a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1zm8-8a1 1 0 01-1 1h-2a1 1 0 110-2h2a1 1 0 011 1zm-16 0a1 1 0 011 1H2a1 1 0 110-2h2a1 1 0 011 1zm12.071 5.071a1 1 0 010 1.415l-1.414 1.414a1 1 0 11-1.415-1.415l1.415-1.414a1 1 0 011.414 0zm-10.142 0a1 1 0 010 1.415L4.93 17.9a1 1 0 11-1.415-1.415l1.415-1.414a1 1 0 011.414 0zm10.142-10.142a1 1 0 00-1.415 0L13.9 4.93a1 1 0 101.415 1.415l1.414-1.415a1 1 0 000-1.414zm-10.142 0a1 1 0 00-1.415 0L2.1 4.93A1 1 0 103.515 6.343l1.415-1.415a1 1 0 000-1.414z"
              />
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
    <div className="min-h-screen bg-background-light dark:bg-gray-900 transition-colors">
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
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">AI Insights</h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg">AI-powered security analysis and predictions</p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Text className="text-gray-500 dark:text-gray-400">Loading AI insights...</Text>
            </div>
          ) : (
            <>
              <Grid numItems={1} numItemsSm={2} className="gap-6 mb-6">
                {/* Threat Detection Chart */}
                <Card className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-900 border border-blue-200 dark:border-gray-600 shadow-lg">
                  <Title className="text-gray-900 dark:text-white font-bold">Threat Detection by Category</Title>
                  <Text className="text-gray-600 dark:text-gray-400 mt-2">Total alerts detected across main categories</Text>
                  <div className="mt-6">
                    {insightData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart 
                          data={insightData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#374151" : "#e5e7eb"} />
                          <XAxis 
                            dataKey="category" 
                            stroke={darkMode ? "#9ca3af" : "#6b7280"}
                            angle={-15}
                            textAnchor="end"
                            height={80}
                            style={{ fontSize: '13px', fontWeight: '500' }}
                          />
                          <YAxis 
                            stroke={darkMode ? "#9ca3af" : "#6b7280"}
                            style={{ fontSize: '12px' }}
                            label={{ value: 'Number of Alerts', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: darkMode ? '#1f2937' : '#fff', 
                              border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`, 
                              borderRadius: '8px',
                              color: darkMode ? '#e5e7eb' : '#1f2937',
                              padding: '12px'
                            }}
                            cursor={{ fill: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                          />
                          <Bar 
                            dataKey="total" 
                            fill="#3b82f6"
                            radius={[8, 8, 0, 0]} 
                            name="Total Alerts"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-72 flex items-center justify-center">
                        <Text className="text-gray-500">No threat data available</Text>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Threat Distribution */}
                <Card className="bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-gray-900 border border-purple-200 dark:border-gray-600 shadow-lg">
                  <Title className="text-gray-900 dark:text-white font-bold">Threat Type Distribution</Title>
                  <Text className="text-gray-600 dark:text-gray-400 mt-2">Breakdown of identified threats</Text>
                  <div className="mt-6 flex justify-center">
                    {threatTypes.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={threatTypes}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}%`}
                            labelLine={{ stroke: darkMode ? '#9ca3af' : '#6b7280' }}
                          >
                            {threatTypes.map((entry, index) => {
                              const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6'];
                              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                            })}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: darkMode ? '#1f2937' : '#fff', 
                              border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`, 
                              borderRadius: '8px',
                              color: darkMode ? '#e5e7eb' : '#1f2937'
                            }}
                            formatter={(value) => `${value}%`}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-72 flex items-center justify-center">
                        <Text className="text-gray-500">No threat type data available</Text>
                      </div>
                    )}
                  </div>
                </Card>
              </Grid>
            </>
          )}

          {/* AI Recommendations - Categorized by Alert Type */}
          <div className="space-y-6">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">AI Recommendations by Category</h3>
              <p className="text-gray-600 dark:text-gray-300">Security recommendations organized by alert type</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-12">
                <div className="animate-pulse space-y-4 w-full">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-gray-300 dark:bg-gray-700 rounded-xl"></div>
                  ))}
                </div>
              </div>
            ) : (
              Object.keys(categorizedRecommendations).map((category) => {
                const recommendations = categorizedRecommendations[category];
                const colors = getCategoryColor(category);
                const hasRecommendations = recommendations && recommendations.length > 0;

                return (
                  <Card 
                    key={category}
                    className={`bg-gradient-to-br ${colors.bg} border-l-4 ${colors.border} shadow-lg hover:shadow-xl transition-all`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className={`${colors.badge} text-white px-4 py-2 rounded-lg font-bold text-sm`}>
                          {formatCategoryName(category)}
                        </span>
                        {hasRecommendations && (
                          <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-semibold">
                            {recommendations.length} recommendation{recommendations.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {hasRecommendations ? (
                      <div className="space-y-4 mt-4">
                        {recommendations.map((rec, idx) => {
                          const isExpanded = expandedItems[`${category}_${idx}`];
                          
                          return (
                            <div 
                              key={idx}
                              className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
                            >
                              {/* Collapsed view - Summary only */}
                              <div 
                                className="p-4 cursor-pointer flex items-center justify-between"
                                onClick={() => toggleExpand(category, idx)}
                              >
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                                      </svg>
                                      {formatTimestamp(rec.latestEventTime)}
                                    </span>
                                    {rec.severity && (
                                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                                        rec.severity === 'high' || rec.severity === 'critical' 
                                          ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' 
                                          : rec.severity === 'medium' 
                                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200'
                                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                                      }`}>
                                        {rec.severity.toUpperCase()}
                                      </span>
                                    )}
                                    {rec.priority && (
                                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                                        rec.priority === 'high' || rec.priority === 'critical'
                                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200'
                                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                                      }`}>
                                        Priority: {rec.priority.toUpperCase()}
                                      </span>
                                    )}
                                    {rec.occurrenceCount > 1 && (
                                      <span className="px-2 py-1 rounded text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
                                        {rec.occurrenceCount} occurrences
                                      </span>
                                    )}
                                  </div>
                                  
                                  {rec.summary && (
                                    <p className="text-gray-900 dark:text-white font-medium">
                                      {rec.summary}
                                    </p>
                                  )}
                                </div>
                                
                                {/* Expand/Collapse Icon */}
                                <svg 
                                  className={`w-5 h-5 text-gray-500 dark:text-gray-400 ml-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>

                              {/* Expanded view - Full details */}
                              {isExpanded && (
                                <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
                                  {/* Risk Justification */}
                                  {rec.riskJustification && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border-l-2 border-red-500 rounded">
                                      <p className="text-sm text-gray-700 dark:text-gray-300">
                                        <span className="font-semibold text-red-700 dark:text-red-400">Risk: </span>
                                        {rec.riskJustification}
                                      </p>
                                    </div>
                                  )}

                                  {/* Explanation */}
                                  {rec.explanation && (
                                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
                                      <p className="text-sm text-gray-700 dark:text-gray-300">
                                        <span className="font-semibold text-gray-900 dark:text-gray-100">Explanation: </span>
                                        {rec.explanation}
                                      </p>
                                    </div>
                                  )}

                                  {/* Suggestion */}
                                  {rec.suggestion && (
                                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border-l-2 border-green-500 rounded">
                                      <p className="text-sm text-gray-700 dark:text-gray-300">
                                        <span className="font-semibold text-green-700 dark:text-green-400">Suggestion: </span>
                                        {rec.suggestion}
                                      </p>
                                    </div>
                                  )}

                                  {/* Recommended Checks */}
                                  {rec.recommendedChecks && rec.recommendedChecks.length > 0 && (
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                                      <p className="text-sm font-bold text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                                        </svg>
                                        Recommended Actions:
                                      </p>
                                      <ul className="space-y-2">
                                        {rec.recommendedChecks.map((check, checkIdx) => (
                                          <li key={checkIdx} className="text-sm text-gray-700 dark:text-gray-200 flex items-start gap-2">
                                            <span className="text-blue-600 dark:text-blue-400 mt-0.5 font-bold">•</span>
                                            <span>{check}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Time range if available */}
                                  {rec.firstSeen && rec.lastSeen && (
                                    <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        <span className="font-semibold">Time Range:</span> {formatTimestamp(rec.firstSeen)} → {formatTimestamp(rec.lastSeen)}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                        <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        <Text className="text-gray-500 dark:text-gray-400">
                          No recommendations available for {formatCategoryName(category)}
                        </Text>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AIInsights;