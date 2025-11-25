from flask import Blueprint, request, jsonify
from app.models.user_settings import UserSettings
from app.models.user import User
from flask_jwt_extended import jwt_required, get_jwt_identity
import uuid


settings_bp = Blueprint('settings', __name__)


def filter_settings_data(settings_dict):
    """Filter out database metadata and return only settings fields"""
    # Fields to exclude (database metadata)
    exclude_fields = {'id', 'user_id', 'created_at', 'updated_at', 'is_deleted', 'deleted_at'}
    
    # Return only the settings fields, excluding metadata
    return {k: v for k, v in settings_dict.items() if k not in exclude_fields}


@settings_bp.route('/', methods=['GET'])
@jwt_required()
def get_settings():
    """Get current user's settings"""
    identity = get_jwt_identity()
    try:
        user_id = uuid.UUID(identity)
    except ValueError:
        return jsonify({'error': 'Invalid token'}), 401

    user = User.query.filter_by(id=user_id).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Get or create settings
    if not user.settings:
        settings = UserSettings(user_id=user_id)
        settings.save()
    else:
        settings = user.settings

    # Return settings without metadata
    response_data = {
        'settings': settings.settings or {},
        'theme': settings.theme,
        'language': settings.language,
        'timezone': settings.timezone,
        'notifications_enabled': settings.notifications_enabled,
        'email_notifications': settings.email_notifications,
        'items_per_page': settings.items_per_page,
        'auto_refresh_interval': settings.auto_refresh_interval,
        'compact_mode': settings.compact_mode,
        'sidebar_collapsed': settings.sidebar_collapsed,
        'sound_notifications': settings.sound_notifications,
        'browser_notifications': settings.browser_notifications,
        'ticket_sort_order': settings.ticket_sort_order,
        'ticket_auto_refresh': settings.ticket_auto_refresh,
        'default_dashboard_view': settings.default_dashboard_view,
        'show_chart_animations': settings.show_chart_animations,
        'message_preview_length': settings.message_preview_length,
        'show_read_receipts': settings.show_read_receipts,
        'auto_scroll_messages': settings.auto_scroll_messages,
        'kb_view_mode': settings.kb_view_mode,
        'show_article_previews': settings.show_article_previews,
        'date_format': settings.date_format,
        'time_format': settings.time_format,
    }
    # Remove None values
    response_data = {k: v for k, v in response_data.items() if v is not None}
    return jsonify(response_data)


