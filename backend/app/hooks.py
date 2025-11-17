from collections import defaultdict
from typing import Callable

# Simple hook/signal registry. Other modules can register handlers for events
# like 'comment.created', 'comment.updated', 'comment.deleted'. Handlers
# receive the related model instance as the single positional argument.

_registry: dict[str, list[Callable]] = defaultdict(list)


def register(event: str, func: Callable) -> None:
    """Register a handler for an event."""
    _registry[event].append(func)


def send(event: str, *args, **kwargs) -> None:
    """Send/emit an event to all registered handlers.

    Handlers are called synchronously in registration order. Keep handlers
    fast and side-effect free when possible.
    """
    for fn in list(_registry.get(event, [])):
        try:
            fn(*args, **kwargs)
        except Exception:
            # Do not let a handler error break the caller. In development the
            # exception will be visible in logs; in production consider hooking
            # into a monitoring system here.
            import logging

            logging.exception("Error in hook handler for %s", event)


# Convenience senders
def send_comment_created(comment):
    send('comment.created', comment)


def send_comment_updated(comment):
    send('comment.updated', comment)


def send_comment_deleted(comment):
    send('comment.deleted', comment)


def send_ticket_created(ticket):
    send('ticket.created', ticket)


def send_ticket_updated(ticket):
    send('ticket.updated', ticket)


def send_ticket_deleted(ticket):
    send('ticket.deleted', ticket)


def send_user_created(user):
    send('user.created', user)


def send_user_updated(user):
    send('user.updated', user)


def send_user_deleted(user):
    send('user.deleted', user)


def send_kb_article_created(article):
    send('kb_article.created', article)


def send_kb_article_updated(article):
    send('kb_article.updated', article)


def send_kb_article_deleted(article):
    send('kb_article.deleted', article)


def send_attachment_created(attachment):
    send('attachment.created', attachment)


def send_attachment_updated(attachment):
    send('attachment.updated', attachment)


def send_attachment_deleted(attachment):
    send('attachment.deleted', attachment)


# Default handlers: create notifications when comments change. These are
# registered at import time but can be overridden by calling `register`.
def _default_comment_created_handler(comment):
    # local import to avoid circular imports at module import time
    from app.models.notification import Notification

    ticket = getattr(comment, 'ticket', None)
    author = getattr(comment, 'author', None)
    author_label = (author.name or author.email) if author is not None else 'Someone'

    if ticket is None:
        return

    # Notify ticket requester if not the author
    if ticket.requester_id and str(ticket.requester_id) != str(comment.author_id):
        Notification(
            user_id=ticket.requester_id,
            type='comment_on_ticket',
            message=f'New comment on your ticket "{ticket.subject}" by {author_label}',
            related_id=comment.id,
            related_type='comment'
        ).save()

    # Notify ticket assignee if not the author
    if ticket.assignee_id and str(ticket.assignee_id) != str(comment.author_id):
        Notification(
            user_id=ticket.assignee_id,
            type='comment_on_ticket',
            message=f'New comment on assigned ticket "{ticket.subject}" by {author_label}',
            related_id=comment.id,
            related_type='comment'
        ).save()

    # If replying to a comment, notify the parent comment author if not the same
    parent = getattr(comment, 'parent_comment', None)
    if parent is not None and str(parent.author_id) != str(comment.author_id):
        Notification(
            user_id=parent.author_id,
            type='reply_to_comment',
            message=f'{author_label} replied to your comment on ticket "{ticket.subject}"',
            related_id=comment.id,
            related_type='comment'
        ).save()


def _default_comment_updated_handler(comment):
    from app.models.notification import Notification

    ticket = getattr(comment, 'ticket', None)
    if ticket is None:
        return
    Notification(
        user_id=ticket.requester_id,
        type='comment_updated',
        message=f'A comment on your ticket "{ticket.subject}" was updated',
        related_id=comment.id,
        related_type='comment'
    ).save()
    if ticket.assignee_id:
        Notification(
            user_id=ticket.assignee_id,
            type='comment_updated',
            message=f'A comment on assigned ticket "{ticket.subject}" was updated',
            related_id=comment.id,
            related_type='comment'
        ).save()


