"""notifications

Revision ID: bbe87cf95669
Revises: 5e2796a142e9
Create Date: 2025-11-22 09:00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = 'bbe87cf95669'
down_revision = '5e2796a142e9'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)

    if 'notifications' not in inspector.get_table_names():
        op.create_table(
            'notifications',
            sa.Column('user_id', sa.UUID(), nullable=False),
            sa.Column('type', sa.String(50), nullable=False),
            sa.Column('message', sa.Text(), nullable=False),
            sa.Column('related_id', sa.UUID(), nullable=True),
            sa.Column('related_type', sa.String(50), nullable=True),
            sa.Column('is_read', sa.Boolean(), nullable=True),
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('is_deleted', sa.Boolean(), nullable=False),
            sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'])
        )


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)

    if 'notifications' in inspector.get_table_names():
        op.drop_table('notifications')

