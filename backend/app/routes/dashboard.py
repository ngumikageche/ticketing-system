from flask import Blueprint, jsonify

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/', methods=['GET'])
def index():
    return jsonify({'message': 'dashboard endpoint'}), 200
