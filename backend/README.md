# Support Ticketing System - Backend

A comprehensive support ticketing system with real-time messaging, notifications, and WhatsApp-like read receipts.

## 🚀 Features

- **Multi-channel Messaging**: Direct messages, group conversations, and ticket-based discussions
- **Threaded Replies**: Full support for nested message replies
- **Real-time Notifications**: Dual-channel notifications via webhooks and WebSocket/Socket.IO
- **Message Read Status**: WhatsApp-like read receipts with per-user message tracking
- **Comprehensive Ticketing**: Full lifecycle management with status tracking
- **Knowledge Base**: Article management with tagging and search
- **File Attachments**: Support for attaching files to tickets and messages
- **User Management**: Role-based access control

## 📱 Message Read Status

The system implements WhatsApp-like read receipts with comprehensive read status tracking:

### Read Status Endpoints

```http
# Mark single message as read
POST /api/conversations/{conversation_id}/messages/{message_id}/read

# Mark entire conversation as read
POST /api/conversations/{conversation_id}/read

# Mark messages up to a point as read
POST /api/conversations/{conversation_id}/read-up-to/{message_id}
```

### Read Status in API Responses

When fetching messages, each message includes an `is_read` field:

```json
{
  "id": "message-uuid",
  "content": "Hello!",
  "sender_id": "user-uuid",
  "is_read": true,
  "created_at": "2025-11-19T..."
}
```

### Frontend Integration

```javascript
// Check read status when displaying messages
messages.forEach(message => {
  const element = document.getElementById(`message-${message.id}`);
  if (message.is_read) {
    element.classList.remove('unread');
  } else {
    element.classList.add('unread');
  }
});

// Mark message as read when viewed
function markAsRead(messageId) {
  fetch(`/api/conversations/${conversationId}/messages/${messageId}/read`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
}

// Mark conversation as read when opened
function markConversationRead(conversationId) {
  fetch(`/api/conversations/${conversationId}/read`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

## 🛠 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd support-ticketing-system/backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up database**
   ```bash
   # Initialize database
   flask db init  # If not already done
   flask db migrate
   flask db upgrade

   # Create first admin user
   python scripts/create_first_user.py
   ```

5. **Run the application**
   ```bash
   # Development
   python flask_app.py

   # Production
   python wsgi.py
   ```

## 📚 API Documentation

Complete OpenAPI 3.1.0 documentation is available in `docs/openapi.yaml`.

### Key Endpoints

- **Authentication**: `/api/auth/login`, `/api/auth/signup`
- **Users**: `/api/users/`
- **Tickets**: `/api/tickets/`
- **Conversations**: `/api/conversations/`
- **Messages**: `/api/conversations/{id}/messages`
- **Notifications**: `/api/notifications/`
- **Knowledge Base**: `/api/kb/`

## 🔧 Testing

Run the test suite:
```bash
pytest tests/
```

Test webhook functionality:
```bash
python test_webhooks.py
```

Test Socket.IO real-time features:
```bash
python test_socketio.py
```

## 📖 Documentation

- **API Reference**: `docs/openapi.yaml`
- **Webhooks Guide**: `docs/WEBHOOKS.md`
- **Webhook Testing**: `WEBHOOK_TESTING_README.md`

## 🏗 Architecture

- **Framework**: Flask with Flask-SocketIO
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Real-time**: Socket.IO with eventlet
- **Authentication**: JWT tokens
- **Documentation**: OpenAPI 3.1.0
- **Migrations**: Flask-Migrate (Alembic)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

[Add your license information here]</content>
<parameter name="filePath">/home/future/support-ticketing-system/backend/README.md