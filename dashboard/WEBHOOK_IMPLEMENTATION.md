# Webhook and Real-time Implementation

This document describes the enhanced webhook system with WebSocket support for real-time notifications and UI updates.

## Overview

The system now supports:
- **Enhanced webhook payloads** with full entity data for real-time UI updates
- **WebSocket connections** for instant notifications and data synchronization
- **Real-time data hooks** for automatic UI updates when entities change

## Webhook Payload Structure

Webhooks now include a `data` field containing the complete updated entity:

```json
{
  "event": "notification.created",
  "notification": {
    "id": "uuid-string",
    "type": "comment_on_ticket",
    "message": "New comment on your ticket 'Issue Title' by John Doe",
    "related_id": "comment-uuid",
    "related_type": "comment",
    "created_at": "2025-11-17T12:00:00Z"
  },
  "data": {
    "id": "comment-uuid",
    "content": "This is the comment content",
    "author_id": "user-uuid",
    "ticket_id": "ticket-uuid",
    "created_at": "2025-11-17T12:00:00Z",
    "updated_at": "2025-11-17T12:00:00Z"
  }
}
```

## WebSocket Events

The frontend connects to WebSocket for real-time updates:

### Connection
- `connect` - WebSocket connected
- `disconnect` - WebSocket disconnected

### Room Joining
- `join` - Join a room for targeted updates (tickets, comments, users, kb, attachments)

### Notifications
- `notification` - New notification with enhanced payload containing `notification` and `data` fields

### Entity Updates
- `ticket.update` - Ticket data updated
- `comment.update` - Comment data updated
- `user.update` - User data changed
- `kb.update` - Knowledge base article updated
- `attachment.update` - Attachment data updated

## Frontend Implementation

### WebSocket Context
```jsx
import { useWebSocket } from '../contexts/WebSocketContext';

function MyComponent() {
  const { isConnected, notifications, getRealtimeData } = useWebSocket();

  return (
    <div>
      <div className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
        {isConnected ? '🟢 Connected' : '🟡 Disconnected'}
      </div>
      {/* Component content */}
    </div>
  );
}
```

### Real-time Data Hook
```jsx
import { useRealtimeData } from '../hooks/useRealtime';

function TicketsList() {
  const [tickets, setTickets] = useRealtimeData('ticket.update', []);

  // tickets will automatically update when WebSocket events are received
  return (
    <div>
      {tickets.map(ticket => (
        <TicketItem key={ticket.id} ticket={ticket} />
      ))}
    </div>
  );
}
```

### Real-time Notifications
```jsx
import { useRealtimeNotifications } from '../hooks/useRealtime';

function NotificationDropdown() {
  const { notifications, markAsRead } = useRealtimeNotifications();

  return (
    <div>
      {notifications.map(notification => (
        <div key={notification.id}>
          {notification.message}
          <button onClick={() => markAsRead(notification.id)}>
            Mark as read
          </button>
        </div>
      ))}
    </div>
  );
}
```

## API Functions

### Webhook Management
- `setWebhookUrl(url)` - Configure webhook endpoint
- `getWebhookUrl()` - Get current webhook URL
- `testWebhook()` - Send test notification

### Payload Processing
- `processWebhookPayload(payload)` - Process enhanced webhook payloads
- `WEBHOOK_EVENTS` - Constants for event types

## Backend Requirements

For full functionality, the backend should:

1. **Support WebSocket connections** with authentication
2. **Emit WebSocket events** for entity changes
3. **Send enhanced webhook payloads** with `data` field
4. **Handle webhook delivery** with retry logic

## Usage Examples

### Setting up Webhooks
```javascript
// In Settings component
const handleSaveWebhook = async () => {
  await setWebhookUrl('https://my-app.com/api/webhooks/notifications');
  alert('Webhook configured!');
};
```

### Testing Webhooks
```javascript
// Test webhook configuration
const handleTestWebhook = async () => {
  await testWebhook();
  alert('Test notification sent!');
};
```

### Real-time UI Updates
```jsx
function Dashboard() {
  const [tickets, setTickets] = useRealtimeData('ticket.updated', []);
  const { notifications } = useRealtimeNotifications();

  // UI automatically updates when data changes
  return (
    <div>
      <h2>Notifications: {notifications.length}</h2>
      <h2>Tickets: {tickets.length}</h2>
    </div>
  );
}
```

## Room-Based Messaging

The WebSocket implementation uses rooms for efficient, targeted updates:

```jsx
// The WebSocket context automatically joins these rooms on connection:
- 'tickets' - for ticket updates
- 'comments' - for comment updates  
- 'users' - for user updates
- 'kb' - for knowledge base updates
- 'attachments' - for attachment updates
```

This ensures clients only receive relevant updates for the data they're viewing.

## Connection Status

The UI shows connection status:
- 🟢 Green dot: WebSocket connected
- 🟡 Yellow dot: WebSocket disconnected (fallback to polling if needed)

## Best Practices

1. **Handle disconnections** gracefully
2. **Validate webhook payloads** before processing
3. **Use real-time hooks** for automatic UI updates
4. **Test webhook endpoints** before production use
5. **Monitor WebSocket connections** for reliability

## Troubleshooting

- **WebSocket not connecting**: Check backend WebSocket server and authentication
- **Notifications not updating**: Verify WebSocket events are being emitted with correct room names
- **Webhook tests failing**: Check webhook URL configuration and payload validation
- **UI not updating**: Ensure components use real-time hooks and correct event names
- **Room joining issues**: Verify backend supports room-based messaging