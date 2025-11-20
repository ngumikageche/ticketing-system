from app.models.base import BaseModel, db
from sqlalchemy.dialects.postgresql import UUID as PG_UUID


class MessageReadStatus(BaseModel):
    __tablename__ = 'message_read_status'

    message_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('messages.id'), nullable=False)
    user_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    read_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now(), nullable=False)

    # Relationships
    message = db.relationship('Message', backref='read_statuses')
    user = db.relationship('User', backref='message_read_statuses')

    __table_args__ = (
        db.UniqueConstraint('message_id', 'user_id', name='unique_message_user_read'),
    )