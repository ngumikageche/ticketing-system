# or vim, code, etc.
"""Add ticket_id sequence and trigger for automatic ticket numbering

Creates a sequence `ticket_seq` starting at 1000 and a trigger on the
`tickets` table to set `ticket_id` to '#' || nextval('ticket_seq') before insert.
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = 'f9b1c3a7d2b1'
down_revision = 'e65e93654cf0'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE SEQUENCE IF NOT EXISTS ticket_seq START 1000;

        CREATE OR REPLACE FUNCTION set_ticket_id()
        RETURNS TRIGGER AS $$
        BEGIN
            IF NEW.ticket_id IS NULL OR NEW.ticket_id = '' THEN
                NEW.ticket_id = '#' || NEXTVAL('ticket_seq');
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
                WHERE t.tgname = 'trigger_set_ticket_id' AND c.relname = 'tickets'
            ) THEN
                CREATE TRIGGER trigger_set_ticket_id
                BEFORE INSERT ON tickets
                FOR EACH ROW
                EXECUTE PROCEDURE set_ticket_id();
            END IF;
        END$$;
    """)


def downgrade():
    op.execute("DROP TRIGGER IF EXISTS trigger_set_ticket_id ON tickets;")
    op.execute("DROP FUNCTION IF EXISTS set_ticket_id();")
    op.execute("DROP SEQUENCE IF EXISTS ticket_seq;")
