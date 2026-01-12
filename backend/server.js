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
    
    // n8n webhook URL for email workflow - Production URL
    const webhookUrl = 'https://webhook.csnet.my/webhook/email-report';
    
    console.log('Triggering n8n email workflow with report data');
    console.log('Report data keys:', Object.keys(report || {}));
    console.log('Period:', period);
    
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
app.get('/api/get-notification-recipients', async (req, res) => {
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
    const { userId, userRole } = req.query;
    console.log('Fetching alerts from ClickHouse for user:', userId, 'role:', userRole);
    
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
        WHERE event_time > now() - INTERVAL 7 DAY
        ORDER BY event_time DESC
        LIMIT 5000
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

    // If admin, return all alerts
    if (userRole === 'admin') {
      // Fetch assignments from Firestore for all alerts
      const assignmentsSnapshot = await db.collection('alertAssignments').get();
      const assignmentsMap = {};
      assignmentsSnapshot.forEach(doc => {
        assignmentsMap[doc.data().alertId] = doc.data();
      });

      const alertsWithAssignments = enrichedData.map(alert => ({
        ...alert,
        assignment: assignmentsMap[alert.correlation_key] || null
      }));

      return res.json(alertsWithAssignments);
    }

    // For Analyst I and Analyst II, only return assigned alerts
    if (userRole === 'analyst_i' || userRole === 'analyst_ii') {
      console.log('Filtering alerts for analyst. UserId:', userId, 'Role:', userRole);
      
      // For Analyst II, query escalated alerts directly from ClickHouse
      if (userRole === 'analyst_ii') {
        console.log('Fetching escalated alerts for Analyst II. Current User ID:', userId);
        
        // First, let's see ALL escalated alerts to debug
        const allEscalatedSnapshot = await db.collection('investigation_statuses')
          .where('escalated', '==', true)
          .get();
        
        console.log('DEBUG: Total escalated alerts in Firestore:', allEscalatedSnapshot.size);
        allEscalatedSnapshot.forEach(doc => {
          const data = doc.data();
          console.log('DEBUG: Escalated alert:', doc.id, 'assignedToUID:', data.assignedToUID, 'assignedToName:', data.assignedToName);
        });
        
        const escalatedSnapshot = await db.collection('investigation_statuses')
          .where('escalated', '==', true)
          .where('assignedToUID', '==', userId)
          .get();
        
        console.log('Found escalated investigation statuses for current user:', escalatedSnapshot.size);
        
        if (escalatedSnapshot.size === 0) {
          console.log('No escalated alerts found for user:', userId);
          return res.json([]);
        }
        
        // Extract correlation_key and timestamp from uniqueIds
        const escalatedConditions = [];
        const escalationMap = new Map();
        const escalatedUniqueIds = new Set(); // Store exact uniqueIds
        
        escalatedSnapshot.forEach(doc => {
          const uniqueId = doc.id;
          const docData = doc.data();
          console.log('DEBUG: Processing escalated doc:', {
            uniqueId,
            assignedToName: docData.assignedToName,
            escalatedAt: docData.escalatedAt
          });
          
          // Parse uniqueId format: correlation_key-YYYY-MM-DD HH:MM:SS-index
          // Use regex to extract correlation_key and timestamp
          const match = uniqueId.match(/^(.+)-(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})-\d+$/);
          
          if (match) {
            const correlationKey = match[1];
            const timestamp = match[2];
            
            console.log('Parsing escalated uniqueId:', uniqueId);
            console.log('  -> correlation_key:', correlationKey);
            console.log('  -> timestamp:', timestamp);
            
            escalatedConditions.push({ correlationKey, timestamp });
            escalatedUniqueIds.add(uniqueId); // Store exact uniqueId
            escalationMap.set(uniqueId, {
              escalated: true,
              escalatedFrom: doc.data().escalatedBy,
              escalatedAt: doc.data().escalatedAt,
              escalationReason: doc.data().escalationReason
            });
          } else {
            console.error('Failed to parse uniqueId:', uniqueId);
          }
        });
        
        // Query ClickHouse for specific escalated alerts
        const whereConditions = escalatedConditions.map(c => 
          `(correlation_key = '${c.correlationKey.replace(/'/g, "\\'")}' AND event_time = '${c.timestamp}')`
        ).join(' OR ');
        
        console.log('Querying ClickHouse with conditions:', whereConditions.substring(0, 200));
        
        const escalatedResult = await client.query({
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
            WHERE ${whereConditions}
            ORDER BY event_time DESC
          `,
          format: 'JSONEachRow'
        });
        
        const escalatedData = await escalatedResult.json();
        console.log('Found escalated alerts in ClickHouse:', escalatedData.length);
        
        if (escalatedData.length === 0) {
          console.warn('⚠️ No alerts found in ClickHouse for escalated conditions!');
          console.warn('This could mean:');
          console.warn('1. Alerts are older than ClickHouse retention period');
          console.warn('2. Timestamp format mismatch between Firestore and ClickHouse');
          console.warn('3. correlation_key contains special characters that need escaping');
        }
        
        // Group by correlation_key + timestamp to match with uniqueIds
        const groupedAlerts = {};
        escalatedData.forEach(alert => {
          const key = `${alert.correlation_key}-${alert.timestamp}`;
          if (!groupedAlerts[key]) {
            groupedAlerts[key] = [];
          }
          groupedAlerts[key].push(alert);
        });
        
        // Only return alerts that match escalated uniqueIds
        const escalatedAlerts = [];
        const notFoundIds = [];
        
        for (const uniqueId of escalatedUniqueIds) {
          // Extract index from uniqueId
          const indexMatch = uniqueId.match(/-(\d+)$/);
          if (!indexMatch) continue;
          
          const index = parseInt(indexMatch[1]);
          const baseKey = uniqueId.substring(0, uniqueId.lastIndexOf('-'));
          
          let alert = null;
          
          // Try to get the exact index
          if (groupedAlerts[baseKey] && groupedAlerts[baseKey][index]) {
            alert = groupedAlerts[baseKey][index];
            console.log('✓ Matched escalated alert uniqueId:', uniqueId);
          } 
          // If exact index not found, use first available alert with same correlation_key + timestamp
          else if (groupedAlerts[baseKey] && groupedAlerts[baseKey].length > 0) {
            alert = groupedAlerts[baseKey][0];
            console.warn(`⚠️ Index ${index} not found for ${baseKey}, using first available alert (index 0)`);
          }
          else {
            console.error(`❌ No alerts found in ClickHouse for escalated uniqueId:`, uniqueId);
            notFoundIds.push(uniqueId);
            continue;
          }
          
          if (alert) {
            let parsedPayload = {};
            try {
              if (alert.payload) {
                parsedPayload = typeof alert.payload === 'string' ? JSON.parse(alert.payload) : alert.payload;
              }
            } catch (e) {
              console.error('Error parsing payload for alert:', alert.correlation_key, e);
            }
            
            escalatedAlerts.push({
              ...alert,
              parsedPayload,
              assignment: escalationMap.get(uniqueId),
              _actualIndex: index,  // Include the actual index from uniqueId
              _uniqueId: uniqueId   // Include the full uniqueId
            });
          }
        }
        
        if (notFoundIds.length > 0) {
          console.warn(`⚠️ ${notFoundIds.length} escalated alerts not found in ClickHouse:`, notFoundIds);
        }
        
        console.log('Returning escalated alerts count:', escalatedAlerts.length);
        return res.json(escalatedAlerts);
      }
      
      // For Analyst I, use regular assignment filtering
      const assignmentsSnapshot = await db.collection('alertAssignments')
        .where('assignedTo', '==', userId)
        .get();
      
      console.log('Found assignments:', assignmentsSnapshot.size);
      
      const assignedAlertIds = new Set();
      const assignmentsMap = {};
      assignmentsSnapshot.forEach(doc => {
        const data = doc.data();
        assignedAlertIds.add(data.alertId);
        assignmentsMap[data.alertId] = data;
      });

      const filteredAlerts = enrichedData
        .filter(alert => assignedAlertIds.has(alert.correlation_key))
        .map(alert => ({
          ...alert,
          assignment: assignmentsMap[alert.correlation_key]
        }));

      console.log('Returning filtered alerts count:', filteredAlerts.length);
      return res.json(filteredAlerts);
    }

    // For other roles (viewer, etc.), return all alerts without assignment info
    res.json(enrichedData);
  } catch (err) {
    console.error('Error in /api/alerts:', err);
    console.error('Error details:', err.message, err.stack);
    // Return empty array instead of error object to prevent frontend crashes
    console.warn('Returning empty array due to database connection error');
    res.json([]);
  }
});

// Endpoint: Assign alerts to analysts
app.post('/api/alerts/assign', async (req, res) => {
  try {
    const { alertIds, userId, userName, userRole } = req.body;
    
    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({ error: 'Invalid alertIds' });
    }
    
    const batch = db.batch();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    for (const alertId of alertIds) {
      const assignmentRef = db.collection('alertAssignments').doc();
      batch.set(assignmentRef, {
        alertId,
        assignedTo: userId,
        assignedToName: userName,
        assignedToRole: userRole,
        assignedAt: timestamp,
        status: 'assigned'
      });
    }
    
    await batch.commit();
    res.json({ success: true, count: alertIds.length });
  } catch (err) {
    console.error('Error assigning alerts:', err);
    res.status(500).json({ error: 'Failed to assign alerts' });
  }
});

// Endpoint: Auto-assign alerts for initial setup
app.post('/api/alerts/auto-assign-initial', async (req, res) => {
  try {
    console.log('Starting initial auto-assignment...');
    
    // Fetch all alerts from ClickHouse
    const result = await client.query({
      query: `
        SELECT 
          correlation_key,
          severity
        FROM alert_enriched_events 
        WHERE event_time > '1970-01-01 00:00:01'
        ORDER BY event_time DESC
        LIMIT 1500
      `,
      format: 'JSONEachRow'
    });
    
    const alerts = await result.json();
    console.log('Total alerts fetched:', alerts.length);
    
    // Fetch all analysts from Firebase
    const usersSnapshot = await db.collection('users').get();
    const analystI = [];
    const analystII = [];
    
    usersSnapshot.forEach(doc => {
      const userData = { id: doc.id, ...doc.data() };
      if (userData.role === 'analyst_i') analystI.push(userData);
      if (userData.role === 'analyst_ii') analystII.push(userData);
    });
    
    console.log('Analyst I count:', analystI.length);
    console.log('Analyst II count:', analystII.length);
    
    if (analystI.length === 0 && analystII.length === 0) {
      return res.json({ 
        success: false, 
        message: 'No analysts found. Please create analyst accounts first.' 
      });
    }
    
    // Check existing assignments
    const existingAssignments = await db.collection('alertAssignments').get();
    const assignedAlertIds = new Set();
    existingAssignments.forEach(doc => {
      assignedAlertIds.add(doc.data().alertId);
    });
    
    // Filter out already assigned alerts
    const unassignedAlerts = alerts.filter(alert => !assignedAlertIds.has(alert.correlation_key));
    console.log('Unassigned alerts:', unassignedAlerts.length);
    
    // Categorize alerts by severity
    const mediumLowAlerts = unassignedAlerts.filter(a => 
      a.severity === 'medium' || a.severity === 'low'
    );
    const highCriticalAlerts = unassignedAlerts.filter(a => 
      a.severity === 'high' || a.severity === 'critical'
    );
    
    // Helper function to randomly select alerts with diverse timestamps
    const selectDiverseAlerts = (alertsArray, count) => {
      const selected = [];
      const arrayClone = [...alertsArray];
      
      // Calculate step size to spread across the array
      const stepSize = Math.max(3, Math.floor(arrayClone.length / count));
      
      for (let i = 0; i < count && arrayClone.length > 0; i++) {
        // Pick from different sections of the array
        const sectionStart = i * stepSize;
        const sectionEnd = Math.min(sectionStart + stepSize * 2, arrayClone.length);
        const sectionSize = sectionEnd - sectionStart;
        
        if (sectionSize > 0) {
          const randomIndex = sectionStart + Math.floor(Math.random() * sectionSize);
          const validIndex = Math.min(randomIndex, arrayClone.length - 1);
          selected.push(arrayClone[validIndex]);
          arrayClone.splice(validIndex, 1);
        }
      }
      
      return selected;
    };
    
    const batch = db.batch();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    let assignmentCount = 0;
    
    // Assign 4-9 medium/low alerts to each Analyst I
    if (analystI.length > 0) {
      for (const analyst of analystI) {
        const alertsToAssign = Math.floor(Math.random() * 6) + 4; // 4-9 alerts
        const selectedAlerts = selectDiverseAlerts(mediumLowAlerts, Math.min(alertsToAssign, mediumLowAlerts.length));
        
        // Remove selected alerts from the pool
        selectedAlerts.forEach(selected => {
          const index = mediumLowAlerts.findIndex(a => a.correlation_key === selected.correlation_key);
          if (index > -1) mediumLowAlerts.splice(index, 1);
        });
        
        for (const alert of selectedAlerts) {
          const assignmentRef = db.collection('alertAssignments').doc();
          batch.set(assignmentRef, {
            alertId: alert.correlation_key,
            assignedTo: analyst.id,
            assignedToName: analyst.name,
            assignedToRole: 'analyst_i',
            assignedAt: timestamp,
            status: 'assigned',
            severity: alert.severity
          });
          assignmentCount++;
        }
      }
    }
    
    // Assign 4-9 high/critical alerts to each Analyst II
    if (analystII.length > 0) {
      for (const analyst of analystII) {
        const alertsToAssign = Math.floor(Math.random() * 6) + 4; // 4-9 alerts
        const selectedAlerts = selectDiverseAlerts(highCriticalAlerts, Math.min(alertsToAssign, highCriticalAlerts.length));
        
        // Remove selected alerts from the pool
        selectedAlerts.forEach(selected => {
          const index = highCriticalAlerts.findIndex(a => a.correlation_key === selected.correlation_key);
          if (index > -1) highCriticalAlerts.splice(index, 1);
        });
        
        for (const alert of selectedAlerts) {
          const assignmentRef = db.collection('alertAssignments').doc();
          batch.set(assignmentRef, {
            alertId: alert.correlation_key,
            assignedTo: analyst.id,
            assignedToName: analyst.name,
            assignedToRole: 'analyst_ii',
            assignedAt: timestamp,
            status: 'assigned',
            severity: alert.severity
          });
          assignmentCount++;
        }
      }
    }
    
    await batch.commit();
    console.log('Initial assignment completed. Total assignments:', assignmentCount);
    
    res.json({ 
      success: true, 
      assignmentCount,
      analystICount: analystI.length,
      analystIICount: analystII.length
    });
  } catch (err) {
    console.error('Error in auto-assign-initial:', err);
    res.status(500).json({ error: 'Failed to auto-assign alerts' });
  }
});

// Endpoint: Auto-assign new incoming alerts (for future use)
app.post('/api/alerts/auto-assign-new', async (req, res) => {
  try {
    const { alertIds } = req.body; // Array of new alert IDs
    
    if (!alertIds || !Array.isArray(alertIds)) {
      return res.status(400).json({ error: 'Invalid alertIds' });
    }
    
    // Fetch alert details from ClickHouse
    const alertIdsList = alertIds.map(id => `'${id}'`).join(',');
    const result = await client.query({
      query: `
        SELECT 
          correlation_key,
          severity
        FROM alert_enriched_events 
        WHERE correlation_key IN (${alertIdsList})
      `,
      format: 'JSONEachRow'
    });
    
    const alerts = await result.json();
    
    // Fetch analysts
    const usersSnapshot = await db.collection('users').get();
    const analystI = [];
    const analystII = [];
    
    usersSnapshot.forEach(doc => {
      const userData = { id: doc.id, ...doc.data() };
      if (userData.role === 'analyst_i') analystI.push(userData);
      if (userData.role === 'analyst_ii') analystII.push(userData);
    });
    
    if (analystI.length === 0 && analystII.length === 0) {
      return res.json({ success: false, message: 'No analysts available' });
    }
    
    // Categorize alerts
    const mediumLowAlerts = alerts.filter(a => a.severity === 'medium' || a.severity === 'low');
    const highCriticalAlerts = alerts.filter(a => a.severity === 'high' || a.severity === 'critical');
    
    const batch = db.batch();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    let assignmentCount = 0;
    
    // Assign 2-3 medium/low alerts to random Analyst I
    if (analystI.length > 0 && mediumLowAlerts.length > 0) {
      const alertsToAssign = Math.min(Math.floor(Math.random() * 2) + 2, mediumLowAlerts.length); // 2-3 alerts
      const randomAnalyst = analystI[Math.floor(Math.random() * analystI.length)];
      
      for (let i = 0; i < alertsToAssign; i++) {
        const alert = mediumLowAlerts[i];
        const assignmentRef = db.collection('alertAssignments').doc();
        batch.set(assignmentRef, {
          alertId: alert.correlation_key,
          assignedTo: randomAnalyst.id,
          assignedToName: randomAnalyst.name,
          assignedToRole: 'analyst_i',
          assignedAt: timestamp,
          status: 'assigned',
          severity: alert.severity
        });
        assignmentCount++;
      }
    }
    
    // Assign 2-3 high/critical alerts to random Analyst II
    if (analystII.length > 0 && highCriticalAlerts.length > 0) {
      const alertsToAssign = Math.min(Math.floor(Math.random() * 2) + 2, highCriticalAlerts.length); // 2-3 alerts
      const randomAnalyst = analystII[Math.floor(Math.random() * analystII.length)];
      
      for (let i = 0; i < alertsToAssign; i++) {
        const alert = highCriticalAlerts[i];
        const assignmentRef = db.collection('alertAssignments').doc();
        batch.set(assignmentRef, {
          alertId: alert.correlation_key,
          assignedTo: randomAnalyst.id,
          assignedToName: randomAnalyst.name,
          assignedToRole: 'analyst_ii',
          assignedAt: timestamp,
          status: 'assigned',
          severity: alert.severity
        });
        assignmentCount++;
      }
    }
    
    await batch.commit();
    res.json({ success: true, assignmentCount });
  } catch (err) {
    console.error('Error in auto-assign-new:', err);
    res.status(500).json({ error: 'Failed to auto-assign new alerts' });
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

    // Get total category counts for the 3 main alert types
    const categoryQuery = await client.query({
      query: `
        SELECT 
          CASE
            WHEN correlation_key LIKE 'multiple_l%' THEN 'Multiple Logon Failure'
            WHEN correlation_key LIKE 'xz_%' THEN 'XZ Backdoor'
            WHEN correlation_key LIKE 'dns_botnet%' THEN 'DNS Botnet'
          END as category,
          count() as total
        FROM alert_ai_analysis
        WHERE (correlation_key LIKE 'multiple_l%' OR correlation_key LIKE 'xz_%' OR correlation_key LIKE 'dns_botnet%')
          AND correlation_key != ''
          AND correlation_key IS NOT NULL
        GROUP BY category
        ORDER BY total DESC
      `,
      format: 'JSONEachRow'
    });
    const categoryDataArray = await categoryQuery.json();
    
    console.log('Category data:', categoryDataArray);

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
      categoryData: categoryDataArray,
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

// New endpoint: Get categorized AI recommendations by alert category
app.get('/api/ai-recommendations', async (req, res) => {
  try {
    console.log('Fetching categorized AI recommendations from ClickHouse...');
    
    // Define the 3 main categories based on correlation_key patterns
    const categories = {
      'multiple_logon_failure': 'multiple_l%',
      'xz_backdoor_execution': 'xz_%',
      'dns_botnet_c2': 'dns_botnet%'
    };
    
    const categorizedRecommendations = {};
    
    // Fetch recommendations for each of the 3 main categories
    for (const [categoryName, pattern] of Object.entries(categories)) {
      try {
        // Query alert_ai_analysis table, filtering from row 104 onwards (where correlation_key is not empty)
        const query = await client.query({
          query: `
            SELECT 
              correlation_key,
              alert_category,
              MAX(event_time) as latest_event_time,
              MAX(first_seen) as first_seen,
              MAX(last_seen) as last_seen,
              MAX(severity) as severity,
              MAX(priority) as priority,
              MAX(likelihood) as likelihood,
              MAX(summary) as summary,
              MAX(risk_justification) as risk_justification,
              MAX(suggestion) as suggestion,
              MAX(explanation) as explanation,
              MAX(recommended_checks) as recommended_checks,
              COUNT(*) as occurrence_count
            FROM alert_ai_analysis
            WHERE correlation_key LIKE '${pattern}'
              AND correlation_key != ''
              AND correlation_key IS NOT NULL
            GROUP BY correlation_key, alert_category
            ORDER BY latest_event_time DESC
            LIMIT 20
          `,
          format: 'JSONEachRow'
        });
        
        const results = await query.json();
        
        categorizedRecommendations[categoryName] = results.map(item => ({
          correlationKey: item.correlation_key,
          category: item.alert_category,
          latestEventTime: item.latest_event_time,
          firstSeen: item.first_seen,
          lastSeen: item.last_seen,
          severity: item.severity,
          priority: item.priority,
          likelihood: item.likelihood,
          summary: item.summary,
          riskJustification: item.risk_justification,
          suggestion: item.suggestion,
          explanation: item.explanation,
          recommendedChecks: item.recommended_checks,
          occurrenceCount: item.occurrence_count
        }));
        
        console.log(`Fetched ${results.length} recommendations for: ${categoryName}`);
      } catch (categoryError) {
        console.error(`Error fetching ${categoryName}:`, categoryError.message);
        categorizedRecommendations[categoryName] = [];
      }
    }
    
    console.log('Categorized AI recommendations fetched successfully');
    res.json(categorizedRecommendations);
  } catch (err) {
    console.error('Error in /api/ai-recommendations:', err);
    res.status(500).json({
      error: 'Failed to fetch AI recommendations',
      message: err.message
    });
  }
});

// Investigation workflow endpoints

// Endpoint: Trigger investigation (calls n8n workflow)
app.post('/api/alerts/investigate', async (req, res) => {
  try {
    const { alertId, alertData } = req.body;
    
    console.log('Starting investigation for alert:', alertId);
    console.log('Alert data received:', alertData);
    
    // Mark as investigating in Firestore
    await db.collection('investigation_statuses').doc(alertId).set({
      status: 'investigating',
      timestamp: new Date().toISOString(),
      userResponse: null
    });
    
    // Call n8n webhook with proper fallbacks
    const n8nWebhookUrl = 'https://webhook.csnet.my/webhook/investigate-alert';
    
    const payload = {
      incident_id: alertId,
      user_name: alertData.user || alertData.host || 'Unknown User',
      user_email: 'wongyihan2003@gmail.com',
      host: alertData.host || alertData.ip || 'Unknown Host',
      timestamp: alertData.timestamp ? new Date(alertData.timestamp).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' }) : new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' }),
      alert_name: alertData.name || 'Security Alert',
      severity: alertData.severity || 'medium',
      ip: alertData.ip || 'N/A'
    };
    
    console.log('Sending to n8n:', payload);
    
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    const responseData = await response.json();
    console.log('n8n webhook response:', responseData);
    
    if (!response.ok) {
      throw new Error(`n8n webhook returned ${response.status}`);
    }
    
    res.json({ 
      success: true, 
      message: 'Investigation started, email sent to user',
      n8nResponse: responseData
    });
  } catch (error) {
    console.error('Error triggering investigation:', error);
    res.status(500).json({ 
      error: 'Failed to start investigation', 
      message: error.message 
    });
  }
});

// Endpoint: Receive user response from n8n
app.post('/api/alerts/user-response', async (req, res) => {
  try {
    const { incident_id, user_answer, received_at } = req.body;
    
    console.log('Received user response:', { incident_id, user_answer, received_at });
    
    // Get current status from Firestore
    const docRef = db.collection('investigation_statuses').doc(incident_id);
    const doc = await docRef.get();
    
    const currentStatus = doc.exists ? doc.data() : {
      status: 'investigating',
      timestamp: new Date().toISOString()
    };
    
    // Update investigation status in Firestore
    await docRef.set({
      ...currentStatus,
      status: 'responded',
      userResponse: user_answer,
      responseTimestamp: received_at || new Date().toISOString()
    });
    
    console.log('Updated investigation status in Firestore');
    
    res.json({ 
      success: true, 
      message: 'User response recorded'
    });
  } catch (error) {
    console.error('Error recording user response:', error);
    res.status(500).json({ 
      error: 'Failed to record response', 
      message: error.message 
    });
  }
});

// Endpoint: Get investigation status for an alert
app.get('/api/alerts/:alertId/status', async (req, res) => {
  try {
    const { alertId } = req.params;
    
    // Get status from Firestore
    const doc = await db.collection('investigation_statuses').doc(alertId).get();
    
    const status = doc.exists ? doc.data() : {
      status: 'none',
      userResponse: null
    };
    
    res.json(status);
  } catch (error) {
    console.error('Error getting investigation status:', error);
    res.status(500).json({ 
      error: 'Failed to get status', 
      message: error.message 
    });
  }
});

// New endpoint: Get investigation status by uniqueId (for Historical Alerts)
app.get('/api/investigation-status/:uniqueId', async (req, res) => {
  try {
    const uniqueId = decodeURIComponent(req.params.uniqueId);
    
    // Get status from Firestore
    const doc = await db.collection('investigation_statuses').doc(uniqueId).get();
    
    if (!doc.exists) {
      return res.json({ status: 'none', userResponse: null });
    }
    
    res.json(doc.data());
  } catch (error) {
    console.error('Error getting investigation status:', error);
    res.status(500).json({ 
      error: 'Failed to get status', 
      message: error.message 
    });
  }
});

// Endpoint: Get all investigation statuses (batch)
app.get('/api/alerts/statuses/all', async (req, res) => {
  try {
    const { userId, userRole } = req.query;
    
    let snapshot;
    
    // For Analyst II, only return statuses for alerts assigned to them
    if (userRole === 'analyst_ii') {
      console.log('Fetching investigation statuses for Analyst II:', userId);
      snapshot = await db.collection('investigation_statuses')
        .where('escalated', '==', true)
        .where('assignedToUID', '==', userId)
        .get();
    } else {
      // For admin and Analyst I, return all statuses
      snapshot = await db.collection('investigation_statuses').get();
    }
    
    const statuses = {};
    snapshot.forEach(doc => {
      statuses[doc.id] = doc.data();
    });
    
    console.log(`Loaded ${Object.keys(statuses).length} investigation statuses for role: ${userRole}`);
    res.json(statuses);
  } catch (error) {
    console.error('Error getting all investigation statuses:', error);
    res.status(500).json({ 
      error: 'Failed to get statuses', 
      message: error.message 
    });
  }
});

// Endpoint: Get Analyst II users for escalation
app.get('/api/users/analyst-ii', async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').where('role', '==', 'analyst_ii').get();
    
    const analystII = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      analystII.push({
        uid: doc.id,
        name: userData.name || userData.email,
        email: userData.email
      });
    });
    
    console.log(`Found ${analystII.length} Analyst II users`);
    res.json(analystII);
  } catch (error) {
    console.error('Error fetching Analyst II users:', error);
    res.status(500).json({ 
      error: 'Failed to fetch analysts', 
      message: error.message 
    });
  }
});

// Endpoint: Escalate alert to SOC2
app.post('/api/alerts/escalate', async (req, res) => {
  try {
    const { alertId, alertData, reason, escalatedBy, assignedTo } = req.body;
    
    console.log('Escalating alert to Analyst II:', alertId, 'Assigned to:', assignedTo);
    
    // Get current investigation status
    const docRef = db.collection('investigation_statuses').doc(alertId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ 
        error: 'Alert not found in investigation system' 
      });
    }
    
    const currentStatus = doc.data();
    
    // Update with escalation info
    await docRef.update({
      escalated: true,
      escalatedTo: 'analyst_ii',
      assignedToUID: assignedTo.uid,
      assignedToName: assignedTo.name,
      assignedToEmail: assignedTo.email,
      escalatedAt: new Date().toISOString(),
      escalationReason: reason || 'Manual escalation',
      escalatedBy: escalatedBy || 'Unknown'
    });
    
    // Prepare payload for n8n escalation workflow
    const n8nEscalationUrl = 'https://webhook.csnet.my/webhook/escalate-alert';
    
    const payload = {
      incident_id: alertId,
      alert_name: alertData.name || 'Security Alert',
      severity: alertData.severity || 'medium',
      user_name: alertData.user || 'Unknown',
      host: alertData.host || alertData.ip || 'Unknown Host',
      ip: alertData.ip || 'N/A',
      timestamp: alertData.timestamp ? new Date(alertData.timestamp).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' }) : new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' }),
      user_response: currentStatus.userResponse || 'N/A',
      escalation_reason: reason || 'Manual escalation',
      escalated_by: escalatedBy || 'Unknown',
      assigned_to_name: assignedTo.name,
      assigned_to_email: assignedTo.email,
      analyst_email: assignedTo.email // Send to assigned Analyst II
    };
    
    console.log('Sending escalation email to n8n:', payload);
    
    // Call n8n webhook to send email
    const response = await fetch(n8nEscalationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      console.warn('n8n escalation email webhook failed:', response.status);
      // Don't fail the escalation if email fails
    } else {
      console.log('Escalation email sent successfully');
    }
    
    res.json({ 
      success: true, 
      message: 'Alert escalated to Analyst II successfully'
    });
  } catch (error) {
    console.error('Error escalating alert:', error);
    res.status(500).json({ 
      error: 'Failed to escalate alert', 
      message: error.message 
    });
  }
});

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log('WebSocket server ready');
});