from app.models.base import BaseModel, db
import bcrypt
from sqlalchemy.dialects.postgresql import UUID as PG_UUID


class User(BaseModel):
    __tablename__ = 'users'

    email = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(100))
    password_hash = db.Column(db.String(255))
    role = db.Column(db.String(20), default='CUSTOMER')
    webhook_url = db.Column(db.String(500))  # Optional webhook URL for real-time notifications
    is_active = db.Column(db.Boolean, default=True)
    
    # Security questions for signup
    security_question = db.Column(db.String(200), nullable=True)
    security_answer_hash = db.Column(db.String(255), nullable=True)

    # Relationships
    requested_tickets = db.relationship('Ticket', foreign_keys='Ticket.requester_id', back_populates='requester')
    assigned_tickets = db.relationship('Ticket', foreign_keys='Ticket.assignee_id', back_populates='assignee')
    comments = db.relationship('Comment', back_populates='author')
    messages = db.relationship('Message', back_populates='sender')
    articles = db.relationship('KnowledgeBaseArticle', back_populates='author')
    notifications = db.relationship('Notification', back_populates='user')
    conversation_participations = db.relationship('ConversationParticipant', back_populates='user')
    testing_sessions = db.relationship('Testing', back_populates='tester')
    # Optional profile media (e.g., avatar) and other media they own
    # Single FK to a media record used as the user's profile picture
    profile_media_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('media.id'), nullable=True)
    profile_media = db.relationship('Media', foreign_keys=[profile_media_id], post_update=True)

    # Media owned by this user (e.g., uploaded files), as generic media attachments
    media = db.relationship('Media', foreign_keys='Media.user_id', back_populates='owner_user', cascade='all, delete-orphan')

    # Media uploaded by this user (uploader relation) - optional reverse relation
    uploaded_media = db.relationship('Media', foreign_keys='Media.uploaded_by', back_populates='uploader', cascade='none')

    # User settings
    settings = db.relationship('UserSettings', back_populates='user', uselist=False, cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    def check_password(self, password):
        if not self.password_hash:
            return False
        return bcrypt.checkpw(password.encode(), self.password_hash.encode())

    def set_security_answer(self, answer):
        self.security_answer_hash = bcrypt.hashpw(answer.lower().strip().encode(), bcrypt.gensalt()).decode()

    def check_security_answer(self, answer):
        if not self.security_answer_hash:
            return False
        return bcrypt.checkpw(answer.lower().strip().encode(), self.security_answer_hash.encode())

    def to_dict(self, exclude=None, include=None):
        """Override to exclude sensitive fields"""
        exclude = exclude or set()
        exclude.update({'password_hash', 'security_answer_hash'})
        return super().to_dict(exclude=exclude, include=include)
