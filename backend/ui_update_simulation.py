#!/usr/bin/env python3
"""
Frontend Webhook Handler Example

This script demonstrates how a frontend application might handle
incoming webhook notifications and update the UI accordingly.

This is a simulation script - in a real frontend, this would be
implemented in JavaScript/React/Vue/etc.
"""

import json
import time
from datetime import datetime

class MockUI:
    """Mock UI to simulate frontend behavior"""

    def __init__(self):
        self.notifications = []
        self.notification_count = 0
        self.tickets = []
        self.comments = []
        self.kb_articles = []
        self.users = []

    def show_notification(self, message, type="info"):
        """Show a notification to the user"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"🔔 [{timestamp}] {message}")

        # In a real app, this might show a toast notification
        if "New comment" in message:
            print("   💬 Comment notification - refresh comments list")
        elif "New ticket" in message:
            print("   🎫 Ticket notification - refresh tickets list")
        elif "attachment" in message.lower():
            print("   📎 Attachment notification - refresh attachments")
        elif "KB article" in message:
            print("   📚 KB notification - refresh knowledge base")

    def update_badge_count(self):
        """Update notification badge count"""
        self.notification_count = len([n for n in self.notifications if not n.get('read', False)])
        print(f"🔴 Notification badge updated: {self.notification_count}")

    def refresh_lists(self, notification_type):
        """Refresh relevant UI lists based on notification type"""
        if "comment" in notification_type:
            print("   🔄 Refreshing comments list...")
        elif "ticket" in notification_type:
            print("   🔄 Refreshing tickets list...")
        elif "attachment" in notification_type:
            print("   🔄 Refreshing attachments list...")
        elif "kb" in notification_type:
            print("   🔄 Refreshing knowledge base...")
        elif "user" in notification_type:
            print("   🔄 Refreshing users list...")

    def handle_webhook(self, payload):
        """Handle incoming webhook payload"""
        try:
            event = payload.get('event')
            notification = payload.get('notification')
            data = payload.get('data')  # New: entity data for real-time updates

            if event == 'notification.created' and notification:
                # Add to notifications list
                self.notifications.insert(0, notification)
                self.notification_count += 1

                # Show notification to user
                self.show_notification(notification['message'], notification['type'])

                # NEW: Update specific items in collections using data field
                if data and notification.get('related_type'):
                    self.update_entity_in_collection(notification['related_type'], data)

                # Update UI elements
                self.update_badge_count()
                self.refresh_lists(notification['type'])

                # Handle specific notification types
                if notification['type'] == 'comment_on_ticket':
                    print("   💬 New comment - scroll to highlight it")
                elif notification['type'] == 'new_ticket':
                    print("   🎫 New ticket - update dashboard stats")
                elif notification['type'] == 'attachment_added':
                    print("   📎 New attachment - show download link")

                print(f"   📊 UI updated for notification: {notification['id']}")

        except Exception as e:
            print(f"❌ Error handling webhook: {e}")

    def update_entity_in_collection(self, entity_type, entity_data):
        """Update or add entity in the appropriate collection"""
        entity_id = entity_data.get('id')
        if not entity_id:
            return

        if entity_type == 'ticket':
            # Simulate updating ticket in tickets collection
            print(f"   🔄 Updated ticket {entity_id} in tickets collection")
            print(f"      Status: {entity_data.get('status', 'unknown')}")
            print(f"      Assignee: {entity_data.get('assignee_id', 'unassigned')}")

        elif entity_type == 'comment':
            # Simulate updating comment in comments collection
            print(f"   🔄 Updated comment {entity_id} in comments collection")
            print(f"      Content: {entity_data.get('content', '')[:50]}...")

        elif entity_type == 'user':
            # Simulate updating user in users collection
            print(f"   🔄 Updated user {entity_id} in users collection")
            print(f"      Name: {entity_data.get('name', 'unknown')}")
            print(f"      Role: {entity_data.get('role', 'unknown')}")

        elif entity_type == 'attachment':
            # Simulate updating attachment in attachments collection
            print(f"   🔄 Updated attachment {entity_id} in attachments collection")
            print(f"      Filename: {entity_data.get('filename', 'unknown')}")

        elif entity_type == 'kb_article':
            # Simulate updating KB article in articles collection
            print(f"   🔄 Updated KB article {entity_id} in articles collection")
            print(f"      Title: {entity_data.get('title', 'unknown')}")

def simulate_webhook_payload(notification_type, message, related_id=None, related_type=None, data=None):
    """Create a mock webhook payload with optional data"""
    return {
        "event": "notification.created",
        "notification": {
            "id": f"mock-{int(time.time())}",
            "type": notification_type,
            "message": message,
            "related_id": related_id or "mock-id",
            "related_type": related_type or "mock",
            "created_at": datetime.now().isoformat()
        },
        "data": data  # Include entity data for real-time updates
    }

def main():
    """Simulate webhook handling in a frontend"""
    print("🎨 Frontend Webhook Handler Simulation")
    print("=" * 50)

    ui = MockUI()

    # Simulate receiving various webhook notifications
    webhooks = [
        simulate_webhook_payload(
            "new_ticket",
            "New ticket created: 'Server Down Issue'",
            "ticket-123",
            "ticket",
            {
                "id": "ticket-123",
                "subject": "Server Down Issue",
                "description": "The main server is not responding",
                "status": "open",
                "priority": "high",
                "requester_id": "user-456",
                "assignee_id": "user-789",
                "created_at": datetime.now().isoformat()
            }
        ),
        simulate_webhook_payload(
            "comment_on_ticket",
            "New comment on your ticket 'Server Down Issue' by John Doe",
            "comment-456",
            "comment",
            {
                "id": "comment-456",
                "content": "I've identified the issue. Working on a fix now.",
                "author_id": "user-789",
                "ticket_id": "ticket-123",
                "created_at": datetime.now().isoformat()
            }
        ),
        simulate_webhook_payload(
            "attachment_added",
            "New attachment 'server_logs.txt' added to ticket 'Server Down Issue'",
            "attachment-789",
            "attachment",
            {
                "id": "attachment-789",
                "filename": "server_logs.txt",
                "file_size": 1024000,
                "mime_type": "text/plain",
                "ticket_id": "ticket-123",
                "uploaded_by": "user-789",
                "created_at": datetime.now().isoformat()
            }
        ),
        simulate_webhook_payload(
            "kb_article_created",
            "New knowledge base article: 'Troubleshooting Server Issues'",
            "kb-101",
            "kb_article",
            {
                "id": "kb-101",
                "title": "Troubleshooting Server Issues",
                "content": "Common server troubleshooting steps...",
                "author_id": "user-999",
                "tags": ["server", "troubleshooting"],
                "created_at": datetime.now().isoformat()
            }
        ),
        simulate_webhook_payload(
            "user_created",
            "New user 'Jane Smith' was created",
            "user-202",
            "user",
            {
                "id": "user-202",
                "name": "Jane Smith",
                "email": "jane.smith@example.com",
                "role": "AGENT",
                "is_active": True,
                "created_at": datetime.now().isoformat()
            }
        ),
        simulate_webhook_payload(
            "webhook_test",
            "This is a test webhook notification",
            "test-999",
            "test"
            # No data for test notifications
        )
    ]

    print("\n📨 Processing webhook notifications...\n")

    for i, webhook in enumerate(webhooks, 1):
        print(f"Webhook {i}/{len(webhooks)}:")
        ui.handle_webhook(webhook)
        print()

        # Simulate some processing time
        time.sleep(0.5)

    print("✅ All webhooks processed!")
    print(f"\n📈 Final UI State:")
    print(f"   Notifications: {len(ui.notifications)}")
    print(f"   Badge count: {ui.notification_count}")

    print("\n💡 Real Frontend Implementation:")
    print("""
    // React Example with Real-time Data Updates
    const [notifications, setNotifications] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [comments, setComments] = useState([]);
    const [badgeCount, setBadgeCount] = useState(0);

    // Webhook receiver endpoint
    app.post('/api/webhooks/notifications', (req, res) => {
      const { notification, data } = req.body;

      // Update state
      setNotifications(prev => [notification, ...prev));
      setBadgeCount(prev => prev + 1);

      // Update specific entities using data field
      if (data) {
        switch (notification.related_type) {
          case 'ticket':
            setTickets(prev => {
              const existing = prev.find(t => t.id === data.id);
              if (existing) {
                // Update existing ticket
                return prev.map(t => t.id === data.id ? data : t);
              } else {
                // Add new ticket
                return [data, ...prev];
              }
            });
            break;
            
          case 'comment':
            setComments(prev => {
              const existing = prev.find(c => c.id === data.id);
              if (existing) {
                // Update existing comment
                return prev.map(c => c.id === data.id ? data : c);
              } else {
                // Add new comment
                return [...prev, data];
              }
            });
            break;
        }
      }

      // Show toast
      toast.success(notification.message);

      // Refresh relevant data only if needed
      // (much less frequent with data field)

      res.json({ status: 'received' });
    });

    // WebSocket for real-time updates
    useEffect(() => {
      const socket = io();
      socket.on('notification', (notification) => {
        // Handle real-time notification
      });
      return () => socket.disconnect();
    }, []);
    """)

if __name__ == "__main__":
    main()