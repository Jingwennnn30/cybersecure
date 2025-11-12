/**
 * AI Chatbot Service with OpenAI Integration
 * Implements security analysis chatbot with MCP protocol support
 */

const OpenAI = require('openai');
const MCPService = require('./mcpService');

class ChatbotService {
    constructor(clickhouseClient) {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        this.mcpService = new MCPService(clickhouseClient);
        this.conversationHistory = new Map(); // Store conversation history per session
        
        // System prompt for the AI
        this.systemPrompt = `You are a cybersecurity assistant for the CyberSecure platform. Your role is to:

1. Analyze security alerts and threats
2. Provide clear explanations of security incidents
3. Give actionable recommendations for threat mitigation
4. Query and explain data from the security monitoring system
5. Help users understand security metrics and trends

You have access to the following tools through MCP (Model Context Protocol):
${JSON.stringify(this.mcpService.getAvailableTools(), null, 2)}

When users ask about alerts, statistics, or security data, use the appropriate MCP tool to retrieve real-time information.

Guidelines:
- Be concise and clear in your responses
- Always prioritize critical security information
- Provide specific recommendations when possible
- Use technical terms but explain them simply
- When showing alert data, format it in a readable way`;
    }

    /**
     * Process user message and generate AI response
     */
    async chat(sessionId, userMessage, messageHistory = []) {
        try {
            console.log(`[Chatbot] Processing message for session: ${sessionId}`);
            console.log(`[Chatbot] User message: ${userMessage}`);

            // Detect if user is asking for data that requires MCP tools
            const toolCall = await this.detectToolUsage(userMessage);
            
            let toolContext = '';
            if (toolCall) {
                console.log(`[Chatbot] Executing MCP tool: ${toolCall.tool} with params:`, toolCall.parameters);
                try {
                    const toolResult = await this.mcpService.executeTool(toolCall.tool, toolCall.parameters);
                    console.log(`[Chatbot] Tool result:`, toolResult);
                    
                    if (toolResult && toolResult.data) {
                        toolContext = `\n\n[Real-time Data Retrieved]:\n${JSON.stringify(toolResult.data, null, 2)}`;
                    }
                } catch (toolError) {
                    console.error(`[Chatbot] Tool execution error:`, toolError);
                    toolContext = '\n\n[Note: Unable to retrieve real-time data at this moment]';
                }
            }

            // Build conversation messages
            const messages = [
                { role: 'system', content: this.systemPrompt },
                ...messageHistory.slice(-10).map(msg => ({
                    role: msg.type === 'user' ? 'user' : 'assistant',
                    content: msg.content
                })),
                { 
                    role: 'user', 
                    content: userMessage + toolContext 
                }
            ];

            // Call OpenAI API
            console.log(`[Chatbot] Calling OpenAI API...`);
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: messages,
                temperature: 0.7,
                max_tokens: 800
            });

            const response = completion.choices[0].message.content;
            console.log(`[Chatbot] OpenAI response: ${response}`);

            // Store conversation in history
            this.storeConversation(sessionId, userMessage, response);

            return {
                success: true,
                response: response,
                toolUsed: toolCall ? toolCall.tool : null,
                timestamp: new Date()
            };

        } catch (error) {
            console.error('[Chatbot] Error:', error);
            
            // Handle specific errors
            if (error.code === 'insufficient_quota') {
                return {
                    success: false,
                    response: "I'm currently experiencing API limitations. Please try again later or contact support.",
                    error: 'quota_exceeded'
                };
            }

            return {
                success: false,
                response: "I apologize, but I encountered an error processing your request. Please try again.",
                error: error.message
            };
        }
    }

    /**
     * Detect if user query requires MCP tool usage
     */
    async detectToolUsage(message) {
        const lowerMessage = message.toLowerCase();

        // Pattern matching for common queries - detect ANY request for alerts
        if (lowerMessage.includes('alert') || 
            lowerMessage.includes('threat') ||
            lowerMessage.includes('security issue')) {
            
            const params = {};
            
            // Extract severity
            if (lowerMessage.includes('critical')) params.severity = 'critical';
            else if (lowerMessage.includes('high')) params.severity = 'high';
            else if (lowerMessage.includes('medium')) params.severity = 'medium';
            else if (lowerMessage.includes('low')) params.severity = 'low';
            
            // Extract time range
            const hoursMatch = message.match(/(\d+)\s*hours?/i);
            if (hoursMatch) {
                params.hours = parseInt(hoursMatch[1]);
            } else if (lowerMessage.includes('yesterday')) {
                params.hours = 48; // Last 48 hours to cover yesterday
            } else if (lowerMessage.includes('today') || lowerMessage.includes('recent')) {
                params.hours = 24; // Default to last 24 hours for "today"
            } else if (lowerMessage.includes('week') || lowerMessage.includes('past week')) {
                params.hours = 168; // 7 days
            }

            console.log(`[Chatbot] Tool detected: get_alerts with params:`, params);
            return {
                tool: 'get_alerts',
                parameters: params
            };
        }

        // Alert details query
        if (lowerMessage.includes('alert details') || 
            lowerMessage.includes('tell me about') ||
            lowerMessage.includes('information about')) {
            
            // Try to extract alert name (look for quoted text or specific patterns)
            const alertMatch = message.match(/["']([^"']+)["']/);
            if (alertMatch) {
                return {
                    tool: 'get_alert_details',
                    parameters: { alert_name: alertMatch[1] }
                };
            }
        }

        // Statistics query
        if (lowerMessage.includes('statistics') || 
            lowerMessage.includes('stats') ||
            lowerMessage.includes('how many alerts')) {
            
            return {
                tool: 'get_statistics',
                parameters: {}
            };
        }

        // Threat analysis
        if (lowerMessage.includes('analyze') || 
            lowerMessage.includes('threat pattern') ||
            lowerMessage.includes('security trends')) {
            
            return {
                tool: 'analyze_threat',
                parameters: { timeframe: 24 }
            };
        }

        return null;
    }

    /**
     * Store conversation history for auditing (MPP08-04)
     */
    storeConversation(sessionId, userMessage, botResponse) {
        if (!this.conversationHistory.has(sessionId)) {
            this.conversationHistory.set(sessionId, []);
        }

        const history = this.conversationHistory.get(sessionId);
        history.push({
            timestamp: new Date(),
            user: userMessage,
            bot: botResponse
        });

        // Keep only last 50 messages per session
        if (history.length > 50) {
            history.shift();
        }
    }

    /**
     * Get conversation history for a session (auditing)
     */
    getConversationHistory(sessionId) {
        return this.conversationHistory.get(sessionId) || [];
    }

    /**
     * Get help and FAQ responses
     */
    getHelp(topic) {
        const helpTopics = {
            'commands': `Available commands:
- "Show alerts" - Display recent security alerts
- "Show critical alerts" - Display only critical severity alerts
- "Get alert details [alert name]" - Detailed info about specific alert
- "Statistics" - View security metrics
- "Analyze threats" - Get threat pattern analysis`,
            
            'usage': `How to use the chatbot:
1. Ask questions in natural language
2. Request specific alert information
3. Query historical data by time range
4. Get security recommendations
5. View system statistics`,
            
            'default': `I can help you with:
- Viewing and analyzing security alerts
- Understanding threat patterns
- Getting security recommendations
- Querying historical data
- Explaining security metrics

Try asking: "Show me critical alerts" or "What are the latest threats?"`
        };

        return helpTopics[topic] || helpTopics['default'];
    }
}

module.exports = ChatbotService;
