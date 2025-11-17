from flask import Blueprint, request, jsonify, abort
from app.models.comment import Comment
from app.models.ticket import Ticket
from app.models.user import User
from app.models.notification import Notification
from app.hooks import send_comment_created, send_comment_updated, send_comment_deleted
from app.models.base import db

comments_bp = Blueprint('comments', __name__)


def _get_or_404(model, id_):
    if not id_:
        abort(400, 'id required')
    obj = model.query.filter_by(id=id_).first()
    if not obj:
        abort(404)
    return obj


@comments_bp.route('/', methods=['GET'])
def list_comments():
    comments = Comment.active().all()
    return jsonify([c.to_dict() for c in comments])


@comments_bp.route('/', methods=['POST'])
def create_comment():
    data = request.get_json() or {}
    if not data.get('content') or not data.get('ticket_id') or not data.get('author_id'):
        abort(400, 'content, ticket_id and author_id are required')
    # validate relations
    ticket = Ticket.query.filter_by(id=data['ticket_id']).first()
    if not ticket:
        abort(400, 'ticket not found')
    author = User.query.filter_by(id=data['author_id']).first()
    if not author:
        abort(400, 'author not found')
    parent_comment_id = data.get('parent_comment_id')
    parent_comment = None
    if parent_comment_id:
        parent_comment = Comment.query.filter_by(id=parent_comment_id).first()
        if not parent_comment or parent_comment.ticket_id != ticket.id:
            abort(400, 'invalid parent_comment_id')

    c = Comment(
        content=data['content'],
        ticket_id=data['ticket_id'],
        author_id=data['author_id'],
        parent_comment_id=parent_comment_id
    )
    c.save()

    # emit hook for comment created so handlers (including defaults) can
    # create notifications or perform other side-effects
    try:
        send_comment_created(c)
    except Exception:
        # don't let hook errors bubble to API clients
        import logging

        logging.exception('error running comment.created hooks')

    return jsonify(c.to_dict()), 201


@comments_bp.route('/<id_>', methods=['GET'])
def get_comment(id_):
    c = _get_or_404(Comment, id_)
    return jsonify(c.to_dict())


@comments_bp.route('/<id_>', methods=['PUT', 'PATCH'])
def update_comment(id_):
    c = _get_or_404(Comment, id_)
    data = request.get_json() or {}
    if 'content' in data:
        c.content = data['content']
    c.save()
    
    try:
        send_comment_updated(c)
    except Exception:
        import logging

        logging.exception('error running comment.updated hooks')
    
    return jsonify(c.to_dict())


@comments_bp.route('/<id_>', methods=['DELETE'])
def delete_comment(id_):
    c = _get_or_404(Comment, id_)
    c.delete(soft=True)
    try:
        send_comment_deleted(c)
    except Exception:
        import logging

        logging.exception('error running comment.deleted hooks')

    return '', 204
