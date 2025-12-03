/**
 * MCP (Model Context Protocol) Service
 * Implements universal protocol for AI to communicate with external systems
 * This allows the chatbot to access real-time data and perform actions
 */

class MCPService {
    constructor(clickhouseClient) {
        this.clickhouse = clickhouseClient;
        this.tools = this.initializeTools();
    }

    /**
     * Initialize available MCP tools that the AI can use
     */
    initializeTools() {
        return [
            {
                name: "get_alerts",
                description: "Retrieve security alerts from ClickHouse database. Can filter by severity, time range, or IP address.",
                parameters: {
                    severity: "Optional: low, medium, high, critical",
                    limit: "Optional: number of alerts to return (default: 10)",
                    hours: "Optional: alerts from last N hours"
                }
            },
            {
                name: "get_alert_details",
                description: "Get detailed information about a specific alert",
                parameters: {
                    alert_name: "Required: name of the alert",
                    ip: "Optional: IP address to filter"
                }
            },
            {
                name: "analyze_threat",
                description: "Analyze threat patterns and provide security insights",
                parameters: {
                    threat_type: "Type of threat to analyze",
                    timeframe: "Optional: time period for analysis"
                }
            },
            {
                name: "get_statistics",
                description: "Get security statistics and metrics",
                parameters: {
                    metric: "alerts_today, critical_count, severity_distribution"
                }
            }
        ];
    }

    /**
     * Execute MCP tool based on AI request
     */
    async executeTool(toolName, parameters) {
        console.log(`[MCP] Executing tool: ${toolName}`, parameters);

        switch (toolName) {
            case "get_alerts":
                return await this.getAlerts(parameters);
            
            case "get_alert_details":
                return await this.getAlertDetails(parameters);
            
            case "analyze_threat":
                return await this.analyzeThreat(parameters);
            
            case "get_statistics":
                return await this.getStatistics(parameters);
            
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    /**
     * Get alerts from ClickHouse
     */
    async getAlerts(params = {}) {
        try {
            const { severity, limit = 10, hours } = params;
            let query = `
                SELECT 
                    alert_id,
                    timestamp,
                    ip,
                    port,
                    severity,
                    risk_score,
                    rule_name,
                    reason,
                    direction
                FROM enriched_alerts
            `;
            const conditions = ['timestamp > \'1970-01-01 00:00:01\''];

            if (severity) {
                conditions.push(`severity = '${severity}'`);
            }

            if (hours) {
                conditions.push(`timestamp >= now() - INTERVAL ${hours} HOUR`);
            }

            if (conditions.length > 0) {
                query += ` WHERE ${conditions.join(' AND ')}`;
            }

            query += ` ORDER BY timestamp DESC LIMIT ${limit}`;

            const result = await this.clickhouse.query({
                query,
                format: 'JSONEachRow'
            });

            const alerts = await result.json();
            return {
                success: true,
                count: alerts.length,
                data: alerts
            };
        } catch (error) {
            console.error('[MCP] Error getting alerts:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get detailed information about specific alert
     */
    async getAlertDetails(params = {}) {
        try {
            const { alert_name, ip } = params;
            
            if (!alert_name) {
                throw new Error("alert_name is required");
            }

            let query = `
                SELECT * FROM enriched_alerts 
                WHERE rule_name = '${alert_name}'
                AND timestamp > '1970-01-01 00:00:01'
            `;

            if (ip) {
                query += ` AND ip = '${ip}'`;
            }

            query += ` ORDER BY timestamp DESC LIMIT 20`;

            const result = await this.clickhouse.query({
                query,
                format: 'JSONEachRow'
            });

            const alerts = await result.json();
            
            if (alerts.length === 0) {
                return {
                    success: false,
                    message: `No alerts found for: ${alert_name}`
                };
            }

            // Aggregate statistics
            const stats = {
                total_occurrences: alerts.length,
                severity_levels: [...new Set(alerts.map(a => a.severity))],
                affected_ips: [...new Set(alerts.map(a => a.ip))],
                first_seen: alerts[alerts.length - 1].timestamp,
                last_seen: alerts[0].timestamp,
                details: alerts.slice(0, 5) // Return top 5 recent
            };

            return {
                success: true,
                data: stats
            };
        } catch (error) {
            console.error('[MCP] Error getting alert details:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Analyze threat patterns
     */
    async analyzeThreat(params = {}) {
        try {
            const { threat_type, timeframe = 24 } = params;

            let query = `
                SELECT 
                    rule_name as threat_category,
                    severity,
                    COUNT(*) as count,
                    COUNT(DISTINCT ip) as unique_ips
                FROM enriched_alerts
                WHERE timestamp >= now() - INTERVAL ${timeframe} HOUR
                AND timestamp > '1970-01-01 00:00:01'
            `;

            if (threat_type) {
                query += ` AND rule_name = '${threat_type}'`;
            }

            query += ` GROUP BY rule_name, severity ORDER BY count DESC`;

            const result = await this.clickhouse.query({
                query,
                format: 'JSONEachRow'
            });

            const analysis = await result.json();

            return {
                success: true,
                timeframe: `${timeframe} hours`,
                data: analysis
            };
        } catch (error) {
            console.error('[MCP] Error analyzing threat:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get security statistics
     */
    async getStatistics(params = {}) {
        try {
            const { metric } = params;

            const queries = {
                alerts_today: `
                    SELECT COUNT(*) as count 
                    FROM enriched_alerts 
                    WHERE toDate(timestamp) = today()
                    AND timestamp > '1970-01-01 00:00:01'
                `,
                critical_count: `
                    SELECT COUNT(*) as count 
                    FROM enriched_alerts 
                    WHERE severity = 'critical' 
                    AND timestamp >= now() - INTERVAL 24 HOUR
                    AND timestamp > '1970-01-01 00:00:01'
                `,
                severity_distribution: `
                    SELECT severity, COUNT(*) as count 
                    FROM enriched_alerts 
                    WHERE timestamp >= now() - INTERVAL 24 HOUR
                    AND timestamp > '1970-01-01 00:00:01'
                    GROUP BY severity
                `
            };

            const query = metric ? queries[metric] : queries.severity_distribution;

            if (!query) {
                throw new Error(`Unknown metric: ${metric}`);
            }

            const result = await this.clickhouse.query({
                query,
                format: 'JSONEachRow'
            });

            const stats = await result.json();

            return {
                success: true,
                metric: metric || 'severity_distribution',
                data: stats
            };
        } catch (error) {
            console.error('[MCP] Error getting statistics:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get available tools for AI context
     */
    getAvailableTools() {
        return this.tools;
    }
}

module.exports = MCPService;
