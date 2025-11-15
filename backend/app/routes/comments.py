from flask import Blueprint, request, jsonify, abort
from app.models.comment import Comment
from app.models.ticket import Ticket
from app.models.user import User
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
    if not Ticket.query.filter_by(id=data['ticket_id']).first():
        abort(400, 'ticket not found')
    if not User.query.filter_by(id=data['author_id']).first():
        abort(400, 'author not found')
    c = Comment(content=data['content'], ticket_id=data['ticket_id'], author_id=data['author_id'])
    c.save()
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
    return jsonify(c.to_dict())


@comments_bp.route('/<id_>', methods=['DELETE'])
def delete_comment(id_):
    hard = request.args.get('hard', 'false').lower() in ('1', 'true', 'yes')
    c = _get_or_404(Comment, id_)
    if hard:
        db.session.delete(c)
        db.session.commit()
        return '', 204
    else:
        c.delete(soft=True)
        return '', 204
