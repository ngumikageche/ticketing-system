from flask import Flask, jsonify
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

try:
    from flask_caching import Cache
    import redis
    CACHING_AVAILABLE = True
except Exception:
    class _NoOpCache:
        def init_app(self, *a, **k):
            return None
        def cached(self, *a, **k):
            def decorator(func):
                return func
            return decorator
        def delete(self, *args, **kwargs):
            pass
    Cache = _NoOpCache
    redis = None
    CACHING_AVAILABLE = False

# Define fallback classes
class _NoOpSocketIO:
    def __init__(self, *args, **kwargs):
        pass
    def init_app(self, *a, **k):
        return None
    def emit(self, *args, **kwargs):
        pass
    def on(self, *args, **kwargs):
        def decorator(func):
            return func
        return decorator
    def run(self, *args, **kwargs):
        pass
    @property
    def server(self):
        return self
    def join_room(self, *args, **kwargs):
        pass
    def leave_room(self, *args, **kwargs):
        pass

try:
    from flask_socketio import SocketIO, join_room, leave_room
    from flask import request
    import os
    SOCKETIO_AVAILABLE = True
except Exception:
    SocketIO = _NoOpSocketIO
    join_room = lambda *args, **kwargs: None
    leave_room = lambda *args, **kwargs: None
    from flask import request
    os = None
    SOCKETIO_AVAILABLE = False

# Import BaseModel's db
from app.models.base import db

migrate = Migrate()
jwt = JWTManager()
cache = Cache() if CACHING_AVAILABLE else _NoOpCache()
# Central list of allowed origins used by both HTTP CORS (Flask-CORS)
# and Socket.IO (engineio). Keep this list in one place to ensure they
# always match. Avoid using "*" when supports_credentials=True.
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8080",
    "https://support.nextek.co.ke",
    "http://support.nextek.co.ke",
    "https://sapi.nextek.co.ke",
    "http://sapi.nextek.co.ke",
]

# Only initialize SocketIO if we're not running database commands and SocketIO is available
# This prevents eventlet/asyncio monkey patching issues during `flask db` commands.
# Configure Socket.IO to use the same ALLOWED_ORIGINS used by Flask-CORS so that
# WebSocket upgrade/preflight checks and HTTP requests use identical origin rules.
if SOCKETIO_AVAILABLE and os and 'db' not in os.sys.argv:
    socketio = SocketIO(cors_allowed_origins=ALLOWED_ORIGINS, logger=True, engineio_logger=True)
else:
    socketio = _NoOpSocketIO()

