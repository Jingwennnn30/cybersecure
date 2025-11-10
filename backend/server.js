// Load environment variables
require('dotenv').config();

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
  host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
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

// Initialize Chatbot Service with MCP
const ChatbotService = require('./services/chatbotService');
const chatbotService = new ChatbotService(client);
console.log('✓ Chatbot Service initialized with MCP protocol');

// Import and use chatbot routes
const chatbotRouter = require('./routes/chatbot')(chatbotService);
app.use('/api', chatbotRouter);

// Simple request logger to help debug routing issues (method + path)
app.use((req, res, next) => {
  try {
    const ts = new Date().toISOString();
    console.log(`${ts} ${req.method} ${req.originalUrl}`);
  } catch {}
  next();
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
        FROM alerts 
        WHERE toDate(toTimeZone(timestamp, 'Asia/Kuala_Lumpur')) = toDate(now('Asia/Kuala_Lumpur'))
      `
    });
    const alertsToday = await alertsTodayQuery.json();
    console.log('Today alerts:', alertsToday);

    // Get critical alerts count (high OR critical severity)
    const criticalAlertsQuery = await client.query({
      query: `
        SELECT COUNT(*) as count 
        FROM alerts 
        WHERE lower(severity) IN ('high', 'critical')
      `
    });
    const criticalAlerts = await criticalAlertsQuery.json();
    console.log('Critical alerts:', criticalAlerts);

    // Get yesterday's alerts for change calculation
    const yesterdayAlertsQuery = await client.query({
      query: `
        SELECT COUNT(*) as count 
        FROM alerts 
        WHERE toDate(toTimeZone(timestamp, 'Asia/Kuala_Lumpur')) = toDate(now('Asia/Kuala_Lumpur')) - 1
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
          toStartOfMonth(toTimeZone(timestamp, 'Asia/Kuala_Lumpur')) as month,
          count() as Alerts
        FROM alerts
        WHERE toTimeZone(timestamp, 'Asia/Kuala_Lumpur') >= toStartOfMonth(now('Asia/Kuala_Lumpur')) - INTERVAL 1 MONTH
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
        FROM alerts
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
          ip,
          port,
          severity,
          risk_score,
          reason,
          timestamp,
          name
        FROM alerts 
        ORDER BY timestamp DESC
      `,
      format: 'JSONEachRow'
    });

    console.log('Query executed, parsing JSON...');
    const data = await result.json();
    console.log('Received data count:', data.length);
    if (data.length > 0) {
      console.log('Sample row:', data[0]);
    }

    res.json(data);
  } catch (err) {
    console.error('Error in /api/alerts:', err);
    console.error('Error details:', err.message, err.stack);
    // Return empty array instead of error object to prevent frontend crashes
    console.warn('Returning empty array due to database connection error');
    res.json([]);
  }
});

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log('WebSocket server ready');
});