"""Import all models so that SQLAlchemy metadata is populated for migrations.

This module purposely imports each model module. Alembic's autogenerate
requires model classes to be imported so they register their tables on
`db.metadata`.
"""
from .user import *  # noqa: F401,F403
from .ticket import *  # noqa: F401,F403
from .comment import *  # noqa: F401,F403
from .message import *  # noqa: F401,F403
from .conversation import *  # noqa: F401,F403
from .conversation_participant import *  # noqa: F401,F403
from .attachment import *  # noqa: F401,F403
from .kb import *  # noqa: F401,F403