@settings_bp.route('/', methods=['PUT'])
@jwt_required()
def update_settings():
    """Update current user's settings"""
    identity = get_jwt_identity()
    try:
        user_id = uuid.UUID(identity)
    except ValueError:
        return jsonify({'error': 'Invalid token'}), 401

    user = User.query.filter_by(id=user_id).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Get or create settings
    if not user.settings:
        settings = UserSettings(user_id=user_id)
    else:
        settings = user.settings

    # Update dedicated fields
    if 'theme' in data:
        settings.theme = data['theme']
    if 'language' in data:
        settings.language = data['language']
    if 'timezone' in data:
        settings.timezone = data['timezone']
    if 'notifications_enabled' in data:
        settings.notifications_enabled = data['notifications_enabled']
    if 'email_notifications' in data:
        settings.email_notifications = data['email_notifications']
    if 'items_per_page' in data:
        settings.items_per_page = data['items_per_page']
    if 'auto_refresh_interval' in data:
        settings.auto_refresh_interval = data['auto_refresh_interval']
    
    # Additional UI/UX settings
    if 'compact_mode' in data:
        settings.compact_mode = data['compact_mode']
    if 'sidebar_collapsed' in data:
        settings.sidebar_collapsed = data['sidebar_collapsed']
    if 'sound_notifications' in data:
        settings.sound_notifications = data['sound_notifications']
    if 'browser_notifications' in data:
        settings.browser_notifications = data['browser_notifications']
    
    # Ticket-specific settings
    if 'ticket_sort_order' in data:
        settings.ticket_sort_order = data['ticket_sort_order']
    if 'ticket_auto_refresh' in data:
        settings.ticket_auto_refresh = data['ticket_auto_refresh']
    
    # Dashboard settings
    if 'default_dashboard_view' in data:
        settings.default_dashboard_view = data['default_dashboard_view']
    if 'show_chart_animations' in data:
        settings.show_chart_animations = data['show_chart_animations']
    
    # Conversation settings
    if 'message_preview_length' in data:
        settings.message_preview_length = data['message_preview_length']
    if 'show_read_receipts' in data:
        settings.show_read_receipts = data['show_read_receipts']
    if 'auto_scroll_messages' in data:
        settings.auto_scroll_messages = data['auto_scroll_messages']
    
    # KB settings
    if 'kb_view_mode' in data:
        settings.kb_view_mode = data['kb_view_mode']
    if 'show_article_previews' in data:
        settings.show_article_previews = data['show_article_previews']
    
    # Date/Time format preferences
    if 'date_format' in data:
        settings.date_format = data['date_format']
    if 'time_format' in data:
        settings.time_format = data['time_format']

    # Update JSON settings
    if 'settings' in data and isinstance(data['settings'], dict):
        settings.settings.update(data['settings'])

    settings.save()

    # Return the updated settings without metadata
    response_data = {
        'settings': settings.settings or {},
        'theme': settings.theme,
        'language': settings.language,
        'timezone': settings.timezone,
        'notifications_enabled': settings.notifications_enabled,
        'email_notifications': settings.email_notifications,
        'items_per_page': settings.items_per_page,
        'auto_refresh_interval': settings.auto_refresh_interval,
        'compact_mode': settings.compact_mode,
        'sidebar_collapsed': settings.sidebar_collapsed,
        'sound_notifications': settings.sound_notifications,
        'browser_notifications': settings.browser_notifications,
        'ticket_sort_order': settings.ticket_sort_order,
        'ticket_auto_refresh': settings.ticket_auto_refresh,
        'default_dashboard_view': settings.default_dashboard_view,
        'show_chart_animations': settings.show_chart_animations,
        'message_preview_length': settings.message_preview_length,
        'show_read_receipts': settings.show_read_receipts,
        'auto_scroll_messages': settings.auto_scroll_messages,
        'kb_view_mode': settings.kb_view_mode,
        'show_article_previews': settings.show_article_previews,
        'date_format': settings.date_format,
        'time_format': settings.time_format,
    }
    # Remove None values
    response_data = {k: v for k, v in response_data.items() if v is not None}
    return jsonify(response_data)


@settings_bp.route('/<key>', methods=['GET'])
@jwt_required()
def get_setting(key):
    """Get a specific setting value"""
    identity = get_jwt_identity()
    try:
        user_id = uuid.UUID(identity)
    except ValueError:
        return jsonify({'error': 'Invalid token'}), 401

    user = User.query.filter_by(id=user_id).first()
    if not user or not user.settings:
        return jsonify({'error': 'Setting not found'}), 404

    value = user.settings.get_setting(key)
    if value is None:
        return jsonify({'error': 'Setting not found'}), 404

    return jsonify({'key': key, 'value': value})


@settings_bp.route('/<key>', methods=['PUT'])
@jwt_required()
def set_setting(key):
    """Set a specific setting value"""
    identity = get_jwt_identity()
    try:
        user_id = uuid.UUID(identity)
    except ValueError:
        return jsonify({'error': 'Invalid token'}), 401

    data = request.get_json()
    if 'value' not in data:
        return jsonify({'error': 'Value required'}), 400

    user = User.query.filter_by(id=user_id).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Get or create settings
    if not user.settings:
        settings = UserSettings(user_id=user_id)
    else:
        settings = user.settings

    settings.set_setting(key, data['value'])
    settings.save()

    return jsonify({'key': key, 'value': data['value']})