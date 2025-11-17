from app.models.base import BaseModel, db
from sqlalchemy.dialects.postgresql import UUID as PG_UUID


class ConversationParticipant(BaseModel):
    __tablename__ = 'conversation_participants'

    conversation_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('conversations.id'), nullable=False)
    user_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    role = db.Column(db.String(20), default='member', nullable=False)  # admin, member

    # Relationships
    conversation = db.relationship('Conversation', back_populates='participants')
    user = db.relationship('User', back_populates='conversation_participations')

    __table_args__ = (
        db.UniqueConstraint('conversation_id', 'user_id', name='unique_conversation_user'),
    )