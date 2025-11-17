from app.models.base import BaseModel, db
from sqlalchemy.dialects.postgresql import UUID as PG_UUID


class Conversation(BaseModel):
    __tablename__ = 'conversations'

    type = db.Column(db.String(20), nullable=False)  # ticket, direct, group
    title = db.Column(db.String(200), nullable=True)  # For groups
    ticket_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('tickets.id'), nullable=True)  # For ticket conversations
    created_by_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)

    # Relationships
    ticket = db.relationship('Ticket', back_populates='conversation')
    created_by = db.relationship('User', foreign_keys=[created_by_id])
    participants = db.relationship('ConversationParticipant', back_populates='conversation', cascade='all, delete-orphan')
    messages = db.relationship('Message', back_populates='conversation', cascade='all, delete-orphan')