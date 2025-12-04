from app.models.base import BaseModel, db
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import json


class ServerMonitor(BaseModel):
    __tablename__ = 'server_monitors'

    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)

    # API credentials for accessing the monitoring data
    api_key = db.Column(db.Text, nullable=False)  # API key for authentication
    api_secret = db.Column(db.Text)  # Optional additional secret

    # Server information
    server_ip = db.Column(db.String(45))  # IPv4 or IPv6 address for whitelisting

    # Monitoring service configuration
    endpoint_url = db.Column(db.String(500))  # Optional endpoint for receiving data

    # Resources to monitor (JSON array)
    monitored_resources = db.Column(db.JSON, default=['cpu', 'ram', 'storage', 'network'])

    # Monitoring settings
    check_interval = db.Column(db.Integer, default=60)  # seconds
    alert_thresholds = db.Column(db.JSON, default={
        'cpu': 80,
        'ram': 85,
        'storage': 90,
        'network': 1000000000  # 1GB/s
    })

    # Status
    is_active = db.Column(db.Boolean, default=True)
    last_check_at = db.Column(db.DateTime(timezone=True))

    # Relationships
    user_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    user = db.relationship('User', backref='server_monitors')

    def to_dict(self, exclude=None, include=None):
        """Override to exclude sensitive fields"""
        exclude = exclude or set()
        exclude.update({'api_key', 'api_secret'})
        return super().to_dict(exclude=exclude, include=include)

    def set_api_credentials(self, api_key, api_secret=None):
        """Set API credentials"""
        self.api_key = api_key
        if api_secret:
            self.api_secret = api_secret

    def get_monitored_resources_list(self):
        """Return monitored resources as a list"""
        if isinstance(self.monitored_resources, str):
            return json.loads(self.monitored_resources)
        return self.monitored_resources or []

    def set_monitored_resources(self, resources):
        """Set monitored resources from a list"""
        if isinstance(resources, list):
            self.monitored_resources = resources
        else:
            self.monitored_resources = [resources]