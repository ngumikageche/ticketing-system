from app import create_app
from app.models.base import db
from flask_migrate import Migrate
from flask import Flask
import os

app, socketio = create_app()
migrate = Migrate(app, db)

@app.cli.command()
def runserver():
    """Run the server with Socket.IO support"""
    port = int(os.getenv('PORT', 5000))
    print("Starting server with Socket.IO support...")
    socketio.run(app, port=port, debug=True)

@app.route('/socket.io/')
def socketio_info():
    return {
        'message': 'Socket.IO requires running with: python wsgi.py or flask runserver',
        'commands': ['python wsgi.py', 'flask runserver']
    }, 200