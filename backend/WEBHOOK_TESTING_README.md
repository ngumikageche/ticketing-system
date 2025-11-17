# Webhook Testing and UI Integration Scripts

This directory contains scripts to test and demonstrate the comprehensive webhook system.

## Files

### `test_webhooks.py`
**Purpose**: End-to-end testing of the webhook system
**What it does**:
- Logs in as admin user
- Configures webhook URL
- Sends test webhook
- Creates test data (tickets, comments, KB articles) to trigger real webhooks
- Checks received notifications
- Simulates UI updates

**Usage**:
```bash
python test_webhooks.py
```

**Prerequisites**:
- Flask app running on localhost:5000
- Admin user exists (run `python scripts/create_first_user.py` first if needed)
- Database initialized

### `ui_update_simulation.py`
**Purpose**: Demonstrates how a frontend should handle webhook notifications
**What it does**:
- Simulates receiving various webhook payloads
- Shows how UI would update for each notification type
- Demonstrates notification badges, list refreshes, and user feedback
- Provides React implementation example

**Usage**:
```bash
python ui_update_simulation.py
```

## Enhanced Webhook Payload with Real-time Data

The webhook system now includes **full entity data** in the payload, enabling true real-time UI updates without refetching lists.

### Enhanced Payload Structure

```json
{
  "event": "notification.created",
  "notification": {
    "id": "uuid",
    "type": "ticket_updated",
    "message": "Your ticket was updated",
    "related_id": "ticket-uuid",
    "related_type": "ticket",
    "created_at": "2025-11-17T12:00:00Z"
  },
  "data": {
    // Complete entity data for real-time UI updates
    "id": "ticket-uuid",
    "subject": "Updated Subject",
    "status": "in_progress",
    "assignee_id": "user-123",
    "updated_at": "2025-11-17T12:00:00Z"
    // ... all entity fields
  }
}
```

### Frontend Benefits

✅ **Instant UI Updates**: Update specific items without API calls  
✅ **Reduced Network Traffic**: No need to refetch entire lists  
✅ **Real-time Consistency**: UI stays synchronized with database  
✅ **Better UX**: Changes appear immediately, no loading delays  

### Supported Entities with Data

- **Tickets**: Full ticket data on create/update
- **Comments**: Full comment data on create/update  
- **Users**: Full user data on create/delete
- **KB Articles**: Full article data on create
- **Attachments**: Full attachment data on create

### Implementation Pattern

```javascript
// Update specific entity in collection
if (data) {
  switch (notification.related_type) {
    case 'ticket':
      setTickets(prev => prev.map(t => 
        t.id === data.id ? data : t  // Update existing or add new
      ));
      break;
    case 'comment':
      setComments(prev => {
        const existing = prev.find(c => c.id === data.id);
        return existing 
          ? prev.map(c => c.id === data.id ? data : c)  // Update
          : [...prev, data];  // Add new
      });
      break;
  }
}
```

### Supported Events
- **Comments**: Created, updated, deleted
- **Tickets**: Created, updated, deleted
- **Users**: Created, updated, deleted
- **Knowledge Base**: Articles created, updated, deleted
- **Attachments**: Added, updated, deleted

### Webhook Configuration
Users can set webhook URLs via `PUT /api/users/me/webhook`:
```json
{
  "webhook_url": "https://your-app.com/api/webhooks/notifications"
}
```

For internal webhooks (same app): `"/api/notifications/webhooks/notifications"`

### Webhook Payload
```json
{
  "event": "notification.created",
  "notification": {
    "id": "uuid",
    "type": "comment_on_ticket",
    "message": "New comment on your ticket 'Subject' by Author",
    "related_id": "entity-uuid",
    "related_type": "comment|ticket|user|kb_article|attachment",
    "created_at": "2025-11-17T12:00:00Z"
  }
}
```

## Frontend Integration

### 1. Set up Webhook Receiver
```javascript
// Express.js example
app.post('/api/webhooks/notifications', (req, res) => {
  const { notification } = req.body;

  // Handle notification
  handleNotification(notification);

  res.json({ status: 'received' });
});
```

