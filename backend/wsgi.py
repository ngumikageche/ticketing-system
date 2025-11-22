import eventlet
eventlet.monkey_patch()

from app import create_app, socketio
from app.models.base import db
from flask_migrate import Migrate
import os
import eventlet.wsgi

app = create_app()
migrate = Migrate(app, db)

# For production with gunicorn + eventlet, the Flask app is already modified by SocketIO
# so we can use it directly as the WSGI application

if __name__ == "__main__":
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
