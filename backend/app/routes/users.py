from flask import Blueprint, request, jsonify, abort
from app.models.user import User
from app.models.base import db
from flask_jwt_extended import jwt_required, get_jwt_identity
import uuid

users_bp = Blueprint('users', __name__)


def _get_model_or_404(model, id_):
    if not id_:
        abort(400, 'id required')
    obj = model.query.filter_by(id=id_).first()
    if not obj:
        abort(404)
    return obj


@users_bp.route('/', methods=['GET'])
def list_users():
    users = User.active().all()
    return jsonify([u.to_dict() for u in users])


@users_bp.route('/', methods=['POST'])
@jwt_required()
def create_user():
    data = request.get_json() or {}
    if 'email' not in data:
        abort(400, 'email is required')

    # Only admin users may create new users
    identity = get_jwt_identity()
    try:
        identity_uuid = uuid.UUID(identity)
    except Exception:
        abort(401, 'invalid token identity')
    current = User.query.filter_by(id=identity_uuid).first()
    if not current or (current.role or '').upper() != 'ADMIN':
        abort(403, 'admin privilege required')

    u = User(
        email=data.get('email'),
        name=data.get('name'),
        role=data.get('role', 'CUSTOMER'),
        is_active=data.get('is_active', True),
    )
    if 'password' in data:
        u.set_password(data['password'])
    u.save()
    return jsonify(u.to_dict()), 201


@users_bp.route('/<id_>', methods=['GET'])
def get_user(id_):
    u = _get_model_or_404(User, id_)
    return jsonify(u.to_dict())


@users_bp.route('/<id_>', methods=['PUT', 'PATCH'])
def update_user(id_):
    u = _get_model_or_404(User, id_)
    data = request.get_json() or {}
    for field in ('email', 'name', 'role'):
        if field in data:
            setattr(u, field, data[field])
    if 'is_active' in data:
        u.is_active = bool(data['is_active'])
    if 'password' in data:
        u.set_password(data['password'])
    u.save()
    return jsonify(u.to_dict())


@users_bp.route('/<id_>', methods=['DELETE'])
def delete_user(id_):
    hard = request.args.get('hard', 'false').lower() in ('1', 'true', 'yes')
    u = _get_model_or_404(User, id_)
    if hard:
        db.session.delete(u)
        db.session.commit()
        return '', 204
    else:
        u.delete(soft=True)
        return '', 204