def _default_comment_deleted_handler(comment):
    from app.models.notification import Notification

    ticket = getattr(comment, 'ticket', None)
    if ticket is None:
        return
    if ticket.requester_id:
        Notification(
            user_id=ticket.requester_id,
            type='comment_deleted',
            message=f'A comment on your ticket "{ticket.subject}" was deleted',
            related_id=comment.id,
            related_type='comment'
        ).save()
    if ticket.assignee_id:
        Notification(
            user_id=ticket.assignee_id,
            type='comment_deleted',
            message=f'A comment on assigned ticket "{ticket.subject}" was deleted',
            related_id=comment.id,
            related_type='comment'
        ).save()


# Webhook functionality
import requests
from flask import current_app


def send_webhook_notification(notification, data=None):
    """Send a webhook notification to the user's configured webhook URL."""
    user = getattr(notification, 'user', None)
    if not user or not user.webhook_url:
        return

    payload = {
        'event': 'notification.created',
        'notification': {
            'id': str(notification.id),
            'type': notification.type,
            'message': notification.message,
            'related_id': str(notification.related_id) if notification.related_id else None,
            'related_type': notification.related_type,
            'created_at': notification.created_at.isoformat() if notification.created_at else None
        }
    }

    # Include entity data if provided (for real-time UI updates)
    if data:
        payload['data'] = data

    # Emit Socket.IO event for real-time frontend updates
    try:
        from flask import current_app
        socketio = getattr(current_app, 'socketio', None)
        if socketio:
            # Emit to all connected clients
            socketio.emit('notification', payload)
            
            # Also emit to specific rooms based on notification type
            if notification.related_type == 'ticket':
                socketio.emit('ticket.update', payload)
            elif notification.related_type == 'comment':
                socketio.emit('comment.update', payload)
            elif notification.related_type == 'user':
                socketio.emit('user.update', payload)
            elif notification.related_type == 'kb_article':
                socketio.emit('kb.update', payload)
            elif notification.related_type == 'attachment':
                socketio.emit('attachment.update', payload)
                
    except Exception as e:
        current_app.logger.warning(f"Failed to emit Socket.IO event: {e}")

    # Check if webhook URL is internal (points to the same app)
    from flask import current_app, request
    from urllib.parse import urlparse
    
    try:
        parsed_url = urlparse(user.webhook_url)
        # Get current app's host. Accessing `request` may raise if no request
        # context exists, so guard with try/except and fall back to the
        # application's SERVER_NAME or a sensible default.
        try:
            current_host = request.host
        except Exception:
            current_host = current_app.config.get('SERVER_NAME') or 'localhost:5000'
        
        # Check if it's an internal URL
        is_internal = (
            parsed_url.hostname in ['localhost', '127.0.0.1', '0.0.0.0'] or
            parsed_url.hostname == current_host.split(':')[0] or
            user.webhook_url.startswith('/')  # Relative URL
        )
        
        if is_internal and user.webhook_url.startswith('/'):
            # Handle internal relative URLs by calling the endpoint directly
            from flask import current_app
            with current_app.test_client() as client:
                # Remove leading slash for test client
                endpoint = user.webhook_url.lstrip('/')
                response = client.post(
                    f'/{endpoint}',
                    json=payload,
                    headers={'Content-Type': 'application/json'}
                )
                # Werkzeug test client returns a WrapperTestResponse which
                # does not implement raise_for_status(); handle both cases.
                try:
                    if hasattr(response, 'raise_for_status'):
                        response.raise_for_status()
                    else:
                        if getattr(response, 'status_code', 0) >= 400:
                            raise requests.RequestException(f'Internal webhook failed: {response.status_code}')
                except Exception:
                    raise
                current_app.logger.info(f"Internal webhook sent to {user.webhook_url} for notification {notification.id}")
        elif is_internal:
            # For same-host URLs, still use HTTP but log it
            current_app.logger.info(f"Sending webhook to same host: {user.webhook_url}")
            response = requests.post(
                user.webhook_url,
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=5
            )
            response.raise_for_status()
            current_app.logger.info(f"Webhook sent to {user.webhook_url} for notification {notification.id}")
        else:
            # External webhook
            response = requests.post(
                user.webhook_url,
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=5
            )
            response.raise_for_status()
            current_app.logger.info(f"External webhook sent to {user.webhook_url} for notification {notification.id}")
            
    except requests.RequestException as e:
        current_app.logger.warning(f"Failed to send webhook to {user.webhook_url}: {e}")
    except Exception as e:
        current_app.logger.exception(f"Error sending webhook for notification {notification.id}: {e}")


