from flask import Blueprint, request, jsonify, abort
from app.models.ticket import Ticket
from app.models.user import User
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
    if 'subject' not in data or 'requester_id' not in data:
        abort(400, 'subject and requester_id are required')

    # Ensure requester exists
    requester = User.query.filter_by(id=data['requester_id']).first()
    if not requester:
        abort(400, 'requester not found')

    ticket = Ticket(
        ticket_id=data.get('ticket_id') or f"#{uuid.uuid4().hex[:8]}",
        subject=data.get('subject'),
        description=data.get('description'),
        status=data.get('status', 'OPEN'),
        priority=data.get('priority', 'MEDIUM'),
        requester_id=data['requester_id'],
        assignee_id=data.get('assignee_id'),
    )
    ticket.save()
    return jsonify(ticket.to_dict()), 201


@tickets_bp.route('/<id_>', methods=['GET'])
def get_ticket(id_):
    t = _get_or_404(Ticket, id_)
    return jsonify(t.to_dict())


@tickets_bp.route('/<id_>', methods=['PUT', 'PATCH'])
def update_ticket(id_):
    t = _get_or_404(Ticket, id_)
    data = request.get_json() or {}
    for field in ('subject', 'description', 'status', 'priority', 'assignee_id'):
        if field in data:
            setattr(t, field, data[field])
    t.save()
    return jsonify(t.to_dict())


@tickets_bp.route('/<id_>', methods=['DELETE'])
def delete_ticket(id_):
    hard = request.args.get('hard', 'false').lower() in ('1', 'true', 'yes')
    t = _get_or_404(Ticket, id_)
    if hard:
        db.session.delete(t)
        db.session.commit()
        return '', 204
    else:
        t.delete(soft=True)
        return '', 204
