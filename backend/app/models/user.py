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

    # Relationships
    requested_tickets = db.relationship('Ticket', foreign_keys='Ticket.requester_id', back_populates='requester')
    assigned_tickets = db.relationship('Ticket', foreign_keys='Ticket.assignee_id', back_populates='assignee')
    comments = db.relationship('Comment', back_populates='author')
    articles = db.relationship('KnowledgeBaseArticle', back_populates='author')
    notifications = db.relationship('Notification', back_populates='user')

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    def check_password(self, password):
        if not self.password_hash:
            return False
        return bcrypt.checkpw(password.encode(), self.password_hash.encode())
