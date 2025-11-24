"""Add status_changed_at to tickets

Revision ID: a8caf06493d2
Revises: bbe87cf95669
Create Date: 2025-11-22 09:15:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = 'a8caf06493d2'
down_revision = 'bbe87cf95669'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)

    columns = [c['name'] for c in inspector.get_columns('tickets')]
    if 'status_changed_at' not in columns:
        with op.batch_alter_table('tickets') as batch_op:
            batch_op.add_column(sa.Column('status_changed_at', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)

    columns = [c['name'] for c in inspector.get_columns('tickets')]
    if 'status_changed_at' in columns:
        with op.batch_alter_table('tickets') as batch_op:
            batch_op.drop_column('status_changed_at')

