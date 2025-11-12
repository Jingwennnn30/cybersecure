const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// MCP (Model Context Protocol) Handler
class MCPHandler {
    constructor(clickhouseClient) {
        this.clickhouseClient = clickhouseClient;
        this.tools = this.initializeTools();
    }

    initializeTools() {
        return [
            {
                name: 'get_alerts',
                description: 'Retrieve security alerts from the database. Can filter by severity, time range, or specific criteria.',
                parameters: {
                    type: 'object',
                    properties: {
                        severity: {
                            type: 'string',
                            enum: ['low', 'medium', 'high', 'critical'],
                            description: 'Filter by alert severity level',
                        },
                        limit: {
                            type: 'number',
                            description: 'Maximum number of alerts to return (default: 10)',
                        },
                        timeframe: {
                            type: 'string',
                            description: 'Time range: today, week, month, or specific date',
                        },
                    },
                },
            },
            {
                name: 'get_alert_details',
                description: 'Get detailed information about a specific alert including IP, port, threat category, and recommendations.',
                parameters: {
                    type: 'object',
                    properties: {
                        alert_id: {
                            type: 'string',
                            description: 'The unique identifier or name of the alert',
                        },
                    },
                    required: ['alert_id'],
                },
            },
            {
                name: 'get_security_summary',
                description: 'Get overall security status summary including critical alerts count, system health, and threat trends.',
                parameters: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'analyze_threat',
                description: 'Analyze a specific threat pattern or IP address for security risks.',
                parameters: {
                    type: 'object',
                    properties: {
                        ip: {
                            type: 'string',
                            description: 'IP address to analyze',
                        },
                        threat_type: {
                            type: 'string',
                            description: 'Type of threat to analyze',
                        },
                    },
                },
            },
        ];
    }

    async executeFunction(functionName, args) {
        console.log(`[MCP] Executing function: ${functionName}`, args);

        switch (functionName) {
            case 'get_alerts':
                return await this.getAlerts(args);
            case 'get_alert_details':
                return await this.getAlertDetails(args);
            case 'get_security_summary':
                return await this.getSecuritySummary();
            case 'analyze_threat':
                return await this.analyzeThreat(args);
            default:
                return { error: 'Unknown function' };
        }
    }

    async getAlerts(args) {
        const { severity, limit = 10, timeframe } = args;
        
        let query = `SELECT * FROM my_project_db.alerts WHERE 1=1`;
        const params = {};

        if (severity) {
            query += ` AND severity = {severity:String}`;
            params.severity = severity;
        }

        if (timeframe === 'today') {
            query += ` AND timestamp >= now() - INTERVAL 1 DAY`;
        } else if (timeframe === 'week') {
            query += ` AND timestamp >= now() - INTERVAL 7 DAY`;
        } else if (timeframe === 'month') {
            query += ` AND timestamp >= now() - INTERVAL 30 DAY`;
        }

        query += ` ORDER BY timestamp DESC LIMIT ${limit}`;

        try {
            const resultSet = await this.clickhouseClient.query({
                query,
                format: 'JSONEachRow',
                query_params: params,
            });
            const data = await resultSet.json();
            return {
                success: true,
                count: data.length,
                alerts: data,
            };
        } catch (error) {
            console.error('[MCP] Error fetching alerts:', error);
            return { success: false, error: error.message };
        }
    }

    async getAlertDetails(args) {
        const { alert_id } = args;

        try {
            const query = `
                SELECT * FROM my_project_db.alerts 
                WHERE name LIKE {alert_id:String} 
                OR ip = {alert_id:String}
                LIMIT 1
            `;
            
            const resultSet = await this.clickhouseClient.query({
                query,
                format: 'JSONEachRow',
                query_params: {
                    alert_id: `%${alert_id}%`,
                },
            });
            
            const data = await resultSet.json();
            
            if (data.length > 0) {
                return {
                    success: true,
                    alert: data[0],
                    recommendation: this.generateRecommendation(data[0]),
                };
            } else {
                return { success: false, message: 'Alert not found' };
            }
        } catch (error) {
            console.error('[MCP] Error fetching alert details:', error);
            return { success: false, error: error.message };
        }
    }

    async getSecuritySummary() {
        try {
            const queries = {
                total: 'SELECT COUNT(*) as count FROM my_project_db.alerts WHERE timestamp >= now() - INTERVAL 24 HOUR',
                critical: 'SELECT COUNT(*) as count FROM my_project_db.alerts WHERE severity = \'critical\' AND timestamp >= now() - INTERVAL 24 HOUR',
                high: 'SELECT COUNT(*) as count FROM my_project_db.alerts WHERE severity = \'high\' AND timestamp >= now() - INTERVAL 24 HOUR',
                bySeverity: 'SELECT severity, COUNT(*) as count FROM my_project_db.alerts WHERE timestamp >= now() - INTERVAL 7 DAY GROUP BY severity',
            };

            const results = {};
            for (const [key, query] of Object.entries(queries)) {
                const resultSet = await this.clickhouseClient.query({
                    query,
                    format: 'JSONEachRow',
                });
                results[key] = await resultSet.json();
            }

            return {
                success: true,
                summary: {
                    totalAlertsToday: results.total[0]?.count || 0,
                    criticalAlerts: results.critical[0]?.count || 0,
                    highAlerts: results.high[0]?.count || 0,
                    severityDistribution: results.bySeverity,
                },
            };
        } catch (error) {
            console.error('[MCP] Error fetching security summary:', error);
            return { success: false, error: error.message };
        }
    }

