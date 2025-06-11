const express = require('express');
const { createClient } = require('@clickhouse/client');
const cors = require('cors');
const app = express();
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

// ClickHouse integration
const clickhouse = createClient({
  url: 'https://nzpk59gkll.ap-southeast-1.aws.clickhouse.cloud:8443',
  username: 'default',
  password: 'y3sRz4g.V_Nkg',
  database: 'default',
});

app.get('/api/alerts', async (req, res) => {
  try {
    const result = await clickhouse.query({
      query: 'SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 100',
      format: 'JSONEachRow',
    });
    const rows = [];
    for await (const batch of result.stream()) {
      for (const row of batch) {
        if (row.text) {
          const alert = JSON.parse(row.text);
          rows.push({
            name: alert.alert_name || alert.name || '',
            ip: alert.ip || '',
            port: alert.port || '',
            severity: alert.severity || '',
            risk_score: alert.risk_score || '',
            timestamp: alert.timestamp || '',
            reason: alert.reason || '',
            threat_category: alert.threat_category || '',
            sub_type: alert.sub_type || '',
            hostname: alert.hostname || '',
            region_name: alert.region_name || '',
            country_name: alert.country_name || ''
          });
        }
      }
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard real time status
app.get('/api/dashboard-stats', async (req, res) => {
  try {
    // Alerts Today
    const alertsTodayResult = await clickhouse.query({
      query: `SELECT count() as count FROM alerts WHERE toDate(timestamp, 'UTC') = toDate(now(), 'UTC')`,
      format: 'JSONEachRow',
    });
    let alertsToday = 0;
    for await (const batch of alertsTodayResult.stream()) {
      for (const row of batch) {
        const data = JSON.parse(row.text);
        if (data.count !== undefined) {
          alertsToday = parseInt(data.count, 10);
        }
      }
    }

    // Critical Alerts
    const criticalAlertsResult = await clickhouse.query({
      query: `SELECT count() as count FROM alerts WHERE severity = 'critical' AND toDate(timestamp, 'UTC') = toDate(now(), 'UTC')`,
      format: 'JSONEachRow',
    });
    let criticalAlerts = 0;
    for await (const batch of criticalAlertsResult.stream()) {
      for (const row of batch) {
        const data = JSON.parse(row.text);
        if (data.count !== undefined) {
          criticalAlerts = parseInt(data.count, 10);
        }
      }
    }

    // AI Processed (example: percentage of alerts processed by AI)
    const aiProcessed = 95; // Placeholder
    const aiAnalyzed = alertsToday; // Placeholder

    // System Health (example: set to "Good" if less than 5 critical alerts today)
    const systemHealth = criticalAlerts < 5 ? "Good" : "Warning";

    // Alerts Change (example: percent change from yesterday)
    const alertsYesterdayResult = await clickhouse.query({
      query: `SELECT count() as count FROM alerts WHERE toDate(timestamp, 'UTC') = toDate(addDays(now(), -1), 'UTC')`,
      format: 'JSONEachRow',
    });
    let alertsYesterday = 0;
    for await (const batch of alertsYesterdayResult.stream()) {
      for (const row of batch) {
        const data = JSON.parse(row.text);
        if (data.count !== undefined) {
          alertsYesterday = parseInt(data.count, 10);
        }
      }
    }
    const alertsChange = alertsYesterday === 0 ? 0 : Math.round(((alertsToday - alertsYesterday) / alertsYesterday) * 100);

    // Alert Trends (last 3 hours, hourly)
    const alertTrendsResult = await clickhouse.query({
      query: `
    SELECT
      formatDateTime(timestamp, '%Y-%m-%d %H:00:00', 'UTC') as hour,
      count() as alerts
    FROM alerts
    WHERE timestamp >= subtractHours(now('UTC'), 2)
    GROUP BY hour
    ORDER BY hour ASC
  `,
      format: 'JSONEachRow',
    });
    const alertTrends = [];
    for await (const batch of alertTrendsResult.stream()) {
      for (const row of batch) {
        // Parse the JSON string in row.text
        const data = JSON.parse(row.text);
        alertTrends.push({
          date: data.hour,
          alerts: parseInt(data.alerts, 10)
        });
      }
    }
    const hours = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date();
      d.setUTCHours(d.getUTCHours() - i, 0, 0, 0);
      const hourStr = d.getUTCFullYear() + '-' +
        String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
        String(d.getUTCDate()).padStart(2, '0') + ' ' +
        String(d.getUTCHours()).padStart(2, '0') + ':00:00';
      hours.push(hourStr);
    }
    const trendsMap = Object.fromEntries(alertTrends.map(a => [a.date, a.alerts]));
    const alertTrendsFilled = hours.map(hour => ({
      date: hour,
      alerts: trendsMap[hour] || 0
    }));

    // Severity Distribution (current)
    const severityDistResult = await clickhouse.query({
      query: `
        SELECT severity as name, count() as value
        FROM alerts
        WHERE toDate(timestamp, 'UTC') = toDate(now(), 'UTC')
        GROUP BY severity
      `,
      format: 'JSONEachRow',
    });

    const severityDist = [];
    for await (const batch of severityDistResult.stream()) {
      for (const row of batch) {
        if (row.text) {
          const data = JSON.parse(row.text);
          severityDist.push({
            name: data.name.charAt(0).toUpperCase() + data.name.slice(1), // Capitalize for display
            value: parseInt(data.value, 10)
          });
        }
      }
    }

    // Debug logs
    console.log("Raw severityDist from ClickHouse:", severityDist);
    console.log("alertTrendsFilled", alertTrendsFilled);
    res.json({
      alertsToday: alertsToday || 0,
      criticalAlerts: criticalAlerts || 0,
      aiProcessed,
      aiAnalyzed: aiAnalyzed || 0,
      systemHealth,
      alertsChange: alertsChange || 0,
      alertTrends: alertTrendsFilled,
      severityDist: Array.isArray(severityDist) && severityDist.length > 0 ? severityDist : [],
    });
    console.log("Sent severityDist to frontend:", severityDist);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});