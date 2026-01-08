# N8N Escalation Workflow Setup

## Overview
This workflow handles escalating alerts to SOC2 team after user confirmation.

## Workflow 3: Escalate to SOC2

### Node 1: Webhook (POST)
- **URL**: `https://webhook.csnet.my/webhook/escalate-to-soc2`
- **Method**: POST
- **Respond**: When Last Node Finishes
- **Response Data**: First Entry JSON

### Node 2: Code (Extract Data)
```javascript
// Extract data from webhook body
const data = $json.body;

return [{
  json: {
    incident_id: data.incident_id,
    alert_name: data.alert_name,
    severity: data.severity,
    user_name: data.user_name,
    host: data.host,
    ip: data.ip,
    timestamp: data.timestamp,
    user_response: data.user_response,
    escalation_reason: data.escalation_reason,
    escalated_by: data.escalated_by,
    soc2_email: data.soc2_email || 'soc2@csnet.my'
  }
}];
```

### Node 3: Send Email (to SOC2)
**Email Configuration:**
- **To**: `{{ $json.soc2_email }}`
- **Subject**: `🚨 [SOC2] Security Alert Escalation - {{ $json.severity }} Priority`

**Email Body (HTML)**:
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #f59e0b; border-radius: 10px; background-color: #fffbeb;">
  <h2 style="color: #dc2626; margin-top: 0;">🚨 Security Alert Escalation</h2>
  
  <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
    <h3 style="margin-top: 0; color: #1f2937;">Alert Details</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px; font-weight: bold; width: 40%;">Incident ID:</td>
        <td style="padding: 8px;">{{ $json.incident_id }}</td>
      </tr>
      <tr style="background-color: #f9fafb;">
        <td style="padding: 8px; font-weight: bold;">Alert Name:</td>
        <td style="padding: 8px;">{{ $json.alert_name }}</td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold;">Severity:</td>
        <td style="padding: 8px;">
          <span style="background-color: {% if $json.severity == 'high' %}#dc2626{% elif $json.severity == 'critical' %}#7c2d12{% else %}#f59e0b{% endif %}; color: white; padding: 2px 8px; border-radius: 3px;">
            {{ $json.severity | upper }}
          </span>
        </td>
      </tr>
      <tr style="background-color: #f9fafb;">
        <td style="padding: 8px; font-weight: bold;">User:</td>
        <td style="padding: 8px;">{{ $json.user_name }}</td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold;">Host:</td>
        <td style="padding: 8px;">{{ $json.host }}</td>
      </tr>
      <tr style="background-color: #f9fafb;">
        <td style="padding: 8px; font-weight: bold;">IP Address:</td>
        <td style="padding: 8px;">{{ $json.ip }}</td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold;">Time Detected:</td>
        <td style="padding: 8px;">{{ $json.timestamp }}</td>
      </tr>
    </table>
  </div>

  <div style="background-color: #fef2f2; padding: 15px; border-radius: 5px; border-left: 4px solid #dc2626; margin-bottom: 15px;">
    <h3 style="margin-top: 0; color: #dc2626;">⚠️ User Response</h3>
    <p style="font-size: 16px; margin: 0;">
      <strong>User Response:</strong> 
      <span style="color: {% if $json.user_response == 'yes' %}#059669{% else %}#dc2626{% endif %}; font-weight: bold;">
        {{ $json.user_response | upper }}
      </span>
    </p>
    {% if $json.user_response == 'no' %}
    <p style="margin-top: 10px; color: #dc2626; font-weight: bold;">
      ⚠️ User denied this login attempt - potential security breach!
    </p>
    {% endif %}
  </div>

  <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
    <h3 style="margin-top: 0; color: #1f2937;">Escalation Information</h3>
    <p><strong>Reason:</strong> {{ $json.escalation_reason }}</p>
    <p><strong>Escalated by:</strong> {{ $json.escalated_by }}</p>
    <p><strong>Escalation Time:</strong> {{ new Date().toLocaleString() }}</p>
  </div>

  <div style="background-color: #dbeafe; padding: 15px; border-radius: 5px; border-left: 4px solid #2563eb;">
    <h3 style="margin-top: 0; color: #1e40af;">📋 Next Steps</h3>
    <ol style="margin: 0; padding-left: 20px;">
      <li>Review alert details and user response</li>
      <li>Investigate the incident thoroughly</li>
      <li>Check for related alerts or patterns</li>
      <li>Take appropriate action (block IP, reset credentials, etc.)</li>
      <li>Document findings in the ticketing system</li>
    </ol>
  </div>

  <hr style="border: none; border-top: 1px solid #d1d5db; margin: 20px 0;">

  <p style="font-size: 12px; color: #6b7280; text-align: center;">
    This is an automated escalation from CyberSecure SOC1 Team.<br>
    Please respond within 30 minutes for high/critical severity alerts.
  </p>
