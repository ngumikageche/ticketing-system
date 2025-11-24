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
    # JWT cookie settings for using httpOnly cookies for tokens
    # Allow specifying token locations as a comma-separated list (default cookies)
    token_locations = os.getenv('JWT_TOKEN_LOCATION', 'cookies,headers')
    JWT_TOKEN_LOCATION = [loc.strip() for loc in token_locations.split(',') if loc.strip()]
    # Whether cookies should be secure (True in production with HTTPS)
    JWT_COOKIE_SECURE = os.getenv('JWT_COOKIE_SECURE', 'False').lower() in ('true', '1')
    # SameSite policy for cookies
    JWT_COOKIE_SAMESITE = os.getenv('JWT_COOKIE_SAMESITE', 'Lax')
    # Protect cookies with CSRF double submit mechanism if enabled
    JWT_COOKIE_CSRF_PROTECT = os.getenv('JWT_COOKIE_CSRF_PROTECT', 'False').lower() in ('true', '1')
    # Default expiry values (seconds) if not provided by app code
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 3600))
    JWT_REFRESH_TOKEN_EXPIRES = int(os.getenv('JWT_REFRESH_TOKEN_EXPIRES', 30 * 24 * 3600))
    # Optional cookie domain to allow sharing cookies across subdomains
    JWT_COOKIE_DOMAIN = os.getenv('JWT_COOKIE_DOMAIN')

    # Frontend URL used for redirects (e.g. https://dashboard.example.com)
    FRONTEND_URL = os.getenv('FRONTEND_URL')
    # Should the backend perform redirects for unauthorized (401) navigation requests?
    # When False (default), the backend returns JSON 401 and the SPA handles redirecting to login.
    REDIRECT_ON_UNAUTHORIZED = os.getenv('REDIRECT_ON_UNAUTHORIZED', 'False').lower() in ('true', '1')
    # Cookie paths
    JWT_ACCESS_COOKIE_PATH = os.getenv('JWT_ACCESS_COOKIE_PATH', '/')
    JWT_REFRESH_COOKIE_PATH = os.getenv('JWT_REFRESH_COOKIE_PATH', '/api/auth/refresh')

    # Database (default to a local sqlite file for quick local work)
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///data.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Flask-Migrate/alembic settings (optional)
    MIGRATION_DIR = os.getenv('MIGRATION_DIR', 'migrations')

    # JSON settings
    REST_JSON_SORT_KEYS = False

    # Cloudinary configuration
    CLOUDINARY_CLOUD_NAME = os.getenv('CLOUDINARY_CLOUD_NAME')
    CLOUDINARY_API_KEY = os.getenv('CLOUDINARY_API_KEY')
    CLOUDINARY_API_SECRET = os.getenv('CLOUDINARY_API_SECRET')
    # Optional: upload preset and optional folder for organizing uploads
    CLOUDINARY_UPLOAD_PRESET = os.getenv('CLOUDINARY_UPLOAD_PRESET')
    CLOUDINARY_UPLOAD_FOLDER = os.getenv('CLOUDINARY_UPLOAD_FOLDER')
    CLOUDINARY_ENABLED = bool(CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET)

    # Redis configuration
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
