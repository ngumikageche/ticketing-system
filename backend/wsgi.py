from app import create_app
from app.models.base import db
from flask_migrate import Migrate
import os

app, socketio = create_app()
migrate = Migrate(app, db)

if __name__ == "__main__":
    port = int(os.getenv('PORT', 5000))
    print(f"Starting Socket.IO server on port {port}...")
    try:
        socketio.run(app, host='0.0.0.0', port=port, debug=True, log_output=True)
    except Exception as e:
        print(f"Error starting server: {e}")
        # Fallback to Flask development server
        print("Falling back to Flask development server...")
        app.run(host='0.0.0.0', port=port, debug=True)