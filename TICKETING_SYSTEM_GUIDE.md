# Alert Ticketing System with RBAC - Implementation Guide

## 🎯 Overview

This system implements a professional Security Operations Center (SOC) ticketing system with Role-Based Access Control (RBAC) for alert management.

## 🔐 Role Hierarchy & Permissions

### 1. **Admin**
- **Access**: Full system access
- **Alert View**: See ALL alerts in the system
- **Special Features**:
  - Can view assignment status for all alerts
  - Can trigger auto-assignment of alerts
  - Can manage users and system configuration
- **Permissions**: Full Access, User Management, System Configuration, Alert Management, Generate Reports

### 2. **Analyst I**
- **Access**: Limited to assigned alerts only
- **Alert View**: Only alerts assigned to them
- **Assignment Priority**: Medium and Low severity alerts (4-9 alerts initially)
- **Permissions**: View Alerts, Analyze Threats, Generate Reports

### 3. **Analyst II**
- **Access**: Limited to assigned alerts only
- **Alert View**: Only alerts assigned to them
- **Assignment Priority**: High and Critical severity alerts (4-9 alerts initially)
- **Permissions**: View Alerts, Analyze Threats, Update Status, Generate Reports

### 4. **Viewer**
- **Access**: Read-only access
- **Permissions**: View Alerts, View Reports

## 🚀 How to Use the System

### **For Admins**

#### Step 1: Initial Setup - Assign Alerts to Analysts

1. **Create Analyst Accounts First**:
   - Go to the Roles page
   - Create users with roles "Analyst I" and "Analyst II"

2. **Navigate to Alert Management Page**:
   - Log in as Admin
   - Go to Alert Management

3. **Run Initial Auto-Assignment**:
   - Click the "Auto-Assign Alerts" button
   - The system will:
     - Assign 4-9 medium/low severity alerts to each Analyst I
     - Assign 4-9 high/critical severity alerts to each Analyst II
   - You'll see a success message with assignment statistics

4. **View Assignment Status**:
   - The "Assigned To" column shows which analyst is handling each alert
   - Unassigned alerts show as "Unassigned"

#### Step 2: Monitor Assignments

- View all alerts regardless of assignment
- See who's working on which alerts
- Monitor workload distribution across analysts

### **For Analyst I Users**

1. **Log In**:
   - Use your Analyst I credentials

2. **View Your Assigned Alerts**:
   - Navigate to Alert Management
   - You'll see ONLY the alerts assigned to you
   - A blue info banner shows: "Showing only alerts assigned to you (X alerts)"

3. **Work on Alerts**:
   - Click the eye icon to view alert details
   - Analyze medium and low severity threats
   - Generate reports as needed

### **For Analyst II Users**

1. **Log In**:
   - Use your Analyst II credentials

2. **View Your Assigned Alerts**:
   - Navigate to Alert Management
   - You'll see ONLY high and critical severity alerts assigned to you
   - A blue info banner shows: "Showing only alerts assigned to you (X alerts)"

3. **Work on Alerts**:
   - Click the eye icon to view alert details
   - Handle high-priority and critical threats
   - Update status and generate reports

## 🔄 Assignment Logic

### Initial Assignment (Existing 1500 Alerts)

```
For each Analyst I:
  - Randomly select 4-9 medium/low severity alerts
  - Assign to that analyst

For each Analyst II:
  - Randomly select 4-9 high/critical severity alerts
  - Assign to that analyst
```

### New Alert Assignment (Future Alerts)

The system includes an endpoint `/api/alerts/auto-assign-new` for automatic assignment of new incoming alerts:

```
When new alerts arrive (2-3 at a time):
  
  If medium/low severity:
    - Randomly select one Analyst I
    - Assign 2-3 alerts to them
  
  If high/critical severity:
    - Randomly select one Analyst II
    - Assign 2-3 alerts to them
```

**To trigger this for new alerts**, you can integrate it with your alert ingestion pipeline:

```javascript
// Example: After new alerts are received
const newAlertIds = ['correlation_key_1', 'correlation_key_2', 'correlation_key_3'];

fetch('/api/alerts/auto-assign-new', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ alertIds: newAlertIds })
});
```

## 📊 Data Structure

### Firebase Collection: `alertAssignments`

Each assignment document contains:

```javascript
{
  alertId: "correlation_key_from_clickhouse",
  assignedTo: "user_uid_from_firebase",
  assignedToName: "User Display Name",
  assignedToRole: "analyst_i" or "analyst_ii",
  assignedAt: Timestamp,
  status: "assigned",
  severity: "low" | "medium" | "high" | "critical"
}
```

## 🛠️ API Endpoints

### 1. Get Alerts (with RBAC filtering)
```
GET /api/alerts?userId={uid}&userRole={role}

Returns:
- Admin: All alerts with assignment info
- Analyst I/II: Only assigned alerts
- Viewer: All alerts without assignment info
```

### 2. Manual Assignment
```
POST /api/alerts/assign

Body:
{
  alertIds: ["alert1", "alert2"],
  userId: "user_uid",
  userName: "User Name",
  userRole: "analyst_i"
}
```

### 3. Initial Auto-Assignment
```
POST /api/alerts/auto-assign-initial

Returns:
{
  success: true,
  assignmentCount: 45,
  analystICount: 5,
  analystIICount: 3
}
```

### 4. Auto-Assign New Alerts
```
POST /api/alerts/auto-assign-new

Body:
{
  alertIds: ["new_alert_1", "new_alert_2"]
}
```

## ✅ Benefits of This System

1. **Professional SOC Workflow**: Matches industry-standard practices
2. **Workload Management**: Prevents analyst overwhelm with controlled alert distribution
3. **Priority Routing**: Critical alerts go to senior analysts (Analyst II)
4. **Scalability**: Handles both existing and new alerts efficiently
5. **Transparency**: Admins can monitor who's working on what
6. **Privacy**: Analysts only see their assigned work
7. **Fair Distribution**: Random assignment ensures equitable workload

## 🔧 Troubleshooting

### "No analysts found" error
- **Solution**: Create at least one Analyst I or Analyst II user in the Roles page before running auto-assignment

### Analysts not seeing any alerts
- **Solution**: Admin needs to run "Auto-Assign Alerts" first to distribute the initial workload

### Want to reassign alerts
- **Solution**: Currently, delete the assignment document from Firebase `alertAssignments` collection and run auto-assignment again. (Manual reassignment UI can be added later)

## 🎓 Best Practices

1. **Initial Setup**:
   - Create analyst accounts first
   - Run initial auto-assignment once
   - Monitor assignment distribution

2. **Daily Operations**:
   - Admins review overall status
   - Analysts focus on their assigned alerts
   - New alerts auto-assign when they arrive (2-3 at a time)

3. **Workload Balance**:
   - If one analyst has too many alerts, admin can manually reassign
   - Monitor alert completion rates
   - Adjust analyst team size based on alert volume

## 🚀 Future Enhancements

Consider adding:
- Manual reassignment UI for admins
- Alert status updates (investigating, resolved, false positive)
- Alert acknowledgment tracking
- SLA timers for alert response
- Analyst workload dashboard
- Alert escalation rules
- Notification system for new assignments
- Comments/notes on alerts

---

**Implemented**: January 7, 2026
**System**: CyberSecure Alert Management Platform
