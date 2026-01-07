// Load environment variables
require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const { createClient } = require('@clickhouse/client');
const cors = require('cors');
const app = express();
const https = require('https');
const WebSocket = require('ws');
const { Server } = require('http');

app.use(cors());
const PORT = 4000;

// Create WebSocket server
const server = new Server(app);
const wss = new WebSocket.Server({ server });

// ClickHouse client configuration
const client = createClient({
  url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DB || 'default'
});

console.log('Connecting to ClickHouse at:', process.env.CLICKHOUSE_HOST);
console.log('Using database:', process.env.CLICKHOUSE_DB);

// Test ClickHouse connection
client.ping().then(() => {
  console.log('✓ ClickHouse connection successful!');
}).catch((err) => {
  console.error('✗ ClickHouse connection error:', err.message);
});

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Store alerts in memory (for demo; use a DB for production)
let liveAlerts = [];

app.use(cors());
app.use(express.json());
// Also support URL-encoded bodies (some tools default to this)
app.use(express.urlencoded({ extended: true }));

// Make ClickHouse client available to routes
app.locals.clickhouseClient = client;

// Initialize Chatbot Service with MCP (only if OpenAI key is available)
if (process.env.OPENAI_API_KEY) {
  try {
    const ChatbotService = require('./services/chatbotService');
    const chatbotService = new ChatbotService(client);
    console.log('✓ Chatbot Service initialized with MCP protocol');
    
    // Import and use chatbot routes
    const chatbotRouter = require('./routes/chatbot')(chatbotService);
    app.use('/api', chatbotRouter);
  } catch (err) {
    console.warn('⚠ Chatbot Service initialization failed:', err.message);
    console.warn('  Chatbot features will be disabled');
  }
} else {
  console.warn('⚠ OPENAI_API_KEY not configured. Chatbot features will be disabled.');
}

// Simple request logger to help debug routing issues (method + path)
app.use((req, res, next) => {
  try {
    const ts = new Date().toISOString();
    console.log(`${ts} ${req.method} ${req.originalUrl}`);
  } catch {}
  next();
});

// Proxy endpoint for n8n report generation webhook
app.post('/api/generate-report', async (req, res) => {
  try {
    const { mode, start_date, end_date } = req.body;
    
    // n8n webhook URL - Use the PRODUCTION URL from n8n (make sure workflow is ACTIVE)
    // Check your n8n workflow's webhook node > Production URL tab
    const webhookUrl = 'https://webhook.csnet.my/webhook/2cfbdbec-36fa-4ed1-b93b-be50375ad661';
    
    console.log('Calling n8n webhook with payload:', { mode, start_date, end_date });
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mode, start_date, end_date })
    });

    const responseText = await response.text();
    console.log('Webhook response status:', response.status);
    console.log('Webhook response body:', responseText);

    if (!response.ok) {
      console.error('Webhook error response:', responseText);
      throw new Error(`Webhook returned ${response.status}: ${responseText}`);
    }

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response as JSON:', responseText);
      throw new Error('Invalid JSON response from n8n workflow. Check n8n execution logs for errors.');
    }

    console.log('Webhook response:', data);
    res.json(data);
  } catch (error) {
    console.error('Error calling n8n webhook:', error);
    res.status(500).json({ 
      error: 'Failed to generate report', 
      message: error.message,
      hint: 'Check n8n workflow execution logs for detailed errors'
    });
  }
});

