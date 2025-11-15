from app.models.base import BaseModel, db
from sqlalchemy.dialects.postgresql import UUID as PG_UUID


class Comment(BaseModel):
    __tablename__ = 'comments'

    content = db.Column(db.Text, nullable=False)
    ticket_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('tickets.id'), nullable=False)
    author_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)

    ticket = db.relationship('Ticket', back_populates='comments')
    author = db.relationship('User', back_populates='comments')
