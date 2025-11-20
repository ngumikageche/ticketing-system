from app.models.base import BaseModel, db
from sqlalchemy.dialects.postgresql import UUID as PG_UUID


class Notification(BaseModel):
    __tablename__ = 'notifications'

    user_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)  # Recipient
    type = db.Column(db.String(50), nullable=False)  # e.g., 'comment_on_ticket', 'ticket_assigned'
    message = db.Column(db.Text, nullable=False)
    related_id = db.Column(PG_UUID(as_uuid=True), nullable=True)  # ID of related entity (e.g., comment_id, ticket_id)
    related_type = db.Column(db.String(50), nullable=True)  # e.g., 'comment', 'ticket'
    conversation_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('conversations.id'), nullable=True)  # For message notifications
    conversation_title = db.Column(db.String(200), nullable=True)  # Cached title for display
    is_read = db.Column(db.Boolean, default=False)

    # Relationship to user
    user = db.relationship('User', back_populates='notifications')
    conversation = db.relationship('Conversation', foreign_keys=[conversation_id])

    def to_dict(self):
        data = super().to_dict()
        # Include limited user info for notifications (exclude sensitive data)
        if self.user:
            data['user'] = {
                'id': str(self.user.id),
                'name': self.user.name,
                'email': self.user.email,
                'role': self.user.role,
                'is_active': self.user.is_active,
                'created_at': self.user.created_at.isoformat() + 'Z' if self.user.created_at else None,
                'updated_at': self.user.updated_at.isoformat() + 'Z' if self.user.updated_at else None
            }
        else:
            data['user'] = None
        data['conversation_id'] = str(self.conversation_id) if self.conversation_id else None
        data['conversation_title'] = self.conversation_title
        return data