### 2. Update UI State
```javascript
const handleNotification = (notification) => {
  // Add to notifications list
  setNotifications(prev => [notification, ...prev]);

  // Update badge count
  setBadgeCount(prev => prev + 1);

  // Show toast notification
  toast.success(notification.message);

  // Refresh relevant data
  if (notification.type.includes('ticket')) {
    refetchTickets();
  } else if (notification.type.includes('comment')) {
    refetchComments();
  }
};
```

### 3. Real-time with WebSockets (Optional)
```javascript
useEffect(() => {
  const socket = io();
  socket.on('notification', handleNotification);
  return () => socket.disconnect();
}, []);
```

### `test_socketio.py`
**Purpose**: Tests WebSocket/Socket.IO real-time functionality
**What it does**:
- Connects to Socket.IO server
- Listens for real-time events
- Demonstrates room-based messaging
- Shows instant UI update patterns

**Usage**:
```bash
python test_socketio.py
```

**Prerequisites**:
- Flask app with Socket.IO running
- flask-socketio and python-socketio installed

## Real-time Architecture: Webhooks + WebSockets

The system now supports **dual real-time channels** for optimal performance:

### 🔗 **Webhooks** (HTTP-based)
- **Use Case**: External integrations, reliable delivery
- **Features**: Retry logic, full entity data, external APIs
- **Trigger**: All CRUD operations send webhooks to configured URLs

### ⚡ **WebSockets/Socket.IO** (Real-time)
- **Use Case**: Instant frontend updates, live collaboration
- **Features**: Bidirectional, room-based, instant delivery
- **Trigger**: Same events as webhooks, emitted to connected clients

### 🎯 **Enhanced Payload with Data**
Both channels now include complete entity data:

```json
{
  "event": "notification.created",
  "notification": {
    "type": "ticket_updated",
    "message": "Your ticket was updated",
    "related_type": "ticket"
  },
  "data": {
    "id": "ticket-123",
    "subject": "Server Issue",
    "status": "in_progress",
    "assignee_id": "user-456"
  }
}
```

## Frontend Integration Patterns

### Option 1: Webhooks Only
```javascript
// Set webhook URL to your frontend endpoint
fetch('/api/users/me/webhook', {
  method: 'PUT',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    webhook_url: `${window.location.origin}/api/webhooks/ui-updates`
  })
});

// Handle webhook in your frontend
app.post('/api/webhooks/ui-updates', (req, res) => {
  const { data } = req.body;
  updateEntityInUI(data); // Instant update with full data
});
```

### Option 2: WebSockets Only
```javascript
const socket = io('http://localhost:5000');

socket.on('notification', (payload) => {
  const { data } = payload;
  updateEntityInUI(data); // Instant real-time update
});
```

### Option 3: Hybrid (Recommended)
```javascript
// Use WebSockets for instant updates
const socket = io('http://localhost:5000');
socket.on('notification', (payload) => {
  updateEntityInUI(payload.data);
});

// Use webhooks as fallback/reliable delivery
fetch('/api/users/me/webhook', {
  method: 'PUT',
  body: JSON.stringify({
    webhook_url: `${window.location.origin}/api/webhooks/fallback`
  })
});
```

## Testing the Complete System

1. **Start the enhanced Flask app**:
   ```bash
   python wsgi.py
   ```

2. **Test Socket.IO connection**:
   ```bash
   python test_socketio.py
   ```

3. **Test webhook functionality**:
   ```bash
   python test_webhooks.py
   ```

4. **Simulate UI updates**:
   ```bash
   python ui_update_simulation.py
   ```

## Key Benefits

✅ **Zero Polling**: No more `setInterval` API calls  
✅ **Instant Updates**: Changes appear immediately  
✅ **Reduced API Load**: No refetching entire lists  
✅ **Reliable Delivery**: Webhooks ensure no missed updates  
✅ **Real-time Collaboration**: Multiple users see changes instantly  
✅ **External Integration**: Webhooks work with any system  

## Next Steps

1. Implement Socket.IO client in your frontend
2. Set up webhook receiver endpoint
3. Replace polling with real-time subscriptions
4. Add offline/online state management
5. Consider implementing operational transforms for complex collaboration</content>
<parameter name="filePath">/home/future/support-ticketing-system/backend/WEBHOOK_TESTING_README.md