"""empty message

Revision ID: 5e2796a142e9
Revises: f9b1c3a7d2b1
Create Date: 2025-11-17 08:39:39.091389

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '5e2796a142e9'
down_revision = 'f9b1c3a7d2b1'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)

    # Get existing columns on tickets
    columns = [c["name"] for c in inspector.get_columns("tickets")]

    with op.batch_alter_table("tickets", schema=None) as batch_op:
        # Only add requester_name if it doesn't already exist
        if "requester_name" not in columns:
            batch_op.add_column(
                sa.Column("requester_name", sa.String(length=200), nullable=True)
            )

        # Make requester_id nullable (idempotent if it's already nullable)
        batch_op.alter_column(
            "requester_id",
            existing_type=sa.UUID(),
            nullable=True,
        )


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)

    columns = [c["name"] for c in inspector.get_columns("tickets")]

    with op.batch_alter_table("tickets", schema=None) as batch_op:
        # Revert requester_id to NOT NULL (if that’s what you had originally)
        batch_op.alter_column(
            "requester_id",
            existing_type=sa.UUID(),
            nullable=False,
        )

        # Only drop requester_name if it exists
        if "requester_name" in columns:
            batch_op.drop_column("requester_name")