</div>
```

### Node 4: Respond to Webhook
**Response Type**: JSON
**Body**:
```json
{
  "status": "escalated",
  "message": "Alert has been escalated to SOC2 team",
  "incident_id": "{{ $json.incident_id }}",
  "escalated_at": "{{ new Date().toISOString() }}"
}
```

---

## Setup Instructions

1. **Create Workflow in n8n:**
   - Go to https://webhook.csnet.my
   - Create new workflow named "Escalate to SOC2"
   - Add all 4 nodes as described above

2. **Configure Email Node:**
   - Use your SMTP credentials (Gmail/SendGrid)
   - Set SOC2 email address (default: `soc2@csnet.my`)

3. **Activate Workflow:**
   - Toggle the Active switch at the top
   - Copy the webhook URL for testing

4. **Test the Workflow:**
   ```bash
   curl -X POST https://webhook.csnet.my/webhook/escalate-to-soc2 \
     -H "Content-Type: application/json" \
     -d '{
       "incident_id": "test-escalation-123",
       "alert_name": "Multiple Failed Logins",
       "severity": "high",
       "user_name": "testuser",
       "host": "server01",
       "ip": "192.168.1.100",
       "timestamp": "2026-01-08 10:30:00",
       "user_response": "no",
       "escalation_reason": "User denied login - suspicious activity",
       "escalated_by": "analyst1@csnet.my",
       "soc2_email": "your-soc2-email@example.com"
     }'
   ```

---

## Integration Flow

```
User clicks "Escalate to SOC2"
       ↓
Frontend → Backend → Firestore (update escalated=true)
       ↓
Backend → n8n Workflow 3
       ↓
n8n sends email to SOC2
       ↓
SOC2 receives escalation ticket
       ↓
Frontend shows "🚀 Escalated to SOC2"
```

---

## Email Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `incident_id` | Unique alert identifier | `multiple_logon_failure...` |
| `alert_name` | Type of security alert | `Multiple Logon Failure` |
| `severity` | Alert severity level | `high`, `critical`, `medium` |
| `user_name` | Affected user account | `john.doe` |
| `host` | Target system | `server01.csnet.my` |
| `ip` | IP address involved | `192.168.1.100` |
| `timestamp` | When alert was detected | `08/01/2026, 10:30:00 am` |
| `user_response` | User's confirmation | `yes` or `no` |
| `escalation_reason` | Why it was escalated | `User denied - potential breach` |
| `escalated_by` | Who escalated it | `analyst1@csnet.my` |

---

## Notes

- **SOC2 Email**: Change `soc2@csnet.my` to your actual SOC2 email in backend `server.js` line ~1072
- **Priority Handling**: Escalations are urgent - ensure SOC2 team monitors email
- **Firestore Tracking**: All escalations are tracked in `investigation_statuses` collection
- **No User Action Required**: User has already responded, SOC2 handles next steps

---

## For Production

1. Create dedicated `soc2@csnet.my` email account
2. Set up email forwarding/distribution list if multiple SOC2 analysts
3. Consider adding Slack/Teams notification as backup
4. Add escalation SLA tracking (response time requirements)
5. Create SOC2 dashboard to view all escalated tickets