def create_app():
    app = Flask(__name__)
    app.config.from_object('app.config.Config')

    # Configure Cloudinary SDK if available and environment is set
    try:
        import cloudinary
        # Set config if we have values; cloudinary.config will ignore None values
        cloudinary.config(
            cloud_name=app.config.get('CLOUDINARY_CLOUD_NAME'),
            api_key=app.config.get('CLOUDINARY_API_KEY'),
            api_secret=app.config.get('CLOUDINARY_API_SECRET')
        )
    except Exception:
        # Cloudinary library not installed or configuration failed — ignore gracefully
        pass

    # Only initialize Socket.IO if we're running the server (not during db commands)
    if hasattr(socketio, 'init_app') and callable(getattr(socketio, 'init_app', None)):
        # Ensure the Socket.IO instance is explicitly attached to the Flask app
        # and that it uses the same allowed origins as HTTP CORS above. This
        # keeps WebSocket handshake CORS and regular HTTP CORS in sync.
        socketio.init_app(app,
                          cors_allowed_origins=ALLOWED_ORIGINS,
                          logger=True,
                          engineio_logger=True)
    
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cache.init_app(app, config={'CACHE_TYPE': 'redis', 'CACHE_REDIS_URL': app.config['REDIS_URL']})

    # Initialize Redis client
    if CACHING_AVAILABLE:
        app.redis_client = redis.from_url(app.config['REDIS_URL'])
    else:
        app.redis_client = None

    # Configure HTTP CORS for the Flask application. Flask-CORS will add the
    # appropriate Access-Control-* headers to responses and automatically
    # handle OPTIONS preflight responses. We rely on Flask-CORS instead of
    # manually mutating response headers to avoid duplicate header values.
    # See ALLOWED_ORIGINS above for the canonical list shared with Socket.IO.
    CORS(app,
         origins=ALLOWED_ORIGINS,
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
         methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
         expose_headers=["Access-Control-Allow-Origin"],
         automatic_options=True)

    # Add CORS debugging: lightweight logging for preflight and cross-origin
    # requests. This does not modify response headers; Flask-CORS is responsible
    # for adding CORS headers. Keep the logs to help diagnose failing preflights
    # after infrastructure changes (e.g., nginx config).
    @app.before_request
    def log_cors_requests():
        if request.method == 'OPTIONS':
            app.logger.info(f"CORS preflight: {request.method} {request.path} from {request.headers.get('Origin', 'unknown')}")
            app.logger.info(f"Request headers: {dict(request.headers)}")
        elif 'Origin' in request.headers:
            app.logger.info(f"CORS request: {request.method} {request.path} from {request.headers.get('Origin', 'unknown')}")

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
        from .routes.notifications import notifications_bp
        from .routes.conversations import conversations_bp
        from .routes.testing import testing_bp
        from .routes.uploads import uploads_bp
        from .routes.settings import settings_bp
        app.register_blueprint(auth_bp, url_prefix='/api/auth')
        app.register_blueprint(tickets_bp, url_prefix='/api/tickets')
        app.register_blueprint(kb_bp, url_prefix='/api/kb')
        app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
        app.register_blueprint(users_bp, url_prefix='/api/users')
        app.register_blueprint(comments_bp, url_prefix='/api/comments')
        app.register_blueprint(attachments_bp, url_prefix='/api/attachments')
        app.register_blueprint(docs_bp, url_prefix='')
        app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
        app.register_blueprint(conversations_bp, url_prefix='/api/conversations')
        app.register_blueprint(testing_bp, url_prefix='/api/testing')
        app.register_blueprint(uploads_bp, url_prefix='/api/uploads')
        app.register_blueprint(settings_bp, url_prefix='/api/settings')
    except Exception:
        # Surface import / registration errors so they are visible in development
        logging.exception("Failed to import blueprints for app; blueprints won't be registered")
        # In development, re-raise so CLI commands like `flask routes` fail loudly and help debugging
        if app.config.get('ENV') == 'development' or app.debug:
            raise

    # Socket.IO event handlers - only register if socketio is available and properly initialized
    if hasattr(socketio, 'on') and hasattr(socketio, 'emit'):
        @socketio.on('connect')
        def handle_connect():
            print('Client connected')
            socketio.emit('status', {'message': 'Connected to real-time server'})

        @socketio.on('disconnect')
        def handle_disconnect():
            print('Client disconnected')

        @socketio.on('join')
        def handle_join(data):
            """Join a room for real-time updates"""
            room = data.get('room', 'general')
            join_room(room, sid=request.sid)
            socketio.emit('status', {'message': f'Joined room: {room}'}, room=room)

        @socketio.on('leave')
        def handle_leave(data):
            """Leave a room"""
            room = data.get('room', 'general')
            leave_room(room, sid=request.sid)
            socketio.emit('status', {'message': f'Left room: {room}'})

    # Register an unauthorized redirect handler (will return JSON 401 for API clients,
    # redirect browsers to the configured FRONTEND_URL for navigation requests).
    try:
        _register_unauthorized_redirect(app)
    except Exception:
        app.logger.exception('Failed to register unauthorized redirect handler')

    # Return only the Flask `app` from the factory; `socketio` is a module-level
    # object that may be imported directly for server startup (e.g., wsgi.py).
    return app


    # Add an error handler for unauthorized access to redirect to frontend signin
    # This will be executed for page navigation requests and will return a redirect
    # to the configured FRONTEND_URL (if set). For API clients, the default JSON 401
    # response will be returned. The handler is registered after app configuration
    # so it can access `app.config.FRONTEND_URL`.

def _register_unauthorized_redirect(app):
    from flask import request, redirect, jsonify

    @app.errorhandler(401)
    def _handle_unauthorized(err):
        accept = request.headers.get('Accept', '')
        frontend_url = app.config.get('FRONTEND_URL')
        redirect_enabled = app.config.get('REDIRECT_ON_UNAUTHORIZED', False)
        # Only redirect if this looks like a user navigation (page load) instead of
        # an API/XHR request. Prefer the Sec-Fetch-* headers when available.
        sec_mode = request.headers.get('Sec-Fetch-Mode', '')
        sec_dest = request.headers.get('Sec-Fetch-Dest', '')
        is_navigation = sec_mode == 'navigate' or sec_dest == 'document'

        # For security and to avoid redirect loops, the backend will always return a JSON 401.
        # The SPA (frontend) should handle navigation/redirect flows when it encounters a 401
        # response. Historically a server-side redirect could cause nested redirect loops
        # due to `next` params; moving redirect handling to the client avoids this problem.
        app.logger.debug('Returning JSON 401 (unauthorized) - frontend should handle redirect behavior')
        return jsonify({'msg': 'Unauthorized'}), 401

_register_unauthorized_redirect.__doc__ = 'Register unauthorized handler'
