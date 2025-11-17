from app.models.base import BaseModel, db
from sqlalchemy.dialects.postgresql import UUID as PG_UUID


class Notification(BaseModel):
    __tablename__ = 'notifications'

    user_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)  # Recipient
    type = db.Column(db.String(50), nullable=False)  # e.g., 'comment_on_ticket', 'ticket_assigned'
    message = db.Column(db.Text, nullable=False)
    related_id = db.Column(PG_UUID(as_uuid=True), nullable=True)  # ID of related entity (e.g., comment_id, ticket_id)
    related_type = db.Column(db.String(50), nullable=True)  # e.g., 'comment', 'ticket'
    is_read = db.Column(db.Boolean, default=False)

    # Relationship to user
    user = db.relationship('User', back_populates='notifications')

    def to_dict(self):
        data = super().to_dict()
        data['user'] = self.user.to_dict() if self.user else None
        return data