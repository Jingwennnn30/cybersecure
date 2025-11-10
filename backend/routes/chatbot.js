/**
 * Chatbot API Routes
 * Handles all chatbot-related endpoints
 */

const express = require('express');
const router = express.Router();

module.exports = (chatbotService) => {
    /**
     * POST /api/chatbot
     * Main chat endpoint
     */
    router.post('/chatbot', async (req, res) => {
        try {
            const { message, history, sessionId } = req.body;

            if (!message || !message.trim()) {
                return res.status(400).json({
                    success: false,
                    error: 'Message is required'
                });
            }

            const session = sessionId || `session_${Date.now()}`;

            const result = await chatbotService.chat(session, message, history || []);

            res.json(result);

        } catch (error) {
            console.error('[API] Chatbot error:', error);
            res.status(500).json({
                success: false,
                response: 'Sorry, I encountered an error. Please try again.',
                error: error.message
            });
        }
    });

    /**
     * GET /api/chatbot/help/:topic
     * Get help information
     */
    router.get('/chatbot/help/:topic?', (req, res) => {
        try {
            const topic = req.params.topic || 'default';
            const helpText = chatbotService.getHelp(topic);

            res.json({
                success: true,
                topic: topic,
                help: helpText
            });

        } catch (error) {
            console.error('[API] Help error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/chatbot/history/:sessionId
     * Get conversation history for auditing
     */
    router.get('/chatbot/history/:sessionId', (req, res) => {
        try {
            const { sessionId } = req.params;
            const history = chatbotService.getConversationHistory(sessionId);

            res.json({
                success: true,
                sessionId: sessionId,
                count: history.length,
                history: history
            });

        } catch (error) {
            console.error('[API] History error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/chatbot/tools
     * Get available MCP tools (for documentation)
     */
    router.get('/chatbot/tools', (req, res) => {
        try {
            const tools = chatbotService.mcpService.getAvailableTools();

            res.json({
                success: true,
                protocol: 'MCP (Model Context Protocol)',
                tools: tools
            });

        } catch (error) {
            console.error('[API] Tools error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
};
