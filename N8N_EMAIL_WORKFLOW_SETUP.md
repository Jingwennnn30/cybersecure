# N8N Email Report Workflow Setup Guide

## Overview
This guide will help you set up an n8n workflow to automatically send security reports via email to all system administrators.

## Workflow Structure

```
Webhook → Build Email Content → Send Email (Gmail/SMTP)
```

## Step-by-Step Setup

### 1. Create New Workflow in n8n

1. Log in to your n8n instance
2. Click "+ New Workflow"
3. Name it: "Email Security Report to Admins"

### 2. Add Webhook Node (Trigger)

1. **Add Node** → Search for "Webhook"
2. **Configure Webhook:**
   - **HTTP Method:** POST
   - **Path:** Leave default or set custom (e.g., `email-report`)
   - **Response Mode:** "When Last Node Finishes"
   - **Response Data:** "First Entry JSON"

3. **Get the Webhook URL:**
   - Click on "Production URL" tab
   - Copy the URL (e.g., `https://webhook.csnet.my/webhook/abc123...`)
   - Update this URL in `backend/server.js` line ~133

### 3. Add Code Node (Build Email Content)

1. **Add Node** → Search for "Code"
2. **Configure Code Node:**
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. **Paste this JavaScript code:**

```javascript
// Get report data from webhook
const reportData = $json.report;
const period = $json.period;

// Build professional email HTML
const emailHTML = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #003d82; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .section { margin: 20px 0; padding: 15px; border-left: 4px solid #003d82; background: #f8f9fa; }
        .section-title { font-weight: bold; color: #003d82; margin-bottom: 10px; }
        .metrics { display: flex; gap: 20px; margin: 20px 0; }
        .metric-card { flex: 1; padding: 15px; background: white; border: 1px solid #ddd; border-radius: 5px; text-align: center; }
        .metric-value { font-size: 32px; font-weight: bold; color: #003d82; }
        .metric-label { color: #666; font-size: 14px; }
        .critical { color: #dc2626; }
        .high { color: #ea580c; }
        .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; margin-top: 30px; }
        .button { display: inline-block; padding: 12px 24px; background: #003d82; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        ul { padding-left: 20px; }
        li { margin: 8px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔒 Security Analysis Report</h1>
        <p>Period: ${period.start} to ${period.end}</p>
    </div>
    
    <div class="content">
        <div class="section">
            <div class="section-title">📋 Executive Summary</div>
            <p>${reportData.executive_summary || 'No security incidents detected.'}</p>
        </div>

        <h2 style="color: #003d82; border-bottom: 2px solid #003d82; padding-bottom: 10px;">Security Metrics</h2>
        <div class="metrics">
            <div class="metric-card">
                <div class="metric-value critical">${reportData.severity_breakdown?.critical || 0}</div>
                <div class="metric-label">Critical</div>
            </div>
            <div class="metric-card">
                <div class="metric-value high">${reportData.severity_breakdown?.high || 0}</div>
                <div class="metric-label">High</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${reportData.severity_breakdown?.medium || 0}</div>
                <div class="metric-label">Medium</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${reportData.incident_overview?.total_incidents || 0}</div>
                <div class="metric-label">Total Incidents</div>
            </div>
        </div>

        ${reportData.key_insights && reportData.key_insights.length > 0 ? `
        <div class="section">
            <div class="section-title">💡 Key Insights</div>
            <ul>
                ${reportData.key_insights.map(insight => `<li>${insight}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        ${reportData.notable_incidents && reportData.notable_incidents.length > 0 ? `
        <div class="section">
            <div class="section-title">⚠️ Notable Incidents</div>
            <ul>
                ${reportData.notable_incidents.map(incident => 
                    `<li><strong>${incident.correlation_key}</strong> [${incident.risk_level}]: ${incident.reason}</li>`
                ).join('')}
            </ul>
        </div>
        ` : ''}

        ${reportData.recommendations && reportData.recommendations.length > 0 ? `
        <div class="section">
            <div class="section-title">📌 Recommendations</div>
            <ul>
                ${reportData.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0;">
            <p>For the complete detailed report, please access the CyberSecure Dashboard.</p>
            <a href="http://localhost:3000/reports" class="button">View Full Report</a>
        </div>
    </div>

    <div class="footer">
        <p><strong>CyberSecure Security Platform</strong></p>
        <p>This is an automated security report. Please do not reply to this email.</p>
        <p>Generated: ${new Date($json.timestamp).toLocaleString()}</p>
        <p style="color: #dc2626; font-weight: bold;">⚠️ CONFIDENTIAL - For Authorized Personnel Only</p>
    </div>
</body>
</html>
`;

// Build email subject
const subject = `🔒 Security Report: ${period.start} to ${period.end} - ${reportData.incident_overview?.total_incidents || 0} Incidents Detected`;

// Return data for email node
return {
    json: {
        subject: subject,
        html: emailHTML,
        reportData: reportData,
        period: period
    }
};
```

### 4. Add Gmail Node (or SMTP Node)

#### Option A: Using Gmail

1. **Add Node** → Search for "Gmail"
2. **Configure Gmail Node:**
   - **Resource:** Message
   - **Operation:** Send
   - **To:** Enter admin emails separated by commas (e.g., `admin1@company.com, admin2@company.com`)
     - **TIP:** You can also use a group email like `security-admins@company.com`
   - **Subject:** `{{ $json.subject }}`
   - **Email Type:** HTML
   - **Message (HTML):** `{{ $json.html }}`

3. **Setup Gmail OAuth:**
   - Click "Connect my account"
   - Follow OAuth flow to authorize n8n

#### Option B: Using SMTP (Email Node)

1. **Add Node** → Search for "Email" (Send Email)
2. **Configure Email Node:**
   - **From Email:** `security@yourdomain.com`
   - **To Email:** Enter admin emails separated by commas
   - **Subject:** `{{ $json.subject }}`
   - **Email Type:** HTML
   - **Text:** `{{ $json.html }}`

3. **Configure SMTP Credentials:**
   - Go to "Credentials" in n8n settings
   - Add "SMTP" credential
   - Fill in your SMTP server details:
     - **Host:** smtp.gmail.com (or your SMTP server)
     - **Port:** 587 (TLS) or 465 (SSL)
     - **Username:** Your email
     - **Password:** Your email password or app password

### 5. (Optional) Add Multiple Recipients from Database

If you want to fetch admin emails from a database:

1. **Add Node** → "HTTP Request" or database node BEFORE Code node
2. **Query admin users:**
   ```sql
   SELECT email FROM users WHERE role = 'admin' OR role = 'system_admin'
   ```
3. **Use the emails** in the Gmail/SMTP node:
   ```
   {{ $json["$node"]["YourDatabaseNode"].json.map(u => u.email).join(', ') }}
   ```

### 6. Update Backend Configuration

1. Open `backend/server.js`
2. Find line ~133 (the `/api/email-report` endpoint)
3. Replace the webhook URL with your n8n webhook URL:

```javascript
const webhookUrl = 'https://webhook.csnet.my/webhook/YOUR_WEBHOOK_ID_HERE';
```

### 7. Test the Workflow

1. **In n8n:**
   - Click "Execute Workflow" in test mode
   - Send test data from frontend

2. **In your app:**
   - Generate a report
   - Click "Email Report"
   - Check the checkbox
   - Click "Send Report"

3. **Check:**
   - n8n execution logs
   - Email inbox of recipients
   - Backend server logs

## Environment Variables (Optional)

Add to your `.env` file if needed:

```env
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_FROM=security@yourdomain.com
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

## Troubleshooting

### Email not sending?
- Check n8n workflow is ACTIVE (not just saved)
- Verify SMTP credentials are correct
- Check Gmail "Less secure apps" setting or use App Password
- Check n8n execution logs for errors

### Webhook not triggering?
- Verify webhook URL in `server.js` is correct
- Check backend server logs
- Test webhook URL with Postman/curl

### Formatting issues?
- Test HTML in the Code node output
- Check browser console for errors
- Verify all template variables have data

## Security Best Practices

1. **Use environment variables** for sensitive data
2. **Limit email recipients** to authorized personnel only
3. **Use SSL/TLS** for SMTP connections
4. **Enable 2FA** on email accounts
5. **Use App Passwords** instead of actual passwords for Gmail

## Example n8n Workflow JSON

You can import this workflow JSON:

```json
{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "email-report",
        "responseMode": "lastNode",
        "options": {}
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300]
    },
    {
      "parameters": {
        "mode": "runOnceForAllItems",
        "jsCode": "// Paste the Code from Step 3 here"
      },
      "name": "Build Email",
      "type": "n8n-nodes-base.code",
      "position": [450, 300]
    },
    {
      "parameters": {
        "resource": "message",
        "operation": "send",
        "to": "admin@company.com",
        "subject": "={{ $json.subject }}",
        "emailType": "html",
        "message": "={{ $json.html }}"
      },
      "name": "Gmail",
      "type": "n8n-nodes-base.gmail",
      "position": [650, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{ "node": "Build Email", "type": "main", "index": 0 }]]
    },
    "Build Email": {
      "main": [[{ "node": "Gmail", "type": "main", "index": 0 }]]
    }
  }
}
```

---

**📧 Your email report workflow is now ready!**
