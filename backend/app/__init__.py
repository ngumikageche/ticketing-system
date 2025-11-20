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

# Only initialize SocketIO if we're not running database commands and SocketIO is available
# This prevents eventlet monkey patching issues during flask db commands
if SOCKETIO_AVAILABLE and os and 'db' not in os.sys.argv:
    socketio = SocketIO(cors_allowed_origins="*", logger=True, engineio_logger=True)
else:
    socketio = _NoOpSocketIO()

def create_app():
    app = Flask(__name__)
    app.config.from_object('app.config.Config')

    # Only initialize Socket.IO if we're running the server (not during db commands)
    if hasattr(socketio, 'init_app') and callable(getattr(socketio, 'init_app', None)):
        # Be explicit about allowed origins. Avoid using "*" when supporting credentials.
        socketio.init_app(app, 
                          cors_allowed_origins=[
                              "http://localhost:5173",
                              "http://localhost:3000",
                              "http://localhost:8080",
                              "https://support.nextek.co.ke",
                              "http://support.nextek.co.ke",
                              "https://sapi.nextek.co.ke",
                              "http://sapi.nextek.co.ke",
                          ],
                          logger=True, 
                          engineio_logger=True)
    
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    # Add CORS for regular HTTP requests (Socket.IO handles its own CORS)
    # Explicit CORS origins: include local dev origins and production hosts (support + sapi)
    CORS(app, 
         origins=[
             "http://localhost:5173",
             "http://localhost:3000",
             "http://localhost:8080",
             "https://support.nextek.co.ke",
             "http://support.nextek.co.ke",
             "https://sapi.nextek.co.ke",
             "http://sapi.nextek.co.ke",
         ], 
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
         methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
         expose_headers=["Access-Control-Allow-Origin"])

    # Add CORS debugging
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

    return app, socketio
