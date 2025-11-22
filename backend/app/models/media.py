from app.models.base import BaseModel, db
from sqlalchemy.dialects.postgresql import UUID as PG_UUID


class Media(BaseModel):
    """
    Central media model to store file metadata for various objects:
    - Ticket attachments
    - Conversation / Message attachments
    - Comment attachments
    - Knowledge Base attachments
    - User profile media

    We intentionally store both Cloudinary metadata (public_id, urls)
    and local metadata (filename, mime_type, size). The application should
    use Cloudinary for storage and populate the metadata here.
    """
    __tablename__ = 'media'

    filename = db.Column(db.String(255), nullable=False)  # original filename
    mime_type = db.Column(db.String(100), nullable=True)
    size = db.Column(db.Integer, nullable=True)
    # Cloudinary metadata
    cloudinary_public_id = db.Column(db.String(255), nullable=True)
    url = db.Column(db.String(500), nullable=True)
    secure_url = db.Column(db.String(500), nullable=True)
    resource_type = db.Column(db.String(50), default='raw')
    width = db.Column(db.Integer, nullable=True)
    height = db.Column(db.Integer, nullable=True)
    format = db.Column(db.String(50), nullable=True)
    alt_text = db.Column(db.String(255), nullable=True)

    # References to the object this media belongs to (nullable)
    ticket_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('tickets.id'), nullable=True)
    conversation_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('conversations.id'), nullable=True)
    message_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('messages.id'), nullable=True)
    comment_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('comments.id'), nullable=True)
    kb_article_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('kb_articles.id'), nullable=True)
    testing_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('testing.id'), nullable=True)
    user_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=True)

    # Who uploaded the file
    uploaded_by = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)

    # Relationships
    ticket = db.relationship('Ticket', back_populates='media')
    conversation = db.relationship('Conversation', back_populates='media')
    message = db.relationship('Message', back_populates='media')
    comment = db.relationship('Comment', back_populates='media')
    kb_article = db.relationship('KnowledgeBaseArticle', back_populates='media')
    testing = db.relationship('Testing', back_populates='media')
    owner_user = db.relationship('User', foreign_keys=[user_id], back_populates='media')
    uploader = db.relationship('User', foreign_keys=[uploaded_by], back_populates='uploaded_media')

    __table_args__ = (
        db.Index('ix_media_ticket_id', 'ticket_id'),
        db.Index('ix_media_conversation_id', 'conversation_id'),
        db.Index('ix_media_message_id', 'message_id'),
        db.Index('ix_media_comment_id', 'comment_id'),
        db.Index('ix_media_kb_article_id', 'kb_article_id'),
        db.Index('ix_media_user_id', 'user_id'),
        db.Index('ix_media_testing_id', 'testing_id'),
    )
