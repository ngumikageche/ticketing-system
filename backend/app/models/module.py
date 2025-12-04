from app.models.base import BaseModel, db
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import uuid


class Module(BaseModel):
    __tablename__ = 'modules'

    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True)

    # Relationships
    tickets = db.relationship('Ticket', back_populates='module', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': str(self.id),
            'name': self.name,
            'description': self.description,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<Module {self.name}>'