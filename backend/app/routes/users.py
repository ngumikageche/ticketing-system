from flask import Blueprint, request, jsonify, abort
from app.models.user import User
from app.models.notification import Notification
from app.hooks import send_user_created, send_user_updated, send_user_deleted
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

    # Check if email already exists (including soft-deleted users)
    existing_user = User.query.filter_by(email=data['email']).first()
    if existing_user:
        if existing_user.is_deleted:
            # Reactivate the soft-deleted user and update with new information
            existing_user.is_deleted = False
            existing_user.deleted_at = None
            existing_user.name = data.get('name', existing_user.name)
            existing_user.role = data.get('role', existing_user.role)
            existing_user.is_active = data.get('is_active', True)
            if 'password' in data:
                existing_user.set_password(data['password'])
            existing_user.save()
            
            # Notify all admins about reactivated user
            admins = User.active().filter(User.role.ilike('ADMIN')).all()
            for admin in admins:
                Notification(
                    user_id=admin.id,
                    type='user_reactivated',
                    message=f"User '{existing_user.name or existing_user.email}' was reactivated",
                    related_id=existing_user.id,
                    related_type='user'
                ).save()
            
            return jsonify(existing_user.to_dict()), 200
        else:
            abort(400, 'user with this email already exists')

    u = User(
        email=data.get('email'),
        name=data.get('name'),
        role=data.get('role', 'CUSTOMER'),
        is_active=data.get('is_active', True),
    )
    if 'password' in data:
        u.set_password(data['password'])
    u.save()
    
    # emit hook for user created so handlers (including defaults) can
    # create notifications or perform other side-effects
    try:
        send_user_created(u)
    except Exception:
        import logging

        logging.exception('error running user.created hooks')
    
    return jsonify(u.to_dict()), 201


@users_bp.route('/<id_>', methods=['GET'])
def get_user(id_):
    u = _get_model_or_404(User, id_)
    return jsonify(u.to_dict())


@users_bp.route('/<id_>', methods=['PUT', 'PATCH'])
def update_user(id_):
    u = _get_model_or_404(User, id_)
    data = request.get_json() or {}
    
    # Check email uniqueness if email is being updated
    if 'email' in data and data['email'] != u.email:
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user:
            if existing_user.is_deleted:
                abort(400, 'cannot update email to a previously deleted user\'s email')
            else:
                abort(400, 'user with this email already exists')
    
    for field in ('email', 'name', 'role'):
        if field in data:
            setattr(u, field, data[field])
    if 'is_active' in data:
        u.is_active = bool(data['is_active'])
    if 'password' in data:
        u.set_password(data['password'])
    u.save()
    
    # emit hook for user updated so handlers (including defaults) can
    # create notifications or perform other side-effects
    try:
        send_user_updated(u)
    except Exception:
        import logging

        logging.exception('error running user.updated hooks')
    
    return jsonify(u.to_dict())


@users_bp.route('/<id_>', methods=['DELETE'])
def delete_user(id_):
    u = _get_model_or_404(User, id_)
    u.delete(soft=True)
    
    # emit hook for user deleted so handlers (including defaults) can
    # create notifications or perform other side-effects
    try:
        send_user_deleted(u)
    except Exception:
        import logging

        logging.exception('error running user.deleted hooks')

    return '', 204


@users_bp.route('/me/webhook', methods=['GET'])
@jwt_required()
def get_my_webhook():
    """Get the current user's webhook URL."""
    identity = get_jwt_identity()
    try:
        identity_uuid = uuid.UUID(identity)
    except Exception:
        abort(401, 'invalid token identity')
    user = User.query.filter_by(id=identity_uuid).first()
    if not user:
        abort(404, 'user not found')
    
    return jsonify({
        'webhook_url': user.webhook_url
    })


@users_bp.route('/me/webhook', methods=['PUT', 'PATCH'])
@jwt_required()
def update_my_webhook():
    """Update the current user's webhook URL."""
    identity = get_jwt_identity()
    try:
        identity_uuid = uuid.UUID(identity)
    except Exception:
        abort(401, 'invalid token identity')
    user = User.query.filter_by(id=identity_uuid).first()
    if not user:
        abort(404, 'user not found')
    
    data = request.get_json() or {}
    webhook_url = data.get('webhook_url')
    
    # Basic validation - ensure it's a valid URL or relative path if provided
    if webhook_url:
        from urllib.parse import urlparse
        parsed = urlparse(webhook_url)
        # Allow absolute URLs or relative paths starting with /
        if not ((parsed.scheme and parsed.netloc) or webhook_url.startswith('/')):
            abort(400, 'webhook_url must be a valid URL or relative path starting with /')
    
    user.webhook_url = webhook_url
    user.save()
    
    return jsonify({
        'webhook_url': user.webhook_url
    })
