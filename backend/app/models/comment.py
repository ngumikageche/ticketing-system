from app.models.base import BaseModel, db
from sqlalchemy.dialects.postgresql import UUID as PG_UUID


class Comment(BaseModel):
    __tablename__ = 'comments'

    content = db.Column(db.Text, nullable=False)
    ticket_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('tickets.id'), nullable=False)
    author_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    parent_comment_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('comments.id'), nullable=True)  # For replies

    ticket = db.relationship('Ticket', back_populates='comments')
    author = db.relationship('User', back_populates='comments')
    parent_comment = db.relationship('Comment', remote_side='Comment.id', backref='replies')  # Self-referential for threading
    # Media attachments for this comment
    media = db.relationship('Media', back_populates='comment', cascade='all, delete-orphan')

    def to_dict(self, exclude=None, include=None):
        data = super().to_dict(exclude, include)
        # Map parent_comment_id to parent_message_id for frontend compatibility
        if 'parent_comment_id' in data:
            data['parent_message_id'] = data.pop('parent_comment_id')
        return data
