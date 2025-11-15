from app.models.base import BaseModel, db
from sqlalchemy.dialects.postgresql import UUID as PG_UUID


class Ticket(BaseModel):
    __tablename__ = 'tickets'

    ticket_id = db.Column(db.String(20), unique=True, nullable=False)  # e.g. #1245
    subject = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default='OPEN')
    priority = db.Column(db.String(20), default='MEDIUM')
    requester_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    assignee_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('users.id'))

    # Relationships
    requester = db.relationship('User', foreign_keys=[requester_id], back_populates='requested_tickets')
    assignee = db.relationship('User', foreign_keys=[assignee_id], back_populates='assigned_tickets')
    comments = db.relationship('Comment', back_populates='ticket', cascade='all, delete-orphan')
    attachments = db.relationship('Attachment', back_populates='ticket', cascade='all, delete-orphan')

    __table_args__ = (
        db.Index('ix_tickets_status', 'status'),
        db.Index('ix_tickets_priority', 'priority'),
        db.Index('ix_tickets_created', 'created_at'),
    )
