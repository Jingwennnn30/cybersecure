const express = require('express');
const { createClient } = require('@clickhouse/client');
const cors = require('cors');
const app = express();
const https = require('https');
app.use(cors());
const PORT = 4000;

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

// Test ClickHouse connection and log table info
async function testClickHouseConnection() {
  try {
    console.log('Testing ClickHouse connection...');
    
    // Test basic connectivity
    const testResult = await clickhouse.query({
      query: 'SELECT 1',
      format: 'JSONEachRow'
    });
    console.log('Basic connectivity test:', testResult);

    // List available tables
    const tables = await clickhouse.query({
      query: 'SHOW TABLES',
      format: 'JSONEachRow'
    });
    console.log('Available tables:', tables);

    // Sample data from alerts table
    const sample = await clickhouse.query({
      query: 'SELECT * FROM alerts LIMIT 2',
      format: 'JSONEachRow'
    });
    console.log('Sample alerts data:', sample);

    return true;
  } catch (error) {
    console.error('ClickHouse connection error:', error);
    return false;
  }
}

// Test connection on startup
testClickHouseConnection();

app.get('/api/dashboard-stats', async (req, res) => {
  try {
    console.log('Fetching dashboard stats from ClickHouse...');
    console.log('Connecting to ClickHouse with client config:', {
      url: clickhouse.config.url,
      database: clickhouse.config.database,
      username: clickhouse.config.username
    });

    // Test the alerts table existence
    const tableTest = await clickhouse.query({
      query: 'SELECT count() FROM alerts LIMIT 1',
      format: 'JSONEachRow'
    });
    console.log('Table test result:', tableTest);
    
    // Get alerts from today and total alerts
    const alertsStatsResult = await clickhouse.query({
      query: `
        SELECT 
          count() as totalCount,
          countIf(toDate(timestamp) = toDate(now())) as todayCount,
          countIf(severity = 'high' OR toInt32(risk_score) >= 70) as criticalCount
        FROM alerts
      `,
      format: 'JSONEachRow'
    });



    // Get alerts trend for last 6 months
    const alertTrendsResult = await clickhouse.query({
      query: `
        SELECT 
          formatDateTime(month, '%Y-%m-%d') as date,
          count() as Alerts
        FROM (
          SELECT 
            toStartOfMonth(timestamp) as month
          FROM alerts
          WHERE timestamp >= subtractMonths(now(), 6)
          GROUP BY month
          ORDER BY month ASC
        )
      `,
      format: 'JSONEachRow'
    });

    // Get severity distribution
    const severityDistResult = await clickhouse.query({
      query: `
        SELECT 
          if(severity = '', 'unknown', severity) as severity,
          count() as count
        FROM alerts 
        WHERE timestamp >= subtractDays(now(), 30)
        GROUP BY severity
        ORDER BY count DESC
      `,
      format: 'JSONEachRow'
    });

    // Process results
    const stats = {
      alertsToday: 0,
      criticalAlerts: 0,
      aiProcessed: 0,
      aiAnalyzed: 0,
      systemHealth: "Unknown",
      alertsChange: 0,
      alertTrends: [],
      severityDist: []
    };

    // Process alerts stats
    const alertsStatsData = [];
    for await (const row of alertsStatsResult.stream()) {
      alertsStatsData.push(row);
      console.log('Alert stats row:', row);
    }
    
    console.log('Alert stats data:', alertsStatsData);
    
    if (alertsStatsData.length > 0) {
      const { totalCount, todayCount, criticalCount } = alertsStatsData[0];
      stats.alertsToday = parseInt(todayCount || '0');
      stats.criticalAlerts = parseInt(criticalCount || '0');
      stats.aiProcessed = Math.min(100, Math.round((parseInt(totalCount) / 100) * 100));
      stats.aiAnalyzed = parseInt(todayCount);
      stats.systemHealth = parseInt(criticalCount) > 5 ? "Warning" : "Good";
      
      console.log('Processed stats:', {
        alertsToday: stats.alertsToday,
        criticalAlerts: stats.criticalAlerts,
        aiProcessed: stats.aiProcessed,
        aiAnalyzed: stats.aiAnalyzed,
        systemHealth: stats.systemHealth
      });
    }

    // Process alert trends
    const trendData = [];
    for await (const row of alertTrendsResult.stream()) {
      trendData.push(row);
      console.log('Trend row:', row);
    }
    
    console.log('Trend data:', trendData);
    
    stats.alertTrends = trendData.map(data => {
      const item = {
        date: data.date,
        Alerts: parseInt(data.Alerts || '0')
      };
      console.log('Trend item:', item);
      return item;
    });

    // Process severity distribution
    const severityData = [];
    for await (const row of severityDistResult.stream()) {
      severityData.push(row);
      console.log('Severity row:', row);
    }
    
    console.log('Severity data:', severityData);
    
    stats.severityDist = severityData.map(data => {
      const item = {
        name: data.severity || 'unknown',
        value: parseInt(data.count || '0')
      };
      console.log('Severity item:', item);
      return item;
    });

    // Calculate alerts change (compared to yesterday)
    const yesterdayData = [];
    const yesterdayResult = await clickhouse.query({
      query: `
        SELECT COUNT(*) as count
        FROM alerts 
        WHERE toDate(timestamp) = yesterday()
      `,
      format: 'JSONEachRow'
    });

    for await (const row of yesterdayResult.stream()) {
      yesterdayData.push(row);
    }

    if (yesterdayData.length > 0) {
      const yesterdayCount = parseInt(yesterdayData[0].count || '0');
      if (yesterdayCount > 0) {
        stats.alertsChange = ((stats.alertsToday - yesterdayCount) / yesterdayCount) * 100;
      }
    }

    res.json(stats);
  } catch (err) {
    console.error('Error in /api/dashboard-stats:', err);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      stack: err.stack
    });
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message,
      details: err.stack 
    });
  }
});

app.get('/api/alerts', async (req, res) => {
  try {
    console.log('Fetching alerts from ClickHouse...');
    const result = await clickhouse.query({
      query: `
        SELECT 
          ip,
          toString(port) as port,
          severity,
          toString(risk_score) as risk_score,
          reason,
          timestamp,
          name
        FROM alerts 
        ORDER BY timestamp DESC
      `,
      format: 'JSONEachRow'
    });

    console.log('Query executed, getting stream...');
    const stream = result.stream();
    const data = [];
    
    console.log('Processing stream...');
    try {
      for await (const rows of stream) {
        // Handle both array of rows and single rows
        const rowsArray = Array.isArray(rows) ? rows : [rows];
        for (const row of rowsArray) {
          // Parse text if it's a string
          const rowData = typeof row.text === 'string' ? JSON.parse(row.text) : row;
          data.push(rowData);
        }
      }
      console.log('Stream processing complete. Total items:', data.length);
    } catch (streamErr) {
      console.error('Stream processing error:', streamErr);
      throw streamErr;
    }

    if (data.length === 0) {
      console.warn('Warning: No data retrieved from stream');
    }

    console.log('Sending response with data length:', data.length);
    res.json(data);
  } catch (err) {
    console.error('Error in /api/alerts:', err);
    res.status(500).json({ 
      error: err.message,
      details: 'Error occurred while fetching alerts',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});



app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});