// Email report endpoint - triggers n8n email workflow
app.post('/api/email-report', async (req, res) => {
  try {
    const { report, period, timestamp } = req.body;
    
    // n8n webhook URL for email workflow - UPDATE THIS WITH YOUR N8N WEBHOOK URL
    const webhookUrl = 'https://webhook.csnet.my/webhook/YOUR_EMAIL_WORKFLOW_WEBHOOK_ID';
    
    console.log('Triggering n8n email workflow with report data');
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        report,
        period,
        timestamp,
        action: 'email_report'
      })
    });

    const responseText = await response.text();
    console.log('Email workflow response status:', response.status);

    if (!response.ok) {
      console.error('Email workflow error:', responseText);
      throw new Error(`Email workflow returned ${response.status}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { success: true, message: 'Email sent successfully' };
    }

    console.log('Email workflow response:', data);
    res.json({ success: true, message: 'Report email sent successfully', data });
  } catch (error) {
    console.error('Error triggering email workflow:', error);
    res.status(500).json({ 
      error: 'Failed to send email report', 
      message: error.message
    });
  }
});

// n8n webhook POSTs here
app.post('/webhook/alerts', (req, res) => {
  const alert = req.body;
  if (alert && alert.short_description) {
    liveAlerts.unshift(alert);
    if (liveAlerts.length > 50) liveAlerts = liveAlerts.slice(0, 50);
    res.status(200).json({ success: true });
  } else {
    res.status(400).json({ error: 'Invalid alert format' });
  }
});

// Telegram alert endpoint (for n8n HTTP Telegram node)
app.post('/alert', (req, res) => {
  console.log('Telegram alert received:', req.body);

  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  const text = req.body?.summary || req.body?.message || JSON.stringify(req.body);

  // If Telegram credentials are configured, forward the message to Telegram
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    const payload = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text });
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const tgReq = https.request(options, (tgRes) => {
      let body = '';
      tgRes.on('data', (chunk) => (body += chunk));
      tgRes.on('end', () => {
        const ok = tgRes.statusCode && tgRes.statusCode >= 200 && tgRes.statusCode < 300;
        console.log('Telegram API response:', tgRes.statusCode, body);
        res.status(200).json({ success: ok, message: ok ? 'Alert forwarded to Telegram' : 'Telegram API error', details: body });
      });
    });
    tgReq.on('error', (e) => {
      console.error('Telegram API request failed:', e.message);
      res.status(500).json({ success: false, error: e.message });
    });
    tgReq.write(payload);
    tgReq.end();
  } else {
    // No Telegram credentials configured; just acknowledge
    res.status(200).json({ success: true, message: 'Alert received (Telegram not configured)' });
  }
});

// React dashboard fetches from here
app.get('/api/live-alerts', (req, res) => {
  res.json(liveAlerts);
});

// New endpoint for both admin and analyst
app.get('/get-notification-recipients', async (req, res) => {
  try {
    const snapshot = await db.collection('users')
      .where('role', 'in', ['admin', 'analyst'])
      .get();
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return { email: data.email, name: data.name || '', role: data.role };
    });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


const clickhouse = createClient({
  url: 'https://sphbqmm3pp.ap-southeast-1.aws.clickhouse.cloud:8443',
  username: 'default',
  password: '.frZjEEidX2wb',
  database: 'default',
});

// ClickHouse connection is already tested above with client.ping()

app.get('/api/dashboard-stats', async (req, res) => {
  try {
    console.log('Fetching dashboard stats...');
    
    // Get today's alerts count (Malaysia timezone)
    const alertsTodayQuery = await client.query({
      query: `
        SELECT COUNT(*) as count 
        FROM alert_enriched_events 
        WHERE toDate(toTimeZone(event_time, 'Asia/Kuala_Lumpur')) = toDate(now('Asia/Kuala_Lumpur'))
      `
    });
    const alertsToday = await alertsTodayQuery.json();
    console.log('Today alerts:', alertsToday);

    // Get critical alerts count (high OR critical severity)
    const criticalAlertsQuery = await client.query({
      query: `
        SELECT COUNT(*) as count 
        FROM alert_enriched_events 
        WHERE lower(severity) IN ('high', 'critical')
      `
    });
    const criticalAlerts = await criticalAlertsQuery.json();
    console.log('Critical alerts:', criticalAlerts);

    // Get yesterday's alerts for change calculation
    const yesterdayAlertsQuery = await client.query({
      query: `
        SELECT COUNT(*) as count 
        FROM alert_enriched_events 
        WHERE toDate(toTimeZone(event_time, 'Asia/Kuala_Lumpur')) = toDate(now('Asia/Kuala_Lumpur')) - 1
      `
    });
    const yesterdayAlerts = await yesterdayAlertsQuery.json();

    // Calculate stats - ClickHouse returns data in 'data' array
    const todayCount = parseInt(alertsToday.data?.[0]?.count) || 0;
    const criticalCount = parseInt(criticalAlerts.data?.[0]?.count) || 0;
    const yesterdayCount = parseInt(yesterdayAlerts.data?.[0]?.count) || 0;

    // Get alert trends for last 2 months (this month and last month)
    const alertTrendsQuery = await client.query({
      query: `
        SELECT 
          toStartOfMonth(toTimeZone(event_time, 'Asia/Kuala_Lumpur')) as month,
          count() as Alerts
        FROM alert_enriched_events
        WHERE toTimeZone(event_time, 'Asia/Kuala_Lumpur') >= toStartOfMonth(now('Asia/Kuala_Lumpur')) - INTERVAL 1 MONTH
        GROUP BY month
        ORDER BY month ASC
      `
    });
    const alertTrendsData = await alertTrendsQuery.json();
    const alertTrends = alertTrendsData.data?.map(row => ({
      date: new Date(row.month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
      Alerts: parseInt(row.Alerts) || 0
    })) || [];

    // Get severity distribution from current alerts
    const severityDistQuery = await client.query({
      query: `
        SELECT 
          severity,
          count() as count
        FROM alert_enriched_events
        GROUP BY severity
        ORDER BY count DESC
      `
    });
    const severityDistData = await severityDistQuery.json();
    const severityDist = severityDistData.data?.map(row => ({
      name: row.severity || 'unknown',
      value: parseInt(row.count) || 0
    })) || [];

    const stats = {
      alertsToday: todayCount,
      criticalAlerts: criticalCount,
      alertsChange: yesterdayCount > 0 
        ? ((todayCount - yesterdayCount) / yesterdayCount) * 100 
        : 0,
      systemHealth: criticalCount > 5 ? "Warning" : "Active",
      aiProcessed: 100,
      aiAnalyzed: todayCount,
      alertTrends: alertTrends,
      severityDist: severityDist
    };

    console.log('Sending stats:', stats);
    res.json(stats);
  } catch (err) {
    console.error('Error in /api/dashboard-stats:', err);
    // Return default stats instead of error
    const defaultStats = {
      alertsToday: 0,
      criticalAlerts: 0,
      alertsChange: 0,
      systemHealth: "Unknown",
      aiProcessed: 0,
      aiAnalyzed: 0
    };
    console.warn('Returning default stats due to error');
    res.json(defaultStats);
  }
});

app.get('/api/alerts', async (req, res) => {
  try {
    console.log('Fetching alerts from ClickHouse...');
    const result = await client.query({
      query: `
        SELECT 
          correlation_key,
          event_time as timestamp,
          source_ip as ip,
          severity,
          risk_score,
          risk_level,
          alert_name as name,
          alert_type,
          user,
          host,
          kill_chain_phase,
          auto_escalate,
          payload
        FROM alert_enriched_events 
        WHERE event_time > '1970-01-01 00:00:01'
        ORDER BY event_time DESC
        LIMIT 1000
      `,
      format: 'JSONEachRow'
    });

    console.log('Query executed, parsing JSON...');
    const data = await result.json();
    console.log('Received data count:', data.length);
    if (data.length > 0) {
      console.log('Sample row:', data[0]);
    }

    // Parse and extract important payload fields for easier frontend access
    const enrichedData = data.map(alert => {
      let parsedPayload = {};
      try {
        if (alert.payload) {
          parsedPayload = typeof alert.payload === 'string' ? JSON.parse(alert.payload) : alert.payload;
        }
      } catch (e) {
        console.error('Error parsing payload for alert:', alert.correlation_key, e);
      }

      return {
        ...alert,
        parsedPayload
      };
    });

    res.json(enrichedData);
  } catch (err) {
    console.error('Error in /api/alerts:', err);
    console.error('Error details:', err.message, err.stack);
    // Return empty array instead of error object to prevent frontend crashes
    console.warn('Returning empty array due to database connection error');
    res.json([]);
  }
});

// New endpoint: Get AI analysis insights (using only ai_analysis table)
app.get('/api/ai-insights', async (req, res) => {
  try {
    console.log('Fetching AI insights from ClickHouse...');
    
    // Get all AI analyses
    const analysesQuery = await client.query({
      query: `
        SELECT 
          alert_id,
          ai_summary,
          ai_priority,
          ai_likelihood,
          ai_suggestion,
          ai_explanation,
          ai_recommended_checks
        FROM ai_analysis
        ORDER BY alert_id DESC
        LIMIT 100
      `,
      format: 'JSONEachRow'
    });
    const analyses = await analysesQuery.json();

    // Get priority distribution
    const priorityQuery = await client.query({
      query: `
        SELECT 
          ai_priority as priority,
          count() as count
        FROM ai_analysis
        WHERE ai_priority != ''
        GROUP BY ai_priority
      `,
      format: 'JSONEachRow'
    });
    const priorityDist = await priorityQuery.json();

    // Get likelihood distribution
    const likelihoodQuery = await client.query({
      query: `
        SELECT 
          ai_likelihood as likelihood,
          count() as count
        FROM ai_analysis
        WHERE ai_likelihood != ''
        GROUP BY ai_likelihood
      `,
      format: 'JSONEachRow'
    });
    const likelihoodDist = await likelihoodQuery.json();

    // Categorize threats by analyzing AI summaries
    const categoryQuery = await client.query({
      query: `
        SELECT 
          CASE
            WHEN lower(ai_summary) LIKE '%network%' OR lower(ai_summary) LIKE '%ddos%' 
                 OR lower(ai_summary) LIKE '%scan%' OR lower(ai_summary) LIKE '%traffic%' 
                 OR lower(ai_summary) LIKE '%dns%' OR lower(ai_summary) LIKE '%port%' THEN 'Network'
            WHEN lower(ai_summary) LIKE '%application%' OR lower(ai_summary) LIKE '%web%' 
                 OR lower(ai_summary) LIKE '%sql%' OR lower(ai_summary) LIKE '%injection%' THEN 'Application'
            WHEN lower(ai_summary) LIKE '%user%' OR lower(ai_summary) LIKE '%login%' 
                 OR lower(ai_summary) LIKE '%auth%' OR lower(ai_summary) LIKE '%access%' 
                 OR lower(ai_summary) LIKE '%credential%' THEN 'User'
            WHEN lower(ai_summary) LIKE '%system%' OR lower(ai_summary) LIKE '%backdoor%' 
                 OR lower(ai_summary) LIKE '%malware%' OR lower(ai_summary) LIKE '%execution%' 
                 OR lower(ai_summary) LIKE '%command%' THEN 'System'
            ELSE 'Other'
          END as category,
          count() as threats,
          countIf(ai_priority = 'low') as mitigated
        FROM ai_analysis
        WHERE ai_summary != ''
        GROUP BY category
      `,
      format: 'JSONEachRow'
    });
    const categoryData = await categoryQuery.json();

    // Get threat type distribution based on summaries and patterns
    const threatTypeQuery = await client.query({
      query: `
        SELECT 
          CASE
            WHEN lower(ai_summary) LIKE '%malware%' OR lower(ai_summary) LIKE '%virus%' THEN 'Malware'
            WHEN lower(ai_summary) LIKE '%phishing%' OR lower(ai_summary) LIKE '%social%' THEN 'Phishing'
            WHEN lower(ai_summary) LIKE '%ddos%' OR lower(ai_summary) LIKE '%denial%' THEN 'DDoS'
            WHEN lower(ai_summary) LIKE '%breach%' OR lower(ai_summary) LIKE '%leak%' 
                 OR lower(ai_summary) LIKE '%exfiltration%' THEN 'Data Breach'
            WHEN lower(ai_summary) LIKE '%backdoor%' OR lower(ai_summary) LIKE '%trojan%' 
                 OR lower(ai_summary) LIKE '%xz%' THEN 'Backdoor'
            WHEN lower(ai_summary) LIKE '%injection%' OR lower(ai_summary) LIKE '%sql%' THEN 'Injection Attack'
            WHEN lower(ai_summary) LIKE '%scan%' OR lower(ai_summary) LIKE '%probe%' 
                 OR lower(ai_summary) LIKE '%reconnaissance%' THEN 'Network Scan'
            WHEN lower(ai_summary) LIKE '%bot%' OR lower(ai_summary) LIKE '%c2%' 
                 OR lower(ai_summary) LIKE '%command and control%' THEN 'Botnet'
            ELSE 'Other'
          END as threat_type,
          count() as count
        FROM ai_analysis
        WHERE ai_summary != ''
        GROUP BY threat_type
        ORDER BY count DESC
      `,
      format: 'JSONEachRow'
    });
    const threatTypeData = await threatTypeQuery.json();

    console.log('AI insights fetched:', {
      totalAnalyses: analyses.length,
      priorities: priorityDist.length,
      likelihoods: likelihoodDist.length,
      categories: categoryData.length,
      threatTypes: threatTypeData.length
    });

    res.json({
      analyses,
      priorityDistribution: priorityDist,
      likelihoodDistribution: likelihoodDist,
      categoryData,
      threatTypeData
    });
  } catch (err) {
    console.error('Error in /api/ai-insights:', err);
    res.json({
      analyses: [],
      priorityDistribution: [],
      likelihoodDistribution: [],
      categoryData: [],
      threatTypeData: []
    });
  }
});

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log('WebSocket server ready');
});