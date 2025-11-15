from flask import Blueprint, request, jsonify, abort
from app.models.kb import KnowledgeBaseArticle, Tag
from app.models.user import User
from app.models.base import db

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
def create_article():
    data = request.get_json() or {}
    if not data.get('title') or not data.get('content') or not data.get('author_id'):
        abort(400, 'title, content and author_id are required')
    if not User.query.filter_by(id=data['author_id']).first():
        abort(400, 'author not found')
    a = KnowledgeBaseArticle(
        title=data['title'],
        content=data['content'],
        author_id=data['author_id'],
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
    return jsonify(a.to_dict()), 201


@kb_bp.route('/articles/<id_>', methods=['GET'])
def get_article(id_):
    a = _get_or_404(KnowledgeBaseArticle, id_)
    return jsonify(a.to_dict())


@kb_bp.route('/articles/<id_>', methods=['PUT', 'PATCH'])
def update_article(id_):
    a = _get_or_404(KnowledgeBaseArticle, id_)
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
    return jsonify(a.to_dict())


@kb_bp.route('/articles/<id_>', methods=['DELETE'])
def delete_article(id_):
    hard = request.args.get('hard', 'false').lower() in ('1', 'true', 'yes')
    a = _get_or_404(KnowledgeBaseArticle, id_)
    if hard:
        db.session.delete(a)
        db.session.commit()
        return '', 204
    else:
        a.delete(soft=True)
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
    return jsonify(t.to_dict()), 201


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
    return jsonify(t.to_dict())


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
