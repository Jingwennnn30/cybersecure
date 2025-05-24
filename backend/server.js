const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 4000;

// Store alerts in memory (for demo; use a DB for production)
let liveAlerts = [];

app.use(cors());
app.use(express.json());

// n8n webhook POSTs here
app.post('/webhook/alerts', (req, res) => {
  const alert = req.body;
  if (alert && alert.short_description) {
    liveAlerts.unshift(alert); // Add new alert to the front
    // Optionally limit to last N alerts
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

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});


