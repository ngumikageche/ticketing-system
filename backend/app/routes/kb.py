from flask import Blueprint, request, jsonify, abort
from app.models.kb import KnowledgeBaseArticle, Tag
from app.models.user import User
from app.models.notification import Notification
from app.hooks import send_kb_article_created, send_kb_article_updated, send_kb_article_deleted
from app.models.base import db
from flask_jwt_extended import jwt_required, get_jwt_identity
import uuid

kb_bp = Blueprint('kb', __name__)


def _get_or_404(model, id_):
    if not id_:
        abort(400, 'id required')
    obj = model.query.filter_by(id=id_).first()
    if not obj:
        abort(404)
    return obj


@kb_bp.route('/articles', methods=['GET'])
def list_articles():
    articles = KnowledgeBaseArticle.active().all()
    return jsonify([a.to_dict() for a in articles])


@kb_bp.route('/articles', methods=['POST'])
@jwt_required()
def create_article():
    identity = get_jwt_identity()
    try:
        author_id = uuid.UUID(identity)
    except ValueError:
        abort(401, 'invalid token')
    author = User.active().filter_by(id=author_id).first()
    if not author:
        abort(401, 'user not found or disabled')
    
    data = request.get_json() or {}
    if not data.get('title') or not data.get('content'):
        abort(400, 'title and content are required')
    
    a = KnowledgeBaseArticle(
        title=data['title'],
        content=data['content'],
        author_id=author_id,
        is_public=data.get('is_public', True),
    )
    # handle tags by name (create if not exist)
    tags = []
    for t in data.get('tags', []):
        tag = Tag.query.filter_by(name=t).first()
        if not tag:
            tag = Tag(name=t)
            db.session.add(tag)
            db.session.flush()
        tags.append(tag)
    a.tags = tags
    a.save()
    
    # emit hook for kb article created so handlers (including defaults) can
    # create notifications or perform other side-effects
    try:
        send_kb_article_created(a)
    except Exception:
        import logging

        logging.exception('error running kb_article.created hooks')
    
    articles = KnowledgeBaseArticle.active().all()
    return jsonify([a.to_dict() for a in articles]), 201


@kb_bp.route('/articles/<id_>', methods=['GET'])
def get_article(id_):
    a = _get_or_404(KnowledgeBaseArticle, id_)
    return jsonify(a.to_dict())


@kb_bp.route('/articles/<id_>', methods=['PUT', 'PATCH'])
@jwt_required()
def update_article(id_):
    identity = get_jwt_identity()
    try:
        user_id = uuid.UUID(identity)
    except ValueError:
        abort(401, 'invalid token')
    user = User.active().filter_by(id=user_id).first()
    if not user:
        abort(401, 'user not found or disabled')
    
    a = _get_or_404(KnowledgeBaseArticle, id_)
    # TODO: check if user is author or admin
    data = request.get_json() or {}
    for f in ('title', 'content', 'is_public'):
        if f in data:
            setattr(a, f, data[f])
    if 'tags' in data:
        tags = []
        for t in data['tags']:
            tag = Tag.query.filter_by(name=t).first()
            if not tag:
                tag = Tag(name=t)
                db.session.add(tag)
                db.session.flush()
            tags.append(tag)
        a.tags = tags
    a.save()
    
    # emit hook for kb article updated so handlers (including defaults) can
    # create notifications or perform other side-effects
    try:
        send_kb_article_updated(a)
    except Exception:
        import logging

        logging.exception('error running kb_article.updated hooks')
    
    articles = KnowledgeBaseArticle.active().all()
    return jsonify([a.to_dict() for a in articles])


@kb_bp.route('/articles/<id_>', methods=['DELETE'])
@jwt_required()
def delete_article(id_):
    identity = get_jwt_identity()
    try:
        user_id = uuid.UUID(identity)
    except ValueError:
        abort(401, 'invalid token')
    user = User.active().filter_by(id=user_id).first()
    if not user:
        abort(401, 'user not found or disabled')
    
    a = _get_or_404(KnowledgeBaseArticle, id_)
    # TODO: check if user is author or admin
    a.delete(soft=True)
    
    # emit hook for kb article deleted so handlers (including defaults) can
    # create notifications or perform other side-effects
    try:
        send_kb_article_deleted(a)
    except Exception:
        import logging

        logging.exception('error running kb_article.deleted hooks')

    return '', 204


@kb_bp.route('/tags', methods=['GET'])
def list_tags():
    tags = Tag.active().all()
    return jsonify([t.to_dict() for t in tags])


@kb_bp.route('/tags', methods=['POST'])
def create_tag():
    data = request.get_json() or {}
    if not data.get('name'):
        abort(400, 'name is required')
    if Tag.query.filter_by(name=data['name']).first():
        abort(400, 'tag already exists')
    t = Tag(name=data['name'], color=data.get('color'))
    t.save()
    tags = Tag.active().all()
    return jsonify([t.to_dict() for t in tags]), 201


@kb_bp.route('/tags/<id_>', methods=['GET'])
def get_tag(id_):
    t = _get_or_404(Tag, id_)
    return jsonify(t.to_dict())


@kb_bp.route('/tags/<id_>', methods=['PUT', 'PATCH'])
def update_tag(id_):
    t = _get_or_404(Tag, id_)
    data = request.get_json() or {}
    if 'name' in data:
        t.name = data['name']
    if 'color' in data:
        t.color = data['color']
    t.save()
    tags = Tag.active().all()
    return jsonify([t.to_dict() for t in tags])


@kb_bp.route('/tags/<id_>', methods=['DELETE'])
def delete_tag(id_):
    hard = request.args.get('hard', 'false').lower() in ('1', 'true', 'yes')
    t = _get_or_404(Tag, id_)
    if hard:
        db.session.delete(t)
        db.session.commit()
        return '', 204
    else:
        t.delete(soft=True)
        return '', 204
