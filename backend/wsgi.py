import os

# When imported (e.g., by gunicorn), expose an app instance without applying eventlet monkey patch here.
if __name__ != "__main__":
    from app import create_app, socketio  # type: ignore
    from app.models.base import db  # type: ignore
    from flask_migrate import Migrate  # type: ignore
    app = create_app()
    migrate = Migrate(app, db)
else:
    app = None  # type: ignore
    migrate = None  # type: ignore

# For production with gunicorn + eventlet, the Flask app is already modified by SocketIO
# so we can use it directly as the WSGI application

if __name__ == "__main__":
    # Only apply eventlet monkey patching when running the server directly
    # and do it BEFORE importing the Flask app to avoid context/patching errors.
    import eventlet
    eventlet.monkey_patch()
    import eventlet.wsgi
    from app import create_app, socketio  # delayed import after monkey_patch
    from app.models.base import db
    from flask_migrate import Migrate
    app = create_app()
    migrate = Migrate(app, db)
    port = int(os.getenv('PORT', 5000))
    print(f"Starting Socket.IO server with eventlet on port {port}...")
    try:
        # Use eventlet WSGI server for Socket.IO compatibility
        eventlet.wsgi.server(eventlet.listen(('0.0.0.0', port)), app)
    except Exception as e:
        print(f"Error starting server: {e}")
        # Fallback to Flask development server
        print("Falling back to Flask development server...")
        app.run(host='0.0.0.0', port=port, debug=True)
