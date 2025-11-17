#!/usr/bin/env python3
"""
Socket.IO Testing Script

This script demonstrates how to test the WebSocket/Socket.IO functionality
for real-time updates alongside the webhook system.

Usage:
    python test_socketio.py

Requirements:
    - Flask app with Socket.IO running
    - socket.io-client (for testing)
"""

import socketio
import time
import json
from datetime import datetime

def test_socketio_connection():
    """Test basic Socket.IO connection and events"""
    print("🧪 Socket.IO Testing Script")
    print("=" * 50)

    # Create Socket.IO client
    sio = socketio.Client()

    @sio.event
    def connect():
        print("✅ Connected to Socket.IO server")

    @sio.event
    def disconnect():
        print("❌ Disconnected from Socket.IO server")

    @sio.on('status')
    def on_status(data):
        print(f"📡 Status: {data.get('message', 'Unknown')}")

    @sio.on('notification')
    def on_notification(data):
        print("🔔 Real-time notification received:")
        notification = data.get('notification', {})
        entity_data = data.get('data')
        print(f"   Type: {notification.get('type')}")
        print(f"   Message: {notification.get('message')}")
        if entity_data:
            print(f"   Data: {json.dumps(entity_data, indent=4)[:200]}...")
        print()

    @sio.on('ticket.update')
    def on_ticket_update(data):
        print("🎫 Ticket update received:")
        entity_data = data.get('data')
        if entity_data:
            print(f"   Ticket: {entity_data.get('subject')} (Status: {entity_data.get('status')})")
        print()

    @sio.on('comment.update')
    def on_comment_update(data):
        print("💬 Comment update received:")
        entity_data = data.get('data')
        if entity_data:
            print(f"   Comment: {entity_data.get('content', '')[:50]}...")
        print()

    try:
        # Connect to server
        print("🔌 Connecting to Socket.IO server...")
        sio.connect('http://localhost:5000')

        # Join some rooms
        print("🏠 Joining rooms...")
        sio.emit('join', {'room': 'tickets'})
        sio.emit('join', {'room': 'comments'})
        sio.emit('join', {'room': 'general'})

        # Wait for connection to establish
        time.sleep(2)

        print("\n📝 Now perform actions in another terminal to see real-time updates!")
        print("   - Create/update tickets")
        print("   - Add/update comments")
        print("   - Upload attachments")
        print("   - Create users")
        print("\n⏳ Listening for real-time events... (Ctrl+C to stop)")

        # Keep listening
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Stopping...")

    except Exception as e:
        print(f"❌ Socket.IO test failed: {e}")
        print("\n💡 Make sure:")
        print("   - Flask app is running with Socket.IO enabled")
        print("   - Server is accessible at http://localhost:5000")
        print("   - flask-socketio and python-socketio are installed")

    finally:
        if sio.connected:
            sio.disconnect()

def simulate_real_time_updates():
    """Simulate how the system handles real-time updates"""
    print("\n🎭 Real-time Update Simulation")
    print("=" * 50)

    # Mock Socket.IO events that would be sent by the server
    mock_events = [
        {
            'event': 'notification',
            'data': {
                'event': 'notification.created',
                'notification': {
                    'type': 'ticket_updated',
                    'message': 'Your ticket was updated',
                    'related_type': 'ticket'
                },
                'data': {
                    'id': 'ticket-123',
                    'subject': 'Server Issue',
                    'status': 'in_progress',
                    'assignee_id': 'user-456',
                    'updated_at': datetime.now().isoformat()
                }
            }
        },
        {
            'event': 'comment.update',
            'data': {
                'event': 'notification.created',
                'notification': {
                    'type': 'comment_on_ticket',
                    'message': 'New comment added',
                    'related_type': 'comment'
                },
                'data': {
                    'id': 'comment-789',
                    'content': 'Issue has been resolved',
                    'author_id': 'user-456',
                    'ticket_id': 'ticket-123',
                    'created_at': datetime.now().isoformat()
                }
            }
        }
    ]

    print("Frontend would handle these events like:")
    print()

    for event in mock_events:
        event_type = event['event']
        payload = event['data']

        if event_type == 'notification':
            notification = payload.get('notification', {})
            data = payload.get('data')

            print(f"📨 Notification: {notification.get('type')}")
            if data:
                print("   🎯 Immediate UI Update with data:")
                print(f"      Entity ID: {data.get('id')}")
                print(f"      Status/Content: {data.get('status') or data.get('content', '')[:30]}...")
                print("      ✅ No API call needed!")

        elif event_type == 'comment.update':
            data = payload.get('data')
            print("💬 Comment Update:")
            if data:
                print(f"   🎯 Update comment {data.get('id')} in UI")
                print("      ✅ Real-time without polling!")

        print()

def main():
    """Main testing function"""
    print("🔌 Socket.IO Real-time Testing")
    print("=" * 50)

    # Test actual Socket.IO connection
    test_socketio_connection()

    # Show simulation of real-time updates
    simulate_real_time_updates()

    print("\n✅ Socket.IO testing complete!")
    print("\n📚 Integration Summary:")
    print("   🔗 Webhooks: External integrations, reliable delivery")
    print("   ⚡ WebSockets: Instant UI updates, real-time sync")
    print("   🎯 Data Field: No more API calls for UI updates!")
    print("   🏠 Rooms: Targeted updates for specific features")

if __name__ == "__main__":
    main()