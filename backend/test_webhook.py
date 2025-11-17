#!/usr/bin/env python3
"""Test webhook functionality."""

import sys
import os

# Add project root to path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Load environment variables
from dotenv import load_dotenv
load_dotenv(os.path.join(PROJECT_ROOT, '.env'))

# Set DATABASE_URL directly for testing
os.environ['DATABASE_URL'] = 'postgresql://future:future_dev@localhost:5432/sts'

print(f"DATABASE_URL: {os.getenv('DATABASE_URL')}")

from app import create_app
from app.models.user import User
from app.models.ticket import Ticket
from app.models.comment import Comment
from app.models.notification import Notification
from app.hooks import send_comment_created

def test_webhook():
    app = create_app()

    with app.app_context():
        # Get a user and set webhook URL
        user = User.query.filter_by(email='admin@nextek.co.ke').first()
        if not user:
            print("User not found")
            return

        print(f"User: {user.email}")
        user.webhook_url = '/api/notifications/webhooks/notifications'
        user.save()
        print(f"Set webhook URL: {user.webhook_url}")

        # Get a ticket
        ticket = Ticket.query.first()
        if not ticket:
            print("No tickets found")
            return

        print(f"Ticket: {ticket.subject}")

        # Create a comment to trigger webhook
        initial_count = Notification.query.count()
        print(f"Initial notification count: {initial_count}")

        comment = Comment(
            content="Test webhook comment",
            ticket_id=ticket.id,
            author_id=user.id
        )
        comment.save()
        print(f"Created comment: {comment.id}")

        # Trigger the hook manually (normally done in API routes)
        send_comment_created(comment)

        final_count = Notification.query.count()
        print(f"Final notification count: {final_count}")
        print(f"Notifications created: {final_count - initial_count}")

        # Check notifications
        notifications = Notification.query.filter_by(user_id=user.id).order_by(Notification.created_at.desc()).limit(3).all()
        for n in notifications:
            print(f"Notification: {n.type} - {n.message}")

if __name__ == '__main__':
    test_webhook()