def _send_webhook_for_notification(notification, data=None):
    """Helper to send webhook for a notification (used in default handlers)."""
    try:
        send_webhook_notification(notification, data)
    except Exception as e:
        current_app.logger.exception(f"Error sending webhook for notification {notification.id}: {e}")


# Update default handlers to also send webhooks
def _default_comment_created_handler(comment):
    # local import to avoid circular imports at module import time
    from app.models.notification import Notification

    ticket = getattr(comment, 'ticket', None)
    author = getattr(comment, 'author', None)
    author_label = (author.name or author.email) if author is not None else 'Someone'

    if ticket is None:
        return

    comment_data = comment.to_dict()  # Include full comment data for UI updates

    # Notify ticket requester if not the author
    if ticket.requester_id and str(ticket.requester_id) != str(comment.author_id):
        notification = Notification(
            user_id=ticket.requester_id,
            type='comment_on_ticket',
            message=f'New comment on your ticket "{ticket.subject}" by {author_label}',
            related_id=comment.id,
            related_type='comment'
        )
        notification.save()
        _send_webhook_for_notification(notification, comment_data)

    # Notify ticket assignee if not the author
    if ticket.assignee_id and str(ticket.assignee_id) != str(comment.author_id):
        notification = Notification(
            user_id=ticket.assignee_id,
            type='comment_on_ticket',
            message=f'New comment on assigned ticket "{ticket.subject}" by {author_label}',
            related_id=comment.id,
            related_type='comment'
        )
        notification.save()
        _send_webhook_for_notification(notification, comment_data)

    # If replying to a comment, notify the parent comment author if not the same
    parent = getattr(comment, 'parent_comment', None)
    if parent is not None and str(parent.author_id) != str(comment.author_id):
        notification = Notification(
            user_id=parent.author_id,
            type='reply_to_comment',
            message=f'{author_label} replied to your comment on ticket "{ticket.subject}"',
            related_id=comment.id,
            related_type='comment'
        )
        notification.save()
        _send_webhook_for_notification(notification, comment_data)


def _default_comment_updated_handler(comment):
    from app.models.notification import Notification

    ticket = getattr(comment, 'ticket', None)
    if ticket is None:
        return
    
    comment_data = comment.to_dict()  # Include full comment data for UI updates
    
    if ticket.requester_id:
        notification = Notification(
            user_id=ticket.requester_id,
            type='comment_updated',
            message=f'A comment on your ticket "{ticket.subject}" was updated',
            related_id=comment.id,
            related_type='comment'
        )
        notification.save()
        _send_webhook_for_notification(notification, comment_data)
    
    if ticket.assignee_id:
        notification = Notification(
            user_id=ticket.assignee_id,
            type='comment_updated',
            message=f'A comment on assigned ticket "{ticket.subject}" was updated',
            related_id=comment.id,
            related_type='comment'
        )
        notification.save()
        _send_webhook_for_notification(notification, comment_data)


def _default_comment_deleted_handler(comment):
    from app.models.notification import Notification

    ticket = getattr(comment, 'ticket', None)
    if ticket is None:
        return
    
    if ticket.requester_id:
        notification = Notification(
            user_id=ticket.requester_id,
            type='comment_deleted',
            message=f'A comment on your ticket "{ticket.subject}" was deleted',
            related_id=comment.id,
            related_type='comment'
        )
        notification.save()
        _send_webhook_for_notification(notification)
    
    if ticket.assignee_id:
        notification = Notification(
            user_id=ticket.assignee_id,
            type='comment_deleted',
            message=f'A comment on assigned ticket "{ticket.subject}" was deleted',
            related_id=comment.id,
            related_type='comment'
        )
        notification.save()
        _send_webhook_for_notification(notification)


