from flask import Blueprint, request, jsonify, abort
from app.models.attachment import Attachment
from app.models.ticket import Ticket
from app.models.user import User
from app.models.base import db

attachments_bp = Blueprint('attachments', __name__)


def _get_or_404(model, id_):
    if not id_:
        abort(400, 'id required')
    obj = model.query.filter_by(id=id_).first()
    if not obj:
        abort(404)
    return obj


@attachments_bp.route('/', methods=['GET'])
def list_attachments():
    items = Attachment.active().all()
    return jsonify([a.to_dict() for a in items])


@attachments_bp.route('/', methods=['POST'])
def create_attachment():
    data = request.get_json() or {}
    required = ('filename', 'url', 'ticket_id', 'uploaded_by')
    if not all(k in data for k in required):
        abort(400, f'required fields: {required}')
    if not Ticket.query.filter_by(id=data['ticket_id']).first():
        abort(400, 'ticket not found')
    if not User.query.filter_by(id=data['uploaded_by']).first():
        abort(400, 'uploader not found')
    a = Attachment(
        filename=data['filename'],
        url=data['url'],
        type=data.get('type', 'OTHER'),
        size=data.get('size'),
        ticket_id=data['ticket_id'],
        uploaded_by=data['uploaded_by'],
    )
    a.save()
    return jsonify(a.to_dict()), 201


@attachments_bp.route('/<id_>', methods=['GET'])
def get_attachment(id_):
    a = _get_or_404(Attachment, id_)
    return jsonify(a.to_dict())


@attachments_bp.route('/<id_>', methods=['PUT', 'PATCH'])
def update_attachment(id_):
    a = _get_or_404(Attachment, id_)
    data = request.get_json() or {}
    for field in ('filename', 'url', 'type', 'size'):
        if field in data:
            setattr(a, field, data[field])
    a.save()
    return jsonify(a.to_dict())


@attachments_bp.route('/<id_>', methods=['DELETE'])
def delete_attachment(id_):
    hard = request.args.get('hard', 'false').lower() in ('1', 'true', 'yes')
    a = _get_or_404(Attachment, id_)
    if hard:
        db.session.delete(a)
        db.session.commit()
        return '', 204
    else:
        a.delete(soft=True)
        return '', 204
