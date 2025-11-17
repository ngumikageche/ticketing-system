#!/usr/bin/env python3
"""
Webhook Testing and UI Update Script

This script demonstrates how to test the comprehensive webhook system
and provides examples for triggering UI updates when notifications are received.

Usage:
    python test_webhooks.py

Requirements:
    - Flask app running
    - Database initialized
    - At least one user with webhook URL configured
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5000"
API_PREFIX = "/api"

def login_and_get_token(email="admin@nextek.co.ke", password="pa55word"):
    """Login and get JWT token"""
    response = requests.post(f"{BASE_URL}{API_PREFIX}/auth/login", json={
        "email": email,
        "password": password
    })

    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Login failed: {response.text}")
        return None

def set_webhook_url(token, webhook_url="/api/notifications/webhooks/notifications"):
    """Configure webhook URL for current user"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.put(f"{BASE_URL}{API_PREFIX}/users/me/webhook",
                          json={"webhook_url": webhook_url},
                          headers=headers)

    if response.status_code == 200:
        print(f"✅ Webhook URL configured: {webhook_url}")
        return True
    else:
        print(f"Failed to set webhook: {response.text}")
        return False

def test_webhook(token):
    """Send test webhook"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}{API_PREFIX}/notifications/webhooks/test",
                           headers=headers)

    if response.status_code == 200:
        print("✅ Test webhook sent successfully")
        return True
    else:
        print(f"Failed to send test webhook: {response.text}")
        return False

def create_ticket(token, subject="Test Ticket", description="Testing webhook system"):
    """Create a test ticket to trigger notifications"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}{API_PREFIX}/tickets/",
                           json={"subject": subject, "description": description},
                           headers=headers)

    if response.status_code == 201:
        ticket = response.json()
        print(f"✅ Ticket created: {ticket['subject']} (ID: {ticket['id']})")
        return ticket
    else:
        print(f"Failed to create ticket: {response.text}")
        return None

def create_comment(token, ticket_id, content="Test comment for webhook testing"):
    """Create a comment to trigger webhook"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}{API_PREFIX}/tickets/{ticket_id}/comments",
                           json={"content": content},
                           headers=headers)

    if response.status_code == 201:
        comment = response.json()
        print(f"✅ Comment created on ticket {ticket_id}")
        return comment
    else:
        print(f"Failed to create comment: {response.text}")
        return None

def create_kb_article(token, title="Test KB Article", content="Testing webhook system"):
    """Create a KB article to trigger webhook"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}{API_PREFIX}/kb/",
                           json={"title": title, "content": content},
                           headers=headers)

    if response.status_code == 201:
        article = response.json()
        print(f"✅ KB Article created: {article['title']} (ID: {article['id']})")
        return article
    else:
        print(f"Failed to create KB article: {response.text}")
        return None

def get_notifications(token):
    """Get current user's notifications"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}{API_PREFIX}/notifications/",
                          headers=headers)

    if response.status_code == 200:
        notifications = response.json()
        print(f"📨 Current notifications: {len(notifications)} total")
        for notification in notifications[-5:]:  # Show last 5
            print(f"  - {notification['type']}: {notification['message']}")
        return notifications
    else:
        print(f"Failed to get notifications: {response.text}")
        return []

def simulate_enhanced_webhook_handling(notifications):
    """Simulate how frontend handles enhanced webhooks with data"""
    print("\n🎨 Enhanced Webhook Handling Simulation:")
    print("=" * 50)
    
    # Mock collections that would be in frontend state
    tickets = []
    comments = []
    users = []
    
    for notification in notifications:
        print(f"\n📨 Processing: {notification['type']}")
        
        # Simulate webhook payload with data (based on notification type)
        mock_data = None
        if notification['type'] in ['ticket_updated', 'new_ticket']:
            mock_data = {
                'id': notification['related_id'],
                'subject': 'Updated Ticket Subject',
                'status': 'in_progress',
                'assignee_id': 'user-123',
                'updated_at': datetime.now().isoformat()
            }
            # Update tickets collection
            existing_ticket = next((t for t in tickets if t['id'] == mock_data['id']), None)
            if existing_ticket:
                tickets = [t if t['id'] != mock_data['id'] else mock_data for t in tickets]
                print(f"   🔄 Updated ticket {mock_data['id']} in collection")
            else:
                tickets.append(mock_data)
                print(f"   ➕ Added new ticket {mock_data['id']} to collection")
                
        elif 'comment' in notification['type']:
            mock_data = {
                'id': notification['related_id'],
                'content': 'Updated comment content',
                'author_id': 'user-456',
                'ticket_id': 'ticket-789',
                'updated_at': datetime.now().isoformat()
            }
            # Update comments collection
            existing_comment = next((c for c in comments if c['id'] == mock_data['id']), None)
            if existing_comment:
                comments = [c if c['id'] != mock_data['id'] else mock_data for c in comments]
                print(f"   🔄 Updated comment {mock_data['id']} in collection")
            else:
                comments.append(mock_data)
                print(f"   ➕ Added new comment {mock_data['id']} to collection")
    
    print("\n📊 Final Collections State:")
    print(f"   Tickets: {len(tickets)} items")
    print(f"   Comments: {len(comments)} items")
    print(f"   Users: {len(users)} items")
    
    print("\n✅ No API calls needed - data updated in real-time!")

def main():
    """Main testing function"""
    print("🚀 Webhook Testing and UI Update Script")
    print("=" * 50)

    # Step 1: Login
    print("\n1. Logging in...")
    token = login_and_get_token()
    if not token:
        print("❌ Cannot proceed without authentication")
        return

    # Step 2: Configure webhook
    print("\n2. Configuring webhook URL...")
    if not set_webhook_url(token):
        print("❌ Cannot proceed without webhook configuration")
        return

    # Step 3: Test webhook
    print("\n3. Testing webhook delivery...")
    test_webhook(token)

    # Step 4: Create test data to trigger real webhooks
    print("\n4. Creating test data to trigger webhooks...")

    # Create a ticket
    ticket = create_ticket(token, "Webhook Test Ticket", "Testing the comprehensive webhook system")
    if ticket:
        # Create a comment on the ticket
        create_comment(token, ticket['id'], "This comment should trigger a webhook notification")

    # Create a KB article
    create_kb_article(token, "Webhook Testing Guide", "How to test the webhook system")

    # Wait a moment for webhooks to be processed
    print("\n⏳ Waiting for webhooks to be processed...")
    time.sleep(2)

    # Step 5: Check notifications
    print("\n5. Checking received notifications...")
    notifications = get_notifications(token)

    # Step 6: Simulate enhanced UI updates
    if notifications:
        simulate_enhanced_webhook_handling(notifications)

    print("\n✅ Webhook testing complete!")
    print("\n📚 Next Steps:")
    print("  - Check your application logs for webhook delivery confirmations")
    print("  - Implement the webhook receiver endpoint in your frontend")
    print("  - Add real-time UI updates when webhooks are received")
    print("  - Consider adding WebSocket support for even more real-time features")

if __name__ == "__main__":
    main()