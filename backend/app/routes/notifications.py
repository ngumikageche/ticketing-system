from flask import Blueprint, request, jsonify, abort
from app.models.notification import Notification
from app.models.user import User
from flask_jwt_extended import jwt_required, get_jwt_identity
import uuid
from app import cache

notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('/', methods=['GET'])
@cache.cached(timeout=60, key_prefix='notifications_list')
@jwt_required()
def list_notifications():
    identity = get_jwt_identity()
    try:
        user_id = uuid.UUID(identity)
    except ValueError:
        abort(401, 'invalid token')
    notifications = Notification.active().filter_by(user_id=user_id).order_by(Notification.created_at.desc()).all()
    return jsonify([n.to_dict() for n in notifications])


@notifications_bp.route('/<id_>/read', methods=['POST'])
@jwt_required()
def mark_as_read(id_):
    identity = get_jwt_identity()
    try:
        user_id = uuid.UUID(identity)
    except ValueError:
        abort(401, 'invalid token')
    notification = Notification.query.filter_by(id=id_, user_id=user_id).first()
    if not notification:
        abort(404, 'notification not found')
    notification.is_read = True
    notification.save()
    # Invalidate cache
    cache.delete('notifications_list')
    return jsonify(notification.to_dict())


@notifications_bp.route('/<id_>', methods=['DELETE'])
@jwt_required()
def delete_notification(id_):
    identity = get_jwt_identity()
    try:
        user_id = uuid.UUID(identity)
    except ValueError:
        abort(401, 'invalid token')
    notification = Notification.query.filter_by(id=id_, user_id=user_id).first()
    if not notification:
        abort(404, 'notification not found')
    notification.delete(soft=True)
    # Invalidate cache
    cache.delete('notifications_list')
    return '', 204


# Webhook receiver endpoints
@notifications_bp.route('/webhooks/notifications', methods=['POST'])
def receive_webhook():
    """Receive webhook notifications from external sources."""
    data = request.get_json() or {}
    
    # Validate webhook payload
    if 'event' not in data or 'notification' not in data:
        abort(400, 'invalid webhook payload')
    
    event = data['event']
    notification_data = data['notification']
    
    # For now, just log the webhook (you can extend this to store webhooks,
    # trigger real-time updates, etc.)
    from flask import current_app
    current_app.logger.info(f"Received webhook: {event} - {notification_data}")
    
    # You could store webhook data, broadcast to WebSocket clients, etc.
    # For example:
    # webhook_store.append(data)  # Store in memory or database
    # socketio.emit('notification', data)  # Broadcast to connected clients
    
    return jsonify({'status': 'received'}), 200


@notifications_bp.route('/webhooks/test', methods=['POST'])
@jwt_required()
def test_webhook():
    """Test endpoint for users to verify their webhook URL works."""
    identity = get_jwt_identity()
    try:
        user_id = uuid.UUID(identity)
    except ValueError:
        abort(401, 'invalid token')
    
    user = User.query.filter_by(id=user_id).first()
    if not user or not user.webhook_url:
        abort(400, 'no webhook URL configured')
    
    # Send a test webhook to the user's configured URL
    from app.hooks import send_webhook_notification
    from app.models.notification import Notification
    
    # Create a test notification
    test_notification = Notification(
        user_id=user_id,
        type='webhook_test',
        message='This is a test webhook notification',
        related_type='test'
    )
    # Don't save it to DB, just use it for webhook testing
    test_notification.id = 'test-' + str(user_id)  # Fake ID for testing
    
    try:
        send_webhook_notification(test_notification)
        return jsonify({'status': 'test webhook sent'}), 200
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f"Test webhook failed: {e}")
        abort(500, 'failed to send test webhook')