    async analyzeThreat(args) {
        const { ip, threat_type } = args;

        try {
            let query = 'SELECT * FROM my_project_db.alerts WHERE 1=1';
            const params = {};

            if (ip) {
                query += ' AND ip = {ip:String}';
                params.ip = ip;
            }

            if (threat_type) {
                query += ' AND threat_category LIKE {threat_type:String}';
                params.threat_type = `%${threat_type}%`;
            }

            query += ' ORDER BY timestamp DESC LIMIT 20';

            const resultSet = await this.clickhouseClient.query({
                query,
                format: 'JSONEachRow',
                query_params: params,
            });

            const data = await resultSet.json();

            return {
                success: true,
                analysis: {
                    totalOccurrences: data.length,
                    alerts: data,
                    riskAssessment: this.assessRisk(data),
                },
            };
        } catch (error) {
            console.error('[MCP] Error analyzing threat:', error);
            return { success: false, error: error.message };
        }
    }

    generateRecommendation(alert) {
        const recommendations = {
            critical: 'Immediate action required! Isolate affected systems and investigate thoroughly.',
            high: 'Prioritize investigation. Review logs and consider containment measures.',
            medium: 'Monitor closely and investigate when resources permit.',
            low: 'Document and review during routine security analysis.',
        };

        return recommendations[alert.severity] || 'Review and assess the security event.';
    }

    assessRisk(alerts) {
        const criticalCount = alerts.filter(a => a.severity === 'critical').length;
        const highCount = alerts.filter(a => a.severity === 'high').length;

        if (criticalCount > 5) return 'CRITICAL: Multiple critical threats detected. Immediate response required.';
        if (criticalCount > 0 || highCount > 10) return 'HIGH: Significant security concern. Prompt investigation needed.';
        if (highCount > 0) return 'MODERATE: Security events require attention.';
        return 'LOW: Normal security activity.';
    }
}

// Chat History Storage (for auditing - MPP08-04)
const chatHistory = new Map();

function saveChatHistory(userId, message, response) {
    if (!chatHistory.has(userId)) {
        chatHistory.set(userId, []);
    }
    chatHistory.get(userId).push({
        timestamp: new Date(),
        userMessage: message,
        botResponse: response,
    });
}

function getChatHistory(userId, limit = 50) {
    return chatHistory.get(userId)?.slice(-limit) || [];
}

// Main Chatbot Endpoint
router.post('/chatbot', async (req, res) => {
    try {
        const { message, history = [], userId = 'default' } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Initialize MCP Handler
        const mcpHandler = new MCPHandler(req.app.locals.clickhouseClient);

        // System prompt with MCP context
        const systemPrompt = `You are a cybersecurity AI assistant for a Security Operations Center (SOC). 
Your role is to help security analysts and system users understand security alerts, analyze threats, and provide actionable recommendations.

You have access to the following tools through MCP (Model Context Protocol):
${JSON.stringify(mcpHandler.tools, null, 2)}

When users ask about alerts, security status, or threat analysis, use the appropriate tool to fetch real-time data.
Provide clear, concise responses. For security recommendations, be specific but brief.

Current capabilities:
- Real-time alert retrieval and analysis
- Historical data queries
- Threat pattern analysis
- Security status summaries
- Alert explanations with context
`;

        // Build conversation history
        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.slice(-10).map(h => [
                { role: 'user', content: h.content },
                { role: 'assistant', content: h.response },
            ]).flat(),
            { role: 'user', content: message },
        ];

        // First OpenAI call - determine if function calling is needed
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: messages,
            functions: mcpHandler.tools,
            function_call: 'auto',
        });

        const responseMessage = completion.choices[0].message;

        // If OpenAI wants to call a function (MCP tool)
        if (responseMessage.function_call) {
            const functionName = responseMessage.function_call.name;
            const functionArgs = JSON.parse(responseMessage.function_call.arguments);

            console.log(`[Chatbot] Calling MCP function: ${functionName}`);

            // Execute the function through MCP
            const functionResponse = await mcpHandler.executeFunction(functionName, functionArgs);

            // Send function result back to OpenAI for natural language response
            messages.push(responseMessage);
            messages.push({
                role: 'function',
                name: functionName,
                content: JSON.stringify(functionResponse),
            });

            const secondCompletion = await openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: messages,
            });

            const finalResponse = secondCompletion.choices[0].message.content;

            // Save to chat history (auditing)
            saveChatHistory(userId, message, finalResponse);

            return res.json({
                response: finalResponse,
                mcpUsed: true,
                function: functionName,
            });
        } else {
            // Direct response without function calling
            const response = responseMessage.content;

            // Save to chat history
            saveChatHistory(userId, message, response);

            return res.json({
                response: response,
                mcpUsed: false,
            });
        }
    } catch (error) {
        console.error('[Chatbot] Error:', error);
        return res.status(500).json({
            error: 'Failed to process request',
            message: error.message,
        });
    }
});

// Get chat history endpoint (MPP08-04)
router.get('/chatbot/history/:userId', (req, res) => {
    const { userId } = req.params;
    const { limit } = req.query;
    
    const history = getChatHistory(userId, limit ? parseInt(limit) : 50);
    
    res.json({
        userId,
        count: history.length,
        history,
    });
});

module.exports = router;
