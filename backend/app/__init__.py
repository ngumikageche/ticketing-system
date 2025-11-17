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
    from flask_socketio import SocketIO, join_room, leave_room
    from flask import request
except Exception:
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
    SocketIO = _NoOpSocketIO
    join_room = lambda *args, **kwargs: None
    leave_room = lambda *args, **kwargs: None
    from flask import request

# Import BaseModel's db
from app.models.base import db

migrate = Migrate()
jwt = JWTManager()
socketio = SocketIO(cors_allowed_origins="*", logger=True, engineio_logger=True)

def create_app():
    app = Flask(__name__)
    app.config.from_object('app.config.Config')

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    
    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'msg': 'Token has expired'}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'msg': 'Invalid token'}), 401

    @jwt.unauthorized_loader
    def unauthorized_callback(error):
        return jsonify({'msg': 'Missing or invalid Authorization header'}), 401

    @jwt.needs_fresh_token_loader
    def fresh_token_callback(jwt_header, jwt_payload):
        return jsonify({'msg': 'Fresh token required'}), 401
    socketio.init_app(app)
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
        from .routes.notifications import notifications_bp
        app.register_blueprint(auth_bp, url_prefix='/api/auth')
        app.register_blueprint(tickets_bp, url_prefix='/api/tickets')
        app.register_blueprint(kb_bp, url_prefix='/api/kb')
        app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
        app.register_blueprint(users_bp, url_prefix='/api/users')
        app.register_blueprint(comments_bp, url_prefix='/api/comments')
        app.register_blueprint(attachments_bp, url_prefix='/api/attachments')
        app.register_blueprint(docs_bp, url_prefix='')
        app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    except Exception:
        # Surface import / registration errors so they are visible in development
        logging.exception("Failed to import blueprints for app; blueprints won't be registered")
        # In development, re-raise so CLI commands like `flask routes` fail loudly and help debugging
        if app.config.get('ENV') == 'development' or app.debug:
            raise

    # Socket.IO event handlers - only register if socketio is available
    if hasattr(socketio, 'on'):
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
