from flask import Blueprint, request, jsonify, abort
from app.models.ticket import Ticket
from app.models.user import User
from app.models.notification import Notification
from app.models.comment import Comment
from app.hooks import send_ticket_created, send_ticket_updated, send_ticket_deleted, send_comment_created
from app.models.base import db
from flask_jwt_extended import jwt_required, get_jwt_identity
import uuid
from functools import wraps

tickets_bp = Blueprint('tickets', __name__)


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


@tickets_bp.route('/', methods=['GET'])
def list_tickets():
    tickets = Ticket.active().all()
    return jsonify([t.to_dict() for t in tickets])


@tickets_bp.route('/', methods=['POST'])
def create_ticket():
    data = request.get_json() or {}
    if 'subject' not in data or ('requester_id' not in data and 'requester_name' not in data):
        abort(400, 'subject and either requester_id or requester_name are required')

    # Validate requester_id if provided
    if 'requester_id' in data:
        requester = User.query.filter_by(id=data['requester_id']).first()
        if not requester:
            abort(400, 'requester not found')
        requester_id = data['requester_id']
        requester_name = None
    else:
        requester_id = None
        requester_name = data['requester_name']

    ticket = Ticket(
        ticket_id=data.get('ticket_id') or f"#{uuid.uuid4().hex[:8]}",
        subject=data.get('subject'),
        description=data.get('description'),
        status=data.get('status', 'OPEN'),
        priority=data.get('priority', 'MEDIUM'),
        requester_id=requester_id,
        requester_name=requester_name,
        assignee_id=data.get('assignee_id'),
    )
    ticket.save()

    # emit hook for ticket created so handlers (including defaults) can
    # create notifications or perform other side-effects
    try:
        send_ticket_created(ticket)
    except Exception:
        # don't let hook errors bubble to API clients
        import logging

        logging.exception('error running ticket.created hooks')
        # If a hook raised a DB-related exception it may have left the
        # session in a rolled-back state. Ensure the session is usable
        # for the response by rolling back any partial transaction.
        try:
            db.session.rollback()
        except Exception:
            pass

    return jsonify(ticket.to_dict()), 201


@tickets_bp.route('/<id_>', methods=['GET'])
def get_ticket(id_):
    t = _get_or_404(Ticket, id_)
    return jsonify(t.to_dict())


@tickets_bp.route('/<id_>', methods=['PUT', 'PATCH'])
@jwt_required_optional
def update_ticket(id_):
    t = _get_or_404(Ticket, id_)
    data = request.get_json() or {}
    status_changed = 'status' in data and data['status'] != t.status
    for field in ('subject', 'description', 'status', 'priority', 'assignee_id'):
        if field in data:
            setattr(t, field, data[field])
    if status_changed:
        from datetime import datetime, timezone
        t.status_changed_at = datetime.utcnow().replace(tzinfo=timezone.utc)
    t.save()
    
    # emit hook for ticket updated so handlers (including defaults) can
    # create notifications or perform other side-effects
    try:
        send_ticket_updated(t)
    except Exception:
        import logging

        logging.exception('error running ticket.updated hooks')
    
    return jsonify(t.to_dict())


@tickets_bp.route('/<id_>', methods=['DELETE'])
@jwt_required_optional
def delete_ticket(id_):
    t = _get_or_404(Ticket, id_)
    t.delete(soft=True)
    
    # emit hook for ticket deleted so handlers (including defaults) can
    # create notifications or perform other side-effects
    try:
        send_ticket_deleted(t)
    except Exception:
        import logging

        logging.exception('error running ticket.deleted hooks')

    return '', 204


@tickets_bp.route('/<ticket_id>/messages', methods=['GET'])
@jwt_required_optional
def get_ticket_messages(ticket_id):
    ticket = _get_or_404(Ticket, ticket_id)
    comments = Comment.active().filter_by(ticket_id=ticket.id).order_by(Comment.created_at).all()
    return jsonify([c.to_dict() for c in comments])


@tickets_bp.route('/<ticket_id>/messages', methods=['POST'])
@jwt_required_optional
def create_ticket_message(ticket_id):
    ticket = _get_or_404(Ticket, ticket_id)
    
    # Get current user from JWT token
    identity = get_jwt_identity()
    try:
        current_user_id = uuid.UUID(identity)
    except ValueError:
        abort(401, 'invalid token')
    
    data = request.get_json() or {}
    if not data.get('content'):
        abort(400, 'content is required')
    
    # Use current user as author if not specified, or validate if specified
    author_id = data.get('author_id', str(current_user_id))
    if author_id != str(current_user_id):
        # Only allow specifying different author if current user is admin/staff
        # For now, require author_id to match current user
        abort(403, 'cannot post as different user')
    
    author = User.query.filter_by(id=author_id).first()
    if not author:
        abort(400, 'author not found')
    
    parent_message_id = data.get('parent_message_id')
    if parent_message_id:
        parent_comment = Comment.query.filter_by(id=parent_message_id, ticket_id=ticket.id).first()
        if not parent_comment:
            abort(400, 'parent_message_id not found in this ticket')

    c = Comment(
        content=data['content'],
        ticket_id=ticket.id,
        author_id=author_id,
        parent_comment_id=parent_message_id
    )
    c.save()

    try:
        send_comment_created(c)
    except Exception:
        import logging
        logging.exception('error running comment.created hooks')

    return jsonify(c.to_dict()), 201
