from app.models.base import BaseModel, db
from sqlalchemy.dialects.postgresql import UUID as PG_UUID


article_tags = db.Table('article_tags',
    db.Column('article_id', PG_UUID(as_uuid=True), db.ForeignKey('kb_articles.id'), primary_key=True),
    db.Column('tag_id', PG_UUID(as_uuid=True), db.ForeignKey('tags.id'), primary_key=True)
)


class KnowledgeBaseArticle(BaseModel):
    __tablename__ = 'kb_articles'

    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    author_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    views = db.Column(db.Integer, default=0)
    is_public = db.Column(db.Boolean, default=True)

    author = db.relationship('User', back_populates='articles')
    tags = db.relationship('Tag', secondary=article_tags, back_populates='articles')
    # Optional media attached to knowledgebase articles
    media = db.relationship('Media', back_populates='kb_article', cascade='all, delete-orphan')


class Tag(BaseModel):
    __tablename__ = 'tags'

    name = db.Column(db.String(50), unique=True, nullable=False)
    color = db.Column(db.String(7), default='#3b82f6')

    articles = db.relationship('KnowledgeBaseArticle', secondary=article_tags, back_populates='tags')
