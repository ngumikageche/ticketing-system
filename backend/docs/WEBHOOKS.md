# Webhooks and Real-time Notifications

This document explains how to integrate with the Support Ticketing System's webhook system for real-time notifications.

## Overview

The system uses a hooks-based architecture that automatically sends notifications when comments are created, updated, or deleted. Users can configure webhook URLs to receive these notifications in real-time.

## Setting up Webhooks

### 1. Configure Webhook URL

Users can set their webhook URL through the API:

```http
PUT /api/users/me/webhook
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "webhook_url": "https://your-app.com/api/webhooks/notifications"
}
```

For internal webhooks (same application), use relative URLs:

```json
{
  "webhook_url": "/api/notifications/webhooks/notifications"
}
```

### 2. Handle Webhook Payloads

Your endpoint will receive POST requests with this payload structure:

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
    // Full entity data for real-time UI updates (optional)
    "id": "comment-uuid",
    "content": "This is the comment content",
    "author_id": "user-uuid",
    "ticket_id": "ticket-uuid",
    "created_at": "2025-11-17T12:00:00Z",
    "updated_at": "2025-11-17T12:00:00Z"
    // ... full entity fields
  }
}
```

**The `data` field contains the complete updated entity**, allowing your frontend to update specific items in lists without refetching entire collections.

### 3. Notification Types

The system sends notifications for these events:

**Comments:**
- `comment_on_ticket`: New comment on user's ticket
- `reply_to_comment`: Reply to user's comment
- `comment_updated`: Comment on user's ticket was edited
- `comment_deleted`: Comment on user's ticket was deleted

**Messages:**
- `message_on_ticket`: New message on user's ticket
- `message_deleted`: Message on user's ticket was deleted
- `message_on_conversation`: New message in conversation user participates in

**Message Read Status:**
The system tracks per-user message read status for WhatsApp-like read receipts. Messages include an `is_read` field indicating read status for the current user. Users can mark messages as read through dedicated endpoints.

**Tickets:**
- `new_ticket`: New ticket created (admins only)
- `ticket_updated`: Ticket assigned to user was updated
- `ticket_deleted`: Ticket assigned to user was deleted
- `ticket_assigned`: User was assigned a ticket

**Users:**
- `user_created`: New user created (admins only)
- `user_deactivated`: User was deactivated (admins only)

**Knowledge Base:**
- `kb_article_created`: New KB article created

**Attachments:**
- `attachment_added`: New attachment added to user's ticket
- `attachment_updated`: Attachment on user's ticket was updated
- `attachment_deleted`: Attachment on user's ticket was deleted

**Testing:**
- `webhook_test`: Test notification for webhook verification

## Message Read Status

The system implements WhatsApp-like read receipts with per-user message tracking:

### Read Status Tracking

- **Per-user tracking**: Each user has individual read status for messages
- **Real-time updates**: Read status is updated immediately when marked as read
- **Bulk operations**: Mark entire conversations or messages up to a point as read

### Read Status API

```javascript
// Mark single message as read
fetch(`/api/conversations/${conversationId}/messages/${messageId}/read`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Mark entire conversation as read
fetch(`/api/conversations/${conversationId}/read`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Mark messages up to a point as read
fetch(`/api/conversations/${conversationId}/read-up-to/${messageId}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Frontend Integration

```javascript
// When fetching messages, check read status
const messages = await fetch(`/api/conversations/${conversationId}/messages`);
const messageData = await messages.json();

// Each message includes is_read field
messages.forEach(message => {
  if (message.is_read) {
    // Show as read (e.g., remove bold styling)
    markMessageAsRead(message.id);
  } else {
    // Show as unread (e.g., bold text, blue dot)
    markMessageAsUnread(message.id);
  }
});

// Auto-mark messages as read when viewed
function markMessageAsRead(messageId) {
  fetch(`/api/conversations/${conversationId}/messages/${messageId}/read`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
}

// Mark conversation as read when opening it
function markConversationAsRead(conversationId) {
  fetch(`/api/conversations/${conversationId}/read`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

## Frontend Integration Examples

### React Hook for Webhook Handling

```javascript
import { useEffect, useState } from 'react';

function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [comments, setComments] = useState([]);

  useEffect(() => {
    // Set up webhook endpoint in your backend
    fetch('/api/user/webhook', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        webhook_url: `${window.location.origin}/api/webhooks/notifications`
      })
    });
  }, []);

  // Your webhook receiver endpoint
  const handleWebhook = (payload) => {
    const { notification, data } = payload;
    
    // Add to notifications list
    setNotifications(prev => [notification, ...prev]);

    // Update specific items in collections using the data field
    if (data && notification.related_type) {
      switch (notification.related_type) {
        case 'ticket':
          // Update or add ticket in the list
          setTickets(prev => {
            const existingIndex = prev.findIndex(t => t.id === data.id);
            if (existingIndex >= 0) {
              // Update existing ticket
              const updated = [...prev];
              updated[existingIndex] = data;
              return updated;
            } else {
              // Add new ticket
              return [data, ...prev];
            }
          });
          break;
          
        case 'comment':
          // Update or add comment in the list
          setComments(prev => {
            const existingIndex = prev.findIndex(c => c.id === data.id);
            if (existingIndex >= 0) {
              // Update existing comment
              const updated = [...prev];
              updated[existingIndex] = data;
              return updated;
            } else {
              // Add new comment
              return [...prev, data];
            }
          });
          break;
          
        case 'message':
          // Update or add message in the list
          setMessages(prev => {
            const existingIndex = prev.findIndex(m => m.id === data.id);
            if (existingIndex >= 0) {
              // Update existing message
              const updated = [...prev];
              updated[existingIndex] = data;
              return updated;
            } else {
              // Add new message
              return [...prev, data];
            }
          });
          break;
      }
    }

    // Show browser notification
    if (Notification.permission === 'granted') {
      new Notification(notification.message);
    }
  };

  return { notifications, tickets, comments, handleWebhook };
}
```

### Express.js Webhook Receiver

```javascript
const express = require('express');
const app = express();

app.post('/api/webhooks/notifications', express.json(), (req, res) => {
  const { event, notification, data } = req.body;

  console.log('Received webhook:', event, notification);

  // Update specific items in your data stores
  if (data) {
    switch (notification.related_type) {
      case 'ticket':
        // Update ticket in cache/database
        updateTicketInStore(data);
        // Emit to connected WebSocket clients
        io.emit('ticket.update', data);
        break;
        
      case 'comment':
        // Update comment in cache/database
        updateCommentInStore(data);
        // Emit to connected WebSocket clients
        io.emit('comment.update', data);
        break;
        
      case 'message':
        // Update message in cache/database
        updateMessageInStore(data);
        // Emit to connected WebSocket clients
        io.emit('message.update', data);
        break;
        
      case 'user':
        // Update user in cache/database
        updateUserInStore(data);
        io.emit('user.updated', data);
        break;
    }
  }

  // Broadcast to connected WebSocket clients
  io.emit('notification', notification);

  // Store in database or update UI state
  // ...

  res.json({ status: 'received' });
});
```

### WebSocket Integration

```javascript
import io from 'socket.io-client';

const socket = io();

socket.on('notification', (notification) => {
  // Update notifications list
  addNotification(notification);

  // Show toast notification
  toast.success(notification.message);
});
```

## Real-time Updates: Webhooks + WebSockets

The system supports **dual real-time channels** for maximum compatibility and performance:

### 1. **Webhooks** (HTTP-based)
- ✅ External integrations
- ✅ Reliable delivery with retries
- ✅ Works with any HTTP client
- ✅ Includes full entity data

### 2. **WebSockets/Socket.IO** (Real-time)
- ✅ Instant UI updates
- ✅ Bidirectional communication
- ✅ Room-based messaging
- ✅ Connected client notifications

## WebSocket Integration

### Client Connection

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

// Connection events
socket.on('connect', () => {
  console.log('Connected to real-time server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

// Join rooms for targeted updates
socket.emit('join', { room: 'tickets' });
socket.emit('join', { room: 'comments' });
```

### Real-time Event Handling

```javascript
// Listen for all notifications
socket.on('notification', (payload) => {
  const { notification, data } = payload;
  handleNotification(notification, data);
});

// Listen for specific entity updates
socket.on('ticket.update', (payload) => {
  const { data } = payload;
  updateTicketInUI(data);
});

socket.on('comment.update', (payload) => {
  const { data } = payload;
  updateCommentInUI(data);
});

socket.on('message.update', (payload) => {
  const { data } = payload;
  updateMessageInUI(data);
});

socket.on('user.update', (payload) => {
  const { data } = payload;
  updateUserInUI(data);
});

socket.on('kb.update', (payload) => {
  const { data } = payload;
  updateKBArticleInUI(data);
});

socket.on('attachment.update', (payload) => {
  const { data } = payload;
  updateAttachmentInUI(data);
});
```

### React Hook with WebSockets

```javascript
function useRealTimeUpdates() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    
    newSocket.on('connect', () => {
      setIsConnected(true);
      // Join relevant rooms
      newSocket.emit('join', { room: 'tickets' });
      newSocket.emit('join', { room: 'comments' });
    });
    
    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });
    
    // Handle real-time updates
    newSocket.on('notification', (payload) => {
      const { notification, data } = payload;
      // Update UI immediately with data
      updateEntity(notification.related_type, data);
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.disconnect();
    };
  }, []);
  
  return { socket, isConnected };
}
```

## Best Practices

1. **Validate Payloads**: Always validate incoming webhook data
2. **Handle Failures**: Implement retry logic for failed webhook deliveries
3. **Security**: Use webhook signatures if implementing external webhooks
4. **Rate Limiting**: Be prepared for notification bursts
5. **Idempotency**: Handle duplicate webhook deliveries gracefully

## Troubleshooting

- **Webhooks not received**: Check that the webhook URL is correctly configured
- **Invalid payloads**: Ensure your endpoint accepts JSON POST requests
- **Authentication errors**: Verify JWT tokens are valid
- **Internal webhooks**: Use relative URLs starting with `/` for same-app endpoints