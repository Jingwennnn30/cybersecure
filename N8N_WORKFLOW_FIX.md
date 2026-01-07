# N8N Workflow Configuration Fix

## Error: "Unused Respond to Webhook node found in the workflow"

This error occurs when the webhook is set to "When Last Node Finishes" but the workflow structure is incorrect.

## ✅ CORRECT Workflow 1 Structure (Investigate Alert)

```
Webhook (POST) 
    ↓
Code (Generate Links)
    ↓
Send Email
    ↓
Respond to Webhook ← MUST BE THE LAST NODE
```

### Step-by-Step Fix:

1. **Delete the existing workflow** or edit it

2. **Node 1: Webhook**
   - Method: POST
   - Path: `/webhook/investigate-alert`
   - **Respond Mode**: `When Last Node Finishes`
   - **Response Data**: `First Entry JSON`

3. **Node 2: Code** (Generate Links)
   - Connect from Webhook node
   - Code:
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

4. **Node 3: Send Email**
   - Connect from Code node
   - Configure your email settings
   - To: `wongyihan2003@gmail.com`
   - Subject: `Security Alert: Confirm Login Activity`
   - Email Body (HTML):
   ```html
   <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
     <h2 style="color: #1e40af;">Security Alert</h2>
     <p>Hello <strong>{{ $json.user_name }}</strong>,</p>
     
     <p>We detected a login attempt on your account and need your confirmation.</p>
     
     <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
       <p><strong>Host:</strong> {{ $json.host }}</p>
       <p><strong>Time:</strong> {{ $json.timestamp }}</p>
       <p><strong>Alert:</strong> {{ $json.alert_name }}</p>
     </div>
     
     <p style="font-size: 18px; font-weight: bold; margin-top: 30px;">Did you attempt this login?</p>
     
     <div style="text-align: center; margin: 30px 0;">
       <a href="{{ $json.yes_link }}" style="display: inline-block; padding: 15px 40px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 5px; margin: 10px; font-weight: bold;">✓ YES, it was me</a>
       <br>
       <a href="{{ $json.no_link }}" style="display: inline-block; padding: 15px 40px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 5px; margin: 10px; font-weight: bold;">✗ NO, it wasn't me</a>
     </div>
     
     <p style="color: #6b7280; font-size: 12px; margin-top: 40px;"><em>This is an automated security alert from CyberSecure. If you did not authorize this activity, please click NO and change your password immediately.</em></p>
   </div>
   ```

5. **Node 4: Respond to Webhook** ⚠️ CRITICAL
   - Connect from Send Email node
   - **Respond With**: `JSON`
   - **Response Body**:
   ```json
   {
     "status": "email_sent",
     "message": "Confirmation email has been sent to the user.",
     "incident_id": "{{ $json.incident_id }}"
   }
   ```

### ⚠️ IMPORTANT NOTES:
- ALL nodes must be connected in a single chain
- The "Respond to Webhook" node MUST be the last node
- Make sure there are no disconnected nodes
- Save and activate the workflow

---

## ✅ CORRECT Workflow 2 Structure (Get User Response)

```
Webhook (GET)
    ↓
Code (Parse Query)
    ↓
HTTP Request (Send to Backend)
    ↓
Respond to Webhook ← MUST BE THE LAST NODE
```

### Step-by-Step Fix:

1. **Node 1: Webhook**
   - Method: GET
   - Path: `/webhook/user-confirmation`
   - **Respond Mode**: `Immediately`
   - **No need for "Respond to Webhook" node** when using "Immediately"

2. **Node 2: Code** (Parse Response)
   ```javascript
   return [{
     json: {
       incident_id: $json.query.incident_id,
       user_answer: $json.query.answer,
       received_at: new Date().toISOString()
     }
   }];
   ```

3. **Node 3: HTTP Request** (Send to Backend)
   - Method: POST
   - URL: `http://localhost:4000/api/alerts/user-response`
   - Send Body: Yes
   - Body Content Type: JSON
   - Specify Body: Using Fields Below
   - JSON/RAW Parameters:
   ```json
   {
     "incident_id": "={{ $json.incident_id }}",
     "user_answer": "={{ $json.user_answer }}",
     "received_at": "={{ $json.received_at }}"
   }
   ```

4. **OPTIONAL: Respond to Webhook** (only if not using "Immediately")
   - If using "Immediately" mode, DELETE this node
   - Response:
   ```json
   {
     "message": "Thanks! Your response has been recorded.",
     "incident_id": "={{ $json.incident_id }}",
     "answer": "={{ $json.user_answer }}"
   }
   ```

---

## Testing After Fix

1. **Activate both workflows**
2. **Test Workflow 1** with curl:
   ```bash
   curl -X POST https://webhook.csnet.my/webhook/investigate-alert \
     -H "Content-Type: application/json" \
     -d '{
       "incident_id": "test-123",
       "user_name": "Test User",
       "host": "192.168.1.100",
       "timestamp": "2026-01-08T10:00:00Z",
       "alert_name": "Test Alert",
       "severity": "high"
     }'
   ```
   
   Expected response:
   ```json
   {"status":"email_sent","message":"Confirmation email has been sent to the user.","incident_id":"test-123"}
   ```

3. **Test Workflow 2**:
   ```bash
   curl "https://webhook.csnet.my/webhook/user-confirmation?incident_id=test-123&answer=yes"
   ```

---

## Common Issues & Solutions

### Issue: "Unused Respond to Webhook node"
**Solution**: Make sure ALL nodes are connected in order and the Respond node is LAST

### Issue: Workflow returns HTML instead of JSON
**Solution**: Check that "Respond With" is set to "JSON" not "Text"

### Issue: Email not sending
**Solution**: Configure email credentials in n8n settings

### Issue: Backend not receiving callback
**Solution**: Check HTTP Request node URL is correct (`http://localhost:4000`)

---

## Visual Workflow Structure

### Workflow 1 (Must have this exact structure):
```
┌─────────────────┐
│  Webhook POST   │
│  /investigate   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Code: Generate │
│  Yes/No Links   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Send Email     │
│  to User        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Respond to     │ ← MUST BE HERE!
│  Webhook (JSON) │
└─────────────────┘
```

### Workflow 2:
```
┌─────────────────┐
│  Webhook GET    │
│  /confirmation  │
│  Mode: Immediately
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Code: Parse    │
│  Query Params   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  HTTP Request   │
│  POST to Backend│
└────────┬────────┘
         │
         ▼
  (Auto responds
   immediately)
```