def _default_ticket_created_handler(ticket):
    from app.models.notification import Notification

    # Notify all admins about new ticket
    from app.models.user import User
    admins = User.active().filter(User.role.ilike('ADMIN')).all()
    for admin in admins:
        notification = Notification(
            user_id=admin.id,
            type='new_ticket',
            message=f'New ticket created: "{ticket.subject}"',
            related_id=ticket.id,
            related_type='ticket'
        )
        notification.save()
        _send_webhook_for_notification(notification)

    # Notify the assignee that they have been assigned this ticket
    if ticket.assignee_id:
        try:
            assignee_notification = Notification(
                user_id=ticket.assignee_id,
                type='ticket_assigned',
                message=f'You have been assigned ticket "{ticket.subject}"',
                related_id=ticket.id,
                related_type='ticket'
            )
            assignee_notification.save()
            _send_webhook_for_notification(assignee_notification, ticket.to_dict())
        except Exception:
            # Ensure hook errors don't break ticket creation flow
            import logging

            logging.exception('error creating assignee notification')


def _default_ticket_updated_handler(ticket):
    from app.models.notification import Notification

    # Notify requester and assignee about ticket updates
    ticket_data = ticket.to_dict()  # Include full ticket data for UI updates
    
    if ticket.requester_id:
        notification = Notification(
            user_id=ticket.requester_id,
            type='ticket_updated',
            message=f'Your ticket "{ticket.subject}" was updated',
            related_id=ticket.id,
            related_type='ticket'
        )
        notification.save()
        _send_webhook_for_notification(notification, ticket_data)

    if ticket.assignee_id:
        notification = Notification(
            user_id=ticket.assignee_id,
            type='ticket_updated',
            message=f'Assigned ticket "{ticket.subject}" was updated',
            related_id=ticket.id,
            related_type='ticket'
        )
        notification.save()
        _send_webhook_for_notification(notification, ticket_data)


def _default_ticket_deleted_handler(ticket):
    from app.models.notification import Notification

    # Notify requester and assignee about ticket deletion
    if ticket.requester_id:
        notification = Notification(
            user_id=ticket.requester_id,
            type='ticket_deleted',
            message=f'Your ticket "{ticket.subject}" was deleted',
            related_id=ticket.id,
            related_type='ticket'
        )
        notification.save()
        _send_webhook_for_notification(notification)

    if ticket.assignee_id:
        notification = Notification(
            user_id=ticket.assignee_id,
            type='ticket_deleted',
            message=f'Assigned ticket "{ticket.subject}" was deleted',
            related_id=ticket.id,
            related_type='ticket'
        )
        notification.save()
        _send_webhook_for_notification(notification)


def _default_user_created_handler(user):
    from app.models.notification import Notification

    # Notify all admins about new user
    from app.models.user import User
    admins = User.active().filter(User.role.ilike('ADMIN')).all()
    user_data = user.to_dict()  # Include full user data for UI updates
    
    for admin in admins:
        notification = Notification(
            user_id=admin.id,
            type='user_created',
            message=f'New user "{user.name or user.email}" was created',
            related_id=user.id,
            related_type='user'
        )
        notification.save()
        _send_webhook_for_notification(notification, user_data)


def _default_user_updated_handler(user):
    from app.models.notification import Notification

    # This could notify relevant users about user updates
    # For now, we'll skip as it's less common to need notifications for user updates
    pass


def _default_user_deleted_handler(user):
    from app.models.notification import Notification

    # Notify all admins about user deactivation
    from app.models.user import User
    admins = User.active().filter(User.role.ilike('ADMIN')).all()
    user_data = user.to_dict()  # Include full user data for UI updates
    
    for admin in admins:
        notification = Notification(
            user_id=admin.id,
            type='user_deactivated',
            message=f'User "{user.name or user.email}" was deactivated',
            related_id=user.id,
            related_type='user'
        )
        notification.save()
        _send_webhook_for_notification(notification, user_data)


def _default_kb_article_created_handler(article):
    from app.models.notification import Notification

    # Notify all users about new KB article (could be filtered by role/tags)
    from app.models.user import User
    users = User.active().all()
    article_data = article.to_dict()  # Include full article data for UI updates
    
    for user in users:
        notification = Notification(
            user_id=user.id,
            type='kb_article_created',
            message=f'New knowledge base article: "{article.title}"',
            related_id=article.id,
            related_type='kb_article'
        )
        notification.save()
        _send_webhook_for_notification(notification, article_data)


