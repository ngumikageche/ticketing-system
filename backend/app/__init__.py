from flask import Flask
import logging
try:
    from flask_migrate import Migrate
except Exception:
    class _NoOpMigrate:
        def init_app(self, *a, **k):
            return None
    Migrate = _NoOpMigrate

try:
    from flask_jwt_extended import JWTManager
except Exception:
    class _NoOpJWT:
        def init_app(self, *a, **k):
            return None
    JWTManager = _NoOpJWT

try:
    from flask_cors import CORS
except Exception:
    def CORS(app):
        return None

# Import BaseModel's db
from app.models.base import db

migrate = Migrate()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    app.config.from_object('app.config.Config')

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app)

    # Register blueprints (import here to avoid circular imports)
    try:
        from .routes.auth import auth_bp
        from .routes.tickets import tickets_bp
        from .routes.kb import kb_bp
        from .routes.dashboard import dashboard_bp
        from .routes.users import users_bp
        from .routes.comments import comments_bp
        from .routes.attachments import attachments_bp
        from .routes.docs import docs_bp
        app.register_blueprint(auth_bp, url_prefix='/api/auth')
        app.register_blueprint(tickets_bp, url_prefix='/api/tickets')
        app.register_blueprint(kb_bp, url_prefix='/api/kb')
        app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
        app.register_blueprint(users_bp, url_prefix='/api/users')
        app.register_blueprint(comments_bp, url_prefix='/api/comments')
        app.register_blueprint(attachments_bp, url_prefix='/api/attachments')
        app.register_blueprint(docs_bp, url_prefix='')
    except Exception:
        # Surface import / registration errors so they are visible in development
        logging.exception("Failed to import blueprints for app; blueprints won't be registered")
        # In development, re-raise so CLI commands like `flask routes` fail loudly and help debugging
        if app.config.get('ENV') == 'development' or app.debug:
            raise

    return app
