from flask import Blueprint, request, jsonify, abort
from app.models.ticket import Ticket
from app.models.user import User
from app.models.notification import Notification
from app.hooks import send_ticket_created, send_ticket_updated, send_ticket_deleted
from app.models.base import db
import uuid

tickets_bp = Blueprint('tickets', __name__)


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

    return jsonify(ticket.to_dict()), 201


@tickets_bp.route('/<id_>', methods=['GET'])
def get_ticket(id_):
    t = _get_or_404(Ticket, id_)
    return jsonify(t.to_dict())


@tickets_bp.route('/<id_>', methods=['PUT', 'PATCH'])
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
