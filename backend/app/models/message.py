from app.models.base import BaseModel, db
from sqlalchemy.dialects.postgresql import UUID as PG_UUID


class Message(BaseModel):
    __tablename__ = 'messages'

    conversation_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('conversations.id'), nullable=False)
    sender_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    message_type = db.Column(db.String(20), default='text', nullable=False)  # text, file, system
    parent_message_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('messages.id'), nullable=True)  # For reply threading

    # Relationships
    conversation = db.relationship('Conversation', back_populates='messages')
    sender = db.relationship('User', back_populates='messages')
    parent_message = db.relationship('Message', remote_side='Message.id', backref='replies')  # Self-referential for threading