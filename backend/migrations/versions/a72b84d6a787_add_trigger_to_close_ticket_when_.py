"""Add trigger to close ticket when testing passes

Revision ID: a72b84d6a787
Revises: 6500c2dfc28c
Create Date: 2025-11-19 09:22:55.956543

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a72b84d6a787'
down_revision = '6500c2dfc28c'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE OR REPLACE FUNCTION close_ticket_on_test_pass()
        RETURNS TRIGGER AS $$
        BEGIN
            IF NEW.status = 'passed' AND OLD.status != 'passed' THEN
                UPDATE tickets SET status = 'Closed', status_changed_at = NOW() WHERE id = NEW.ticket_id;
            ELSIF NEW.status = 'failed' AND OLD.status != 'failed' THEN
                UPDATE tickets SET status = 'In Progress', status_changed_at = NOW() WHERE id = NEW.ticket_id;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER trigger_close_ticket_on_test_pass
        AFTER UPDATE ON testing
        FOR EACH ROW
        EXECUTE FUNCTION close_ticket_on_test_pass();
    """)


def downgrade():
    op.execute("DROP TRIGGER IF EXISTS trigger_close_ticket_on_test_pass ON testing;")
    op.execute("DROP FUNCTION IF EXISTS close_ticket_on_test_pass();")
