from app.models.base import BaseModel, db
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSON
import uuid


class UserSettings(BaseModel):
    __tablename__ = 'user_settings'

    user_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False, unique=True)
    user = db.relationship('User', back_populates='settings')

    # Store settings as JSON for flexibility
    settings = db.Column(JSON, nullable=False, default=dict)

    # Common settings with dedicated columns for performance
    theme = db.Column(db.String(20), default='light')  # light, dark, auto
    language = db.Column(db.String(10), default='en')  # ISO language codes
    timezone = db.Column(db.String(50), default='UTC')
    notifications_enabled = db.Column(db.Boolean, default=True)
    email_notifications = db.Column(db.Boolean, default=True)
    items_per_page = db.Column(db.Integer, default=20)
    auto_refresh_interval = db.Column(db.Integer, default=30)  # seconds
    
    # Additional UI/UX settings
    compact_mode = db.Column(db.Boolean, default=False)
    sidebar_collapsed = db.Column(db.Boolean, default=False)
    sound_notifications = db.Column(db.Boolean, default=True)
    browser_notifications = db.Column(db.Boolean, default=False)
    
    # Ticket-specific settings
    ticket_sort_order = db.Column(db.String(20), default='newest')  # newest, oldest, priority, status
    ticket_auto_refresh = db.Column(db.Boolean, default=True)
    
    # Dashboard settings
    default_dashboard_view = db.Column(db.String(20), default='overview')  # overview, tickets, analytics
    show_chart_animations = db.Column(db.Boolean, default=True)
    
    # Conversation settings
    message_preview_length = db.Column(db.Integer, default=100)
    show_read_receipts = db.Column(db.Boolean, default=True)
    auto_scroll_messages = db.Column(db.Boolean, default=True)
    
    # KB settings
    kb_view_mode = db.Column(db.String(10), default='list')  # list, grid
    show_article_previews = db.Column(db.Boolean, default=True)
    
    # Date/Time format preferences
    date_format = db.Column(db.String(20), default='MM/DD/YYYY')  # MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
    time_format = db.Column(db.String(10), default='24h')  # 12h, 24h

    def __init__(self, user_id=None, **kwargs):
        super().__init__(**kwargs)
        if user_id:
            self.user_id = user_id
        # Initialize default settings
        if not self.settings:
            self.settings = {}

    def get_setting(self, key, default=None):
        """Get a setting value from the JSON field"""
        return self.settings.get(key, default)

    def set_setting(self, key, value):
        """Set a setting value in the JSON field"""
        self.settings[key] = value

    def to_dict(self):
        """Convert to dictionary including both dedicated fields and JSON settings"""
        data = {}
        # Add dedicated fields, excluding metadata
        for attr in ['settings', 'theme', 'language', 'timezone', 'notifications_enabled', 'email_notifications', 'items_per_page', 'auto_refresh_interval', 'compact_mode', 'sidebar_collapsed', 'sound_notifications', 'browser_notifications', 'ticket_sort_order', 'ticket_auto_refresh', 'default_dashboard_view', 'show_chart_animations', 'message_preview_length', 'show_read_receipts', 'auto_scroll_messages', 'kb_view_mode', 'show_article_previews', 'date_format', 'time_format']:
            value = getattr(self, attr)
            if value is not None:
                data[attr] = value
        data['settings'] = self.settings or {}
        return data