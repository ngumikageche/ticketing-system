"""Add conversation_id and conversation_title to notifications

Revision ID: 5c1d33682678
Revises: a72b84d6a787
Create Date: 2025-11-19 11:21:04.354395

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5c1d33682678'
down_revision = 'a72b84d6a787'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('notifications', sa.Column('conversation_id', sa.UUID(), nullable=True))
    op.add_column('notifications', sa.Column('conversation_title', sa.String(length=200), nullable=True))
    op.create_foreign_key('fk_notifications_conversation_id', 'notifications', 'conversations', ['conversation_id'], ['id'])


def downgrade():
    op.drop_constraint('fk_notifications_conversation_id', 'notifications', type_='foreignkey')
    op.drop_column('notifications', 'conversation_title')
    op.drop_column('notifications', 'conversation_id')
