from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, DateTime, Boolean, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.declarative import declared_attr
import uuid
from datetime import datetime, timezone

try:
    from zoneinfo import ZoneInfo
except Exception:
    ZoneInfo = None

db = SQLAlchemy()


class BaseModel(db.Model):
    __abstract__ = True

    # Primary key (Postgres UUID)
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Timestamps (stored in UTC)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Soft delete
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # ------------------------------------------------------------------
    # Class-level query helpers
    # ------------------------------------------------------------------
    @declared_attr
    def query(cls):
        # Default query returns a query property bound to the session. Use
        # query_property() to avoid touching the session at import-time which
        # requires an application context.
        return db.session.query_property()

    @classmethod
    def active(cls):
        """Return only non-deleted records"""
        return db.session.query(cls).filter_by(is_deleted=False)

    @classmethod
    def with_deleted(cls):
        """Include soft-deleted records"""
        return db.session.query(cls)

    # ------------------------------------------------------------------
    # Instance methods
    # ------------------------------------------------------------------
    def save(self, commit=True):
        db.session.add(self)
        if commit:
            db.session.commit()
        return self

    def delete(self, soft=True, commit=True):
        if soft:
            self.is_deleted = True
            # store UTC timestamp
            self.deleted_at = datetime.utcnow().replace(tzinfo=timezone.utc)
            db.session.add(self)
        else:
            db.session.delete(self)
        if commit:
            db.session.commit()

    def hard_delete(self, commit=True):
        self.delete(soft=False, commit=commit)

    def to_dict(self, exclude=None, include=None):
        """
        Convert model to dict. Exclude soft-delete fields by default.
        UUIDs are converted to strings. Datetimes are ISO-8601 in UTC with a trailing Z.
        """
        exclude = exclude or {'is_deleted', 'deleted_at'}
        include = include or set()
        data = {}
        for column in self.__table__.columns:
            key = column.name
            if key in exclude and key not in include:
                continue
            value = getattr(self, key)
            # UUID -> str
            try:
                import uuid as _uuid
                if isinstance(value, _uuid.UUID):
                    value = str(value)
            except Exception:
                pass
            # datetimes -> ISO 8601 UTC
            if isinstance(value, datetime):
                if value.tzinfo is None:
                    # treat as UTC
                    value = value.replace(tzinfo=timezone.utc)
                # normalize to UTC and add Z
                value = value.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')
            data[key] = value
        return data

    def to_eat(self, dt):
        """Return a datetime converted to East Africa Time (Africa/Nairobi). Returns None for None input."""
        if dt is None:
            return None
        if ZoneInfo is None:
            # zoneinfo not available; return UTC datetime as-is
            return dt
        try:
            return dt.astimezone(ZoneInfo('Africa/Nairobi'))
        except Exception:
            return dt

    def __repr__(self):
        return f"<{self.__class__.__name__} {self.id}>"
