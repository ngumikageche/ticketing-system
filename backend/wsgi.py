from app import create_app
from app.models.base import db
from flask_migrate import Migrate
import os

app, socketio = create_app()
migrate = Migrate(app, db)

if __name__ == "__main__":
    port = int(os.getenv('PORT', 5000))
    socketio.run(app, port=port, debug=True)