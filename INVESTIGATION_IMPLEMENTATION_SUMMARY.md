# Investigation Workflow Implementation Summary

## What Was Implemented

### Backend Changes (`backend/server.js`)

#### New Endpoints Added:

1. **POST `/api/alerts/investigate`**
   - Triggers the n8n investigation workflow
   - Marks alert as "investigating"
   - Sends alert details to n8n webhook
   - n8n sends confirmation email to user

2. **POST `/api/alerts/user-response`**
   - Receives user response from n8n (YES/NO)
   - Updates investigation status in memory
   - Called by n8n Workflow 2 after user clicks email link

3. **GET `/api/alerts/:alertId/status`**
   - Returns current investigation status for an alert
   - Used by frontend polling mechanism
   - Returns: status ('none', 'investigating', 'responded') and userResponse

#### Data Storage:
- Uses in-memory Map: `investigationStatuses`
- Structure:
  ```javascript
  {
    status: 'investigating' | 'responded',
    timestamp: ISO string,
    userResponse: 'yes' | 'no' | null,
    responseTimestamp: ISO string
  }
  ```

### Frontend Changes (`src/pages/Alerts.jsx`)

#### New State Variables:
- `investigationStatuses`: Object storing status for each alert
- `pollingAlerts`: Set of alert IDs currently being polled

#### New Features:

1. **Investigation Status Column**
   - Shows current status of each alert investigation
   - Displays spinner for "investigating"
   - Shows ✓ for YES responses (green)
   - Shows ✗ for NO responses (red)

2. **Row Color Coding**
   - **Yellow background**: Alert is being investigated (awaiting user response)
   - **Green background**: User confirmed "YES, it was me"
   - **Red background**: User denied "NO, it wasn't me"
   - Default: Normal white/gray background

3. **Investigate Button Handler**
   - Calls backend API to trigger n8n workflow
   - Immediately shows "investigating" status
   - Starts polling for user response
   - Handles errors gracefully

4. **Polling Mechanism**
   - Polls every 3 seconds for alerts being investigated
   - Checks backend for status updates
   - Stops polling when response is received
   - Updates UI automatically when user responds

5. **Enhanced Modal**
   - Shows investigation status in the detail modal
   - Displays user response with color-coded messages
   - Hides "Investigate" button if already investigating or responded

## User Flow

```
1. Analyst clicks "Investigate" button on an alert
   ↓
2. Row turns YELLOW → Email sent to user
   ↓
3. User receives email with YES/NO links
   ↓
4. User clicks YES or NO
   ↓
5. n8n receives response → Sends to backend
   ↓
6. Frontend polling detects update
   ↓
7. Row turns GREEN (YES) or RED (NO)
   Status column updates with user's choice
```

## N8N Workflow Configuration

### Workflow 1: Send Investigation Email
1. Webhook receives alert data from backend
2. Code node generates YES/NO confirmation links
3. Email node sends styled email to user
4. Respond node confirms email sent

### Workflow 2: Receive User Response
1. Webhook receives user click (YES/NO)
2. Code node parses the response
3. **HTTP Request node sends to backend** ← NEW STEP REQUIRED
4. Respond node shows thank you message to user

## Testing Steps

### 1. Start the Backend
```bash
cd backend
node server.js
```

### 2. Start the Frontend
```bash
npm start
```

### 3. Activate n8n Workflows
- Make sure both workflows are ACTIVE in n8n
- Verify webhooks are using production URLs

### 4. Test Investigation
1. Navigate to Alerts page
2. Click "Investigate" on any alert
3. Verify row turns yellow
4. Check email at wongyihan2003@gmail.com
5. Click YES or NO in email
6. Verify row updates to green or red

## Important Notes

### ⚠️ Action Required in n8n
You MUST add an HTTP Request node in Workflow 2 (between Code and Respond nodes):
- **URL**: `http://localhost:4000/api/alerts/user-response`
- **Method**: POST
- **Body**: JSON with incident_id, user_answer, received_at

### 🔴 Limitations
- Investigation statuses stored in memory (lost on backend restart)
- Email hardcoded to wongyihan2003@gmail.com
- Polling every 3 seconds (can add WebSocket for real-time)

### ✅ Recommended Improvements
1. Store investigation statuses in Firestore
2. Implement WebSocket for real-time updates
3. Add email lookup from Firebase Auth
4. Add investigation history/audit log
5. Implement automatic escalation for "NO" responses
6. Add investigation notes/comments

## Files Modified

1. `backend/server.js` - Added 3 new endpoints + in-memory storage
2. `src/pages/Alerts.jsx` - Added investigation UI + polling
3. `N8N_INVESTIGATION_WORKFLOW_GUIDE.md` - Complete setup guide (NEW)

## Environment Variables

No new environment variables required. Uses existing:
- Backend port: 4000
- n8n webhook URL: https://webhook.csnet.my/webhook/investigate-alert
- User response webhook: https://webhook.csnet.my/webhook/user-confirmation

## Database Schema (If Using Firestore)

If you want to persist investigation statuses, create this collection:

**Collection**: `investigations`
**Document ID**: `{alertId}` (correlation_key)
**Fields**:
```
{
  alertId: string
  status: string ('investigating' | 'responded')
  timestamp: timestamp
  userResponse: string | null ('yes' | 'no')
  responseTimestamp: timestamp | null
  initiatedBy: string (userId)
  alertData: object (snapshot of alert)
}
```

## API Reference

### Trigger Investigation
```http
POST /api/alerts/investigate
Content-Type: application/json

{
  "alertId": "correlation_key_123",
  "alertData": {
    "user": "john.doe",
    "host": "192.168.1.100",
    "ip": "10.0.0.5",
    "timestamp": "2026-01-07T10:30:00Z",
    "name": "Suspicious Login Attempt",
    "severity": "high"
  }
}
```

### Record User Response (Called by n8n)
```http
POST /api/alerts/user-response
Content-Type: application/json

{
  "incident_id": "correlation_key_123",
  "user_answer": "yes",
  "received_at": "2026-01-07T10:35:00Z"
}
```

### Get Investigation Status
```http
GET /api/alerts/{alertId}/status

Response:
{
  "status": "responded",
  "timestamp": "2026-01-07T10:30:00Z",
  "userResponse": "yes",
  "responseTimestamp": "2026-01-07T10:35:00Z"
}
```

## Color Coding Reference

| Status | Background Color | Meaning |
|--------|-----------------|---------|
| None | White/Gray | No investigation |
| Investigating | Yellow | Awaiting user response |
| Responded: YES | Green | User confirmed legitimate |
| Responded: NO | Red | User denied - potential threat |

---

## Quick Start Checklist

- [ ] Backend running on port 4000
- [ ] Frontend running (npm start)
- [ ] n8n Workflow 1 active (investigate-alert)
- [ ] n8n Workflow 2 active (user-confirmation)
- [ ] HTTP Request node added to Workflow 2
- [ ] Email credentials configured in n8n
- [ ] Test email address: wongyihan2003@gmail.com
- [ ] Click Investigate button
- [ ] Receive email
- [ ] Click YES or NO
- [ ] See row color change

✅ Implementation Complete!
