from flask import Blueprint, request, jsonify, abort
from app.models.testing import Testing
from app.models.ticket import Ticket
from app.models.user import User
from app.models.base import db
from flask_jwt_extended import jwt_required, get_jwt_identity
import uuid
from functools import wraps

testing_bp = Blueprint('testing', __name__)


def jwt_required_optional(fn):
    """JWT required decorator that allows OPTIONS requests through"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if request.method == 'OPTIONS':
            # Allow OPTIONS requests without authentication
            return fn(*args, **kwargs)
        return jwt_required()(fn)(*args, **kwargs)
    return wrapper


def _get_or_404(model, id_):
    if not id_:
        abort(400, 'id required')
    obj = model.query.filter_by(id=id_).first()
    if not obj:
        abort(404)
    return obj


@testing_bp.route('/', methods=['GET'])
@jwt_required_optional
def list_testing():
    # Optional filters
    ticket_id = request.args.get('ticket_id')
    user_id = request.args.get('user_id')
    status = request.args.get('status')
    
    query = Testing.active()
    if ticket_id:
        query = query.filter_by(ticket_id=ticket_id)
    if user_id:
        query = query.filter_by(user_id=user_id)
    if status:
        query = query.filter_by(status=status)
    
    testing = query.order_by(Testing.created_at.desc()).all()
    return jsonify([t.to_dict() for t in testing])


@testing_bp.route('/', methods=['POST'])
@jwt_required_optional
def create_testing():
    # Get current user from JWT token
    identity = get_jwt_identity()
    try:
        current_user_id = uuid.UUID(identity)
    except ValueError:
        abort(401, 'invalid token')
    
    data = request.get_json() or {}
    if 'ticket_id' not in data:
        abort(400, 'ticket_id is required')
    
    ticket = Ticket.query.filter_by(id=data['ticket_id']).first()
    if not ticket:
        abort(400, 'ticket not found')
    
    user = User.query.filter_by(id=current_user_id).first()
    if not user:
        abort(400, 'user not found')
    
    try:
        testing = Testing.create_for_ticket(
            ticket=ticket,
            user=user,
            status=data.get('status', 'pending'),
            test_type=data.get('test_type', 'manual'),
            results=data.get('results')
        )
        testing.save()
    except ValueError as e:
        abort(400, str(e))
    # Associate any provided media ids with this testing session
    if 'media_ids' in data and isinstance(data['media_ids'], (list, tuple)):
        from app.models.media import Media
        for m_id in data['media_ids']:
            media = Media.query.filter_by(id=m_id).first()
            if media:
                media.testing_id = testing.id
                db.session.add(media)
        db.session.commit()
    
    return jsonify(testing.to_dict()), 201


@testing_bp.route('/<id_>', methods=['GET'])
@jwt_required_optional
def get_testing(id_):
    t = _get_or_404(Testing, id_)
    return jsonify(t.to_dict())


@testing_bp.route('/<id_>', methods=['PUT', 'PATCH'])
@jwt_required_optional
def update_testing(id_):
    testing = _get_or_404(Testing, id_)
    
    # Get current user from JWT token
    identity = get_jwt_identity()
    try:
        current_user_id = uuid.UUID(identity)
    except ValueError:
        abort(401, 'invalid token')
    
    # Only allow the tester or admin to update
    if str(testing.user_id) != str(current_user_id):
        # For now, restrict to tester only
        abort(403, 'only the tester can update this testing')
    
    data = request.get_json() or {}
    
    # Update allowed fields
    for field in ('test_type', 'results'):
        if field in data:
            setattr(testing, field, data[field])
    
    # If status is being updated, use the update_status method
    if 'status' in data:
        try:
            testing.update_status(data['status'])
        except Exception as e:
            abort(400, f'Error updating status: {str(e)}')
    else:
        testing.save()
    # Associate any provided media ids with this testing session
    if 'media_ids' in data and isinstance(data['media_ids'], (list, tuple)):
        from app.models.media import Media
        for m_id in data['media_ids']:
            media = Media.query.filter_by(id=m_id).first()
            if media:
                media.testing_id = testing.id
                db.session.add(media)
        db.session.commit()
    
    return jsonify(testing.to_dict())


@testing_bp.route('/<id_>', methods=['DELETE'])
@jwt_required_optional
def delete_testing(id_):
    testing = _get_or_404(Testing, id_)
    
    # Get current user from JWT token
    identity = get_jwt_identity()
    try:
        current_user_id = uuid.UUID(identity)
    except ValueError:
        abort(401, 'invalid token')
    
    # Only allow the tester or admin to delete
    if str(testing.user_id) != str(current_user_id):
        abort(403, 'only the tester can delete this testing')
    
    testing.delete(soft=True)
    return '', 204