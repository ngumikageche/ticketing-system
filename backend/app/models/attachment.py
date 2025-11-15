from app.models.base import BaseModel, db
from sqlalchemy.dialects.postgresql import UUID as PG_UUID


class Attachment(BaseModel):
    __tablename__ = 'attachments'

    filename = db.Column(db.String(255), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    type = db.Column(db.String(20), default='OTHER')
    size = db.Column(db.Integer)
    ticket_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('tickets.id'), nullable=False)
    uploaded_by = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)

    ticket = db.relationship('Ticket', back_populates='attachments')
    uploader = db.relationship('User')
