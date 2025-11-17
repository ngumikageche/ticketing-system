import os

# Load environment variables from .env file if it exists
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


class Config:
    """Basic application config used by create_app().

    - Keeps sensible defaults for local development (SQLite) so the app can import.
    - In production, set environment variables to override values, e.g. DATABASE_URL and JWT_SECRET_KEY.
    """

    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', SECRET_KEY)

    # Database (default to a local sqlite file for quick local work)
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///data.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Flask-Migrate/alembic settings (optional)
    MIGRATION_DIR = os.getenv('MIGRATION_DIR', 'migrations')

    # JSON settings
    REST_JSON_SORT_KEYS = False
