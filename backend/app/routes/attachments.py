from flask import Blueprint, request, jsonify, abort
from app.models.media import Media
from app.models.ticket import Ticket
from app.models.user import User
from app.models.notification import Notification
from app.hooks import send_attachment_created, send_attachment_updated, send_attachment_deleted
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
    # Return media objects for attachments. Supports optional query params
    # to filter by owner: ticket_id, message_id, comment_id, kb_article_id, user_id.
    # This enables per-entity attachment fetches (e.g., attachments for a ticket)
    # without returning the full dataset to the client.
    args = request.args
    query = Media.active()
    filters_applied = False
    if 'ticket_id' in args:
        query = query.filter_by(ticket_id=args.get('ticket_id'))
        filters_applied = True
    if 'message_id' in args:
        query = query.filter_by(message_id=args.get('message_id'))
        filters_applied = True
    if 'comment_id' in args:
        query = query.filter_by(comment_id=args.get('comment_id'))
        filters_applied = True
    if 'kb_article_id' in args:
        query = query.filter_by(kb_article_id=args.get('kb_article_id'))
        filters_applied = True
    if 'user_id' in args:
        query = query.filter_by(user_id=args.get('user_id'))
        filters_applied = True
    if 'testing_id' in args:
        query = query.filter_by(testing_id=args.get('testing_id'))
        filters_applied = True

    if filters_applied:
        items = query.all()
    else:
        # No filters: return all media entries - keep backward compatibility
        items = Media.active().all()
    return jsonify([a.to_dict() for a in items])


@attachments_bp.route('/', methods=['POST'])
def create_attachment():
    data = request.get_json() or {}
    # Support multiple attachment owners (ticket, message, comment, kb_article, user)
    required = ('filename', 'url', 'uploaded_by')
    if not all(k in data for k in required):
        abort(400, f'required fields: {required}')

    owner_fields = ['ticket_id', 'message_id', 'comment_id', 'kb_article_id', 'user_id']
    # Add testing_id as an owner type as well
    owner_fields.append('testing_id')
    if not any(f in data for f in owner_fields):
        # To preserve previous behaviour, require `ticket_id` if no other owner is set
        abort(400, 'one of ticket_id|message_id|comment_id|kb_article_id|user_id is required')

    # Validate any referenced objects exist
    if 'ticket_id' in data and not Ticket.query.filter_by(id=data['ticket_id']).first():
        abort(400, 'ticket not found')
    if 'testing_id' in data:
        from app.models.testing import Testing
        if not Testing.query.filter_by(id=data['testing_id']).first():
            abort(400, 'testing session not found')
    if not User.query.filter_by(id=data['uploaded_by']).first():
        abort(400, 'uploader not found')
    # Map legacy `type` to `resource_type` for Media. Keep a 'type' alias
    # in responses for backward compatibility.
    a = Media(
        filename=data['filename'],
        url=data['url'],
        secure_url=data.get('secure_url') or data.get('url'),
        cloudinary_public_id=data.get('cloudinary_public_id') or data.get('public_id'),
        resource_type=data.get('type', 'raw'),
        mime_type=data.get('mime_type'),
        size=data.get('size'),
        ticket_id=data.get('ticket_id'),
        message_id=data.get('message_id'),
        comment_id=data.get('comment_id'),
    testing_id=data.get('testing_id'),
        kb_article_id=data.get('kb_article_id'),
        user_id=data.get('user_id'),
        uploaded_by=data['uploaded_by'],
        alt_text=data.get('alt_text'),
    )
    a.save()
    
    # emit hook for attachment created so handlers (including defaults) can
    # create notifications or perform other side-effects
    try:
        send_attachment_created(a)
    except Exception:
        import logging

        logging.exception('error running attachment.created hooks')
    
    # Keep backward-compatible fields in the payload
    payload = a.to_dict()
    payload['type'] = data.get('type', payload.get('resource_type') or 'raw')
    
    # Return all attachments
    items = Media.active().all()
    return jsonify([a.to_dict() for a in items]), 201


@attachments_bp.route('/<id_>', methods=['GET'])
def get_attachment(id_):
    a = _get_or_404(Media, id_)
    return jsonify(a.to_dict())


@attachments_bp.route('/<id_>', methods=['PUT', 'PATCH'])
def update_attachment(id_):
    a = _get_or_404(Media, id_)
    data = request.get_json() or {}
    for field in ('filename', 'url', 'mime_type', 'resource_type', 'size', 'secure_url', 'alt_text'):
        if field in data:
            setattr(a, field, data[field])
    a.save()
    
    # emit hook for attachment updated so handlers (including defaults) can
    # create notifications or perform other side-effects
    try:
        send_attachment_updated(a)
    except Exception:
        import logging

        logging.exception('error running attachment.updated hooks')
    
    payload = a.to_dict()
    payload['type'] = data.get('type', payload.get('resource_type') or 'raw')
    
    # Return all attachments
    items = Media.active().all()
    return jsonify([a.to_dict() for a in items])


@attachments_bp.route('/<id_>', methods=['DELETE'])
def delete_attachment(id_):
    a = _get_or_404(Media, id_)
    ticket = a.ticket
    
    a.delete(soft=True)
    
    # emit hook for attachment deleted so handlers (including defaults) can
    # create notifications or perform other side-effects
    try:
        send_attachment_deleted(a)
    except Exception:
        import logging

        logging.exception('error running attachment.deleted hooks')

    return '', 204