def _default_kb_article_updated_handler(article):
    from app.models.notification import Notification

    # Notify users who might be interested in updates
    # For now, skip as KB updates are less critical
    pass


def _default_kb_article_deleted_handler(article):
    from app.models.notification import Notification

    # Notify relevant users about KB article deletion
    # For now, skip as deletions are less common
    pass


def _default_attachment_created_handler(attachment):
    from app.models.notification import Notification

    ticket = getattr(attachment, 'ticket', None)
    if ticket is None:
        return

    attachment_data = attachment.to_dict()  # Include full attachment data for UI updates

    # Notify ticket requester and assignee about new attachment
    if ticket.requester_id:
        notification = Notification(
            user_id=ticket.requester_id,
            type='attachment_added',
            message=f'New attachment "{attachment.filename}" added to ticket "{ticket.subject}"',
            related_id=attachment.id,
            related_type='attachment'
        )
        notification.save()
        _send_webhook_for_notification(notification, attachment_data)

    if ticket.assignee_id:
        notification = Notification(
            user_id=ticket.assignee_id,
            type='attachment_added',
            message=f'New attachment "{attachment.filename}" added to assigned ticket "{ticket.subject}"',
            related_id=attachment.id,
            related_type='attachment'
        )
        notification.save()
        _send_webhook_for_notification(notification, attachment_data)


def _default_attachment_updated_handler(attachment):
    from app.models.notification import Notification

    ticket = getattr(attachment, 'ticket', None)
    if ticket is None:
        return

    # Notify ticket requester and assignee about attachment updates
    if ticket.requester_id:
        notification = Notification(
            user_id=ticket.requester_id,
            type='attachment_updated',
            message=f'Attachment "{attachment.filename}" on ticket "{ticket.subject}" was updated',
            related_id=attachment.id,
            related_type='attachment'
        )
        notification.save()
        _send_webhook_for_notification(notification)

    if ticket.assignee_id:
        notification = Notification(
            user_id=ticket.assignee_id,
            type='attachment_updated',
            message=f'Attachment "{attachment.filename}" on assigned ticket "{ticket.subject}" was updated',
            related_id=attachment.id,
            related_type='attachment'
        )
        notification.save()
        _send_webhook_for_notification(notification)


def _default_attachment_deleted_handler(attachment):
    from app.models.notification import Notification

    ticket = getattr(attachment, 'ticket', None)
    if ticket is None:
        return

    # Notify ticket requester and assignee about attachment deletion
    if ticket.requester_id:
        notification = Notification(
            user_id=ticket.requester_id,
            type='attachment_deleted',
            message=f'Attachment "{attachment.filename}" on ticket "{ticket.subject}" was deleted',
            related_id=attachment.id,
            related_type='attachment'
        )
        notification.save()
        _send_webhook_for_notification(notification)

    if ticket.assignee_id:
        notification = Notification(
            user_id=ticket.assignee_id,
            type='attachment_deleted',
            message=f'Attachment "{attachment.filename}" on assigned ticket "{ticket.subject}" was deleted',
            related_id=attachment.id,
            related_type='attachment'
        )
        notification.save()
        _send_webhook_for_notification(notification)


# Register defaults
register('comment.created', _default_comment_created_handler)
register('comment.updated', _default_comment_updated_handler)
register('comment.deleted', _default_comment_deleted_handler)
register('ticket.created', _default_ticket_created_handler)
register('ticket.updated', _default_ticket_updated_handler)
register('ticket.deleted', _default_ticket_deleted_handler)
register('user.created', _default_user_created_handler)
register('user.updated', _default_user_updated_handler)
register('user.deleted', _default_user_deleted_handler)
register('kb_article.created', _default_kb_article_created_handler)
register('kb_article.updated', _default_kb_article_updated_handler)
register('kb_article.deleted', _default_kb_article_deleted_handler)
register('attachment.created', _default_attachment_created_handler)
register('attachment.updated', _default_attachment_updated_handler)
register('attachment.deleted', _default_attachment_deleted_handler)
