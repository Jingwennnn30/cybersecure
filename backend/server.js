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

// ClickHouse integration (COMMENTED OUT - Trial expired)
/*
const clickhouse = createClient({
  url: 'https://nzpk59gkll.ap-southeast-1.aws.clickhouse.cloud:8443',
  username: 'default',
  password: 'y3sRz4g.V_Nkg',
  database: 'default',
});
*/

app.get('/api/alerts', async (req, res) => {
  // COMMENTED OUT - ClickHouse trial expired
  // Return mock data instead
  try {
    const mockAlerts = [
      {
        name: "Sample Alert 1",
        ip: "192.168.1.100",
        port: "8080",
        severity: "high",
        risk_score: "75",
        timestamp: "2025-06-11T18:39:59Z",
        reason: "Suspicious activity detected",
        threat_category: "malware",
        sub_type: "trojan",
        hostname: "server-01",
        region_name: "US-East",
        country_name: "United States"
      },
      {
        name: "Sample Alert 2",
        ip: "10.0.0.50",
        port: "443",
        severity: "medium",
        risk_score: "45",
        timestamp: "2025-06-11T17:25:30Z",
        reason: "Unauthorized access attempt",
        threat_category: "intrusion",
        sub_type: "brute_force",
        hostname: "web-server",
        region_name: "Europe",
        country_name: "Germany"
      }
    ];
    res.json(mockAlerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard real time status
app.get('/api/dashboard-stats', async (req, res) => {
  try {
    // COMMENTED OUT - ClickHouse trial expired
    // Return mock data instead
    
    // Mock data for dashboard stats
    const alertsToday = 25;
    const criticalAlerts = 3;
    const aiProcessed = 95;
    const aiAnalyzed = alertsToday;
    const systemHealth = criticalAlerts < 5 ? "Good" : "Warning";
    const alertsChange = 12; // Mock 12% increase from yesterday

    // Mock alert trends (last 3 hours)
    const now = new Date();
    const alertTrendsFilled = [
      {
        date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours() - 2).padStart(2, '0')}:00:00`,
        alerts: 8
      },
      {
        date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours() - 1).padStart(2, '0')}:00:00`,
        alerts: 12
      },
      {
        date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:00:00`,
        alerts: 5
      }
    ];

    // Mock severity distribution
    const severityDist = [
      { name: "Critical", value: 3 },
      { name: "High", value: 8 },
      { name: "Medium", value: 12 },
      { name: "Low", value: 2 }
    ];

    console.log("Mock alertTrendsFilled:", alertTrendsFilled);
    console.log("Mock severityDist:", severityDist);
    
    res.json({
      alertsToday: alertsToday || 0,
      criticalAlerts: criticalAlerts || 0,
      aiProcessed,
      aiAnalyzed: aiAnalyzed || 0,
      systemHealth,
      alertsChange: alertsChange || 0,
      alertTrends: alertTrendsFilled,
      severityDist: severityDist,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});