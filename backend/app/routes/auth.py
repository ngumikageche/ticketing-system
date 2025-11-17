from flask import Blueprint, request, jsonify, abort
from app.models.user import User
from app.models.base import db
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import datetime
import uuid

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    if 'email' not in data or 'password' not in data:
        abort(400, 'email and password are required')
    u = User.active().filter_by(email=data['email']).first()
    if not u or not u.check_password(data['password']):
        abort(401, 'invalid credentials')
    # Create an access token using the user's id as the identity
    access = create_access_token(identity=str(u.id), expires_delta=datetime.timedelta(hours=1))
    return jsonify(access_token=access), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    identity = get_jwt_identity()
    try:
        user_id = uuid.UUID(identity)
    except ValueError:
        abort(401, 'invalid token')
    user = User.active().filter_by(id=user_id).first()
    if not user:
        abort(404, 'user not found')
    return jsonify(user.to_dict()), 200
