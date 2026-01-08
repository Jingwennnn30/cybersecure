# N8N Investigation Workflow Setup Guide

## Overview
This guide explains how to set up the investigation workflow that sends confirmation emails to users and receives their responses.

## Workflow 1: Investigate Alert (Trigger Email)

### Node 1: Webhook (POST)
- **URL**: `https://webhook.csnet.my/webhook/investigate-alert`
- **Method**: POST
- **Respond**: When Last Node Finishes
- **Response Data**: First Entry JSON

### Node 2: Code (Generate Links)
```javascript
const baseUrl = "https://webhook.csnet.my/webhook/user-confirmation";

return [{
  json: {
    ...$json,
    yes_link: `${baseUrl}?incident_id=${$json.incident_id}&answer=yes`,
    no_link: `${baseUrl}?incident_id=${$json.incident_id}&answer=no`
  }
}];
```

### Node 3: Send Email
**Email Body (HTML)**:
```html
<p>Hello {{ $json.user_name }},</p>

<p>
We are investigating a security incident related to your account on 
<b>{{ $json.host }}</b>.
</p>

<p>
<b>Time detected:</b> {{ $json.timestamp }}
</p>

<p><b>Did you attempt this login?</b></p>

<p>
<a href="{{ $json.yes_link }}" style="display: inline-block; padding: 10px 20px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px;">YES, it was me</a><br><br>
<a href="{{ $json.no_link }}" style="display: inline-block; padding: 10px 20px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px;">NO, it wasn't me</a>
</p>

<p><i>This is an automated security alert from CyberSecure.</i></p>
```

**To**: `wongyihan2003@gmail.com` (or use `{{ $json.user_email }}` if you want it dynamic)

### Node 4: Respond to Webhook
**Response Type**: JSON
**Body**:
```json
{
  "status": "email_sent",
  "message": "Confirmation email has been sent to the user."
}
```

---

## Workflow 2: Get User Response

### Node 1: Webhook (GET)
- **URL**: `https://webhook.csnet.my/webhook/user-confirmation`
- **Method**: GET
- **Respond**: Immediately

### Node 2: Code (Parse Response)
```javascript
return [{
  json: {
    incident_id: $json.query.incident_id,
    user_answer: $json.query.answer,
    received_at: new Date().toISOString()
  }
}];
```

### Node 3: HTTP Request (NEW - Send to Backend)
**IMPORTANT**: Add this node after the Code node and BEFORE the Respond node

- **Method**: POST
- **URL**: `http://localhost:4000/api/alerts/user-response`
- **Authentication**: None
- **Body Content Type**: JSON
- **Specify Body**: Using Fields Below
- **Body Parameters**:
  - `incident_id`: `{{ $json.incident_id }}`
  - `user_answer`: `{{ $json.user_answer }}`
  - `received_at`: `{{ $json.received_at }}`

**Note**: If your backend is deployed on a server, replace `localhost:4000` with your actual backend URL.

### Node 4: Respond to Webhook
**Response Type**: JSON
**Body**:
```json
{
  "message": "Thanks! Your response has been recorded.",
  "incident_id": "{{ $json.incident_id }}",
  "answer": "{{ $json.user_answer }}"
}
```

---

## Testing the Workflow

### 1. Activate Both Workflows
Make sure both workflows are ACTIVE in n8n (toggle the switch at the top).

### 2. Test from Frontend
1. Go to the Alerts page in your CyberSecure dashboard
2. Click the "Investigate" button on any alert
3. The row should turn **yellow** (investigating status)
4. Check your email at wongyihan2003@gmail.com
5. Click either "YES" or "NO" in the email
6. The alert row should update:
   - **Green** if user clicked YES
   - **Red** if user clicked NO
7. The investigation status column will show:
   - "Investigating..." with spinner (yellow)
   - "✓ User confirmed: YES" (green)
   - "✗ User denied: NO" (red)

### 3. Manual Testing (Optional)
You can test the webhook directly:

**Test Workflow 1 (Trigger Investigation)**:
```bash
curl -X POST https://webhook.csnet.my/webhook/investigate-alert \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": "test123",
    "user_name": "Test User",
    "user_email": "wongyihan2003@gmail.com",
    "host": "192.168.1.100",
    "timestamp": "2026-01-07T10:30:00Z",
    "alert_name": "Suspicious Login",
    "severity": "high"
  }'
```

**Test Workflow 2 (Simulate User Response)**:
```bash
# Test YES response
curl "https://webhook.csnet.my/webhook/user-confirmation?incident_id=test123&answer=yes"

# Test NO response
curl "https://webhook.csnet.my/webhook/user-confirmation?incident_id=test123&answer=no"
```

---

## Troubleshooting

### Email Not Sending
- Check n8n email node credentials
- Verify SMTP settings are correct
- Check n8n execution logs for errors

### Frontend Not Updating
- Check browser console for errors
- Verify backend is running on port 4000
- Check that Workflow 2 has the HTTP Request node pointing to the correct backend URL

### Polling Not Working
- The frontend polls every 3 seconds
- Check browser console for polling errors
- Verify the `/api/alerts/:alertId/status` endpoint is working

### Backend URL for Production
If deploying to production, update the HTTP Request node in Workflow 2:
- Change `http://localhost:4000` to your production backend URL
- Example: `https://api.csnet.my` or your actual domain

---

## Flow Diagram

```
User clicks Investigate
       ↓
Frontend → Backend → n8n Workflow 1
                           ↓
                      Send Email
                           ↓
                     User Receives Email
                           ↓
                   User Clicks YES/NO
                           ↓
                    n8n Workflow 2
                           ↓
                      Backend API
                           ↓
                  Store in Memory/DB
                           ↓
             Frontend Polls & Updates UI
```

---

## Next Steps

1. **Email Configuration**: Configure your email provider in n8n (Gmail, SendGrid, etc.)
2. **Database Storage**: Replace in-memory storage with database (Firebase/Firestore) for persistence
3. **Notifications**: Add real-time WebSocket updates instead of polling
4. **Escalation**: Add automatic escalation if user responds "NO"
5. **Audit Trail**: Log all investigation activities for compliance

---

## Notes

- The investigation status is stored in memory on the backend
- Restarting the backend will clear all investigation statuses
- For production, implement database storage (Firestore recommended)
- Email address is currently hardcoded to wongyihan2003@gmail.com
- Consider adding user email lookup from Firebase Auth
