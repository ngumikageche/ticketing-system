from app import create_app
from app.models.base import db
from flask_migrate import Migrate
import os
from flask_socketio import WSGIApp

app, socketio = create_app()
migrate = Migrate(app, db)

# For production with gunicorn + eventlet, expose the WSGI app
app = WSGIApp(socketio)

if __name__ == "__main__":
    # For development, recreate the app without WSGI wrapper
    dev_app, dev_socketio = create_app()
    port = int(os.getenv('PORT', 5000))
    print(f"Starting Socket.IO server on port {port}...")
    try:
        dev_socketio.run(dev_app, host='0.0.0.0', port=port, debug=True, log_output=True)
    except Exception as e:
        print(f"Error starting server: {e}")
        # Fallback to Flask development server
        print("Falling back to Flask development server...")
        dev_app.run(host='0.0.0.0', port=port, debug=True)