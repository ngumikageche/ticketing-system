from app.models.base import BaseModel, db
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy import event
from app.models.notification import Notification


class Testing(BaseModel):
    __tablename__ = 'testing'

    ticket_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('tickets.id'), nullable=False)
    user_id = db.Column(PG_UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, in_progress, passed, failed
    test_type = db.Column(db.String(50), default='manual')  # unit, integration, manual, etc.
    results = db.Column(db.Text)  # Test results or notes

    # Relationships
    ticket = db.relationship('Ticket', back_populates='testing')
    tester = db.relationship('User', back_populates='testing_sessions')

    __table_args__ = (
        db.Index('ix_testing_status', 'status'),
        db.Index('ix_testing_ticket_id', 'ticket_id'),
        db.Index('ix_testing_user_id', 'user_id'),
    )

    @classmethod
    def create_for_ticket(cls, ticket, user, **kwargs):
        """Create a testing instance for a ticket, ensuring ticket is resolved"""
        if ticket.status.lower() != 'resolved':
            raise ValueError("Testing can only be created for tickets with status 'resolved'")
        return cls(ticket_id=ticket.id, user_id=user.id, **kwargs)

    def update_status(self, new_status, commit=True):
        """Update testing status and handle ticket status changes"""
        old_status = self.status
        self.status = new_status
        
        # Ensure ticket relationship is loaded
        ticket = self.ticket
        
        if new_status == 'passed' and old_status != 'passed':
            # When test passes, close the ticket
            ticket.status = 'Closed'  # Match the casing used in existing data
            ticket.status_changed_at = db.func.now()
            db.session.add(ticket)
        elif new_status == 'failed' and old_status != 'failed':
            # When test fails, set ticket back to In Progress for rework
            ticket.status = 'In Progress'
            ticket.status_changed_at = db.func.now()
            db.session.add(ticket)
        
        # Notify the assignee about the testing result
        if new_status in ('passed', 'failed') and ticket.assignee_id:
            notification = Notification(
                user_id=ticket.assignee_id,
                type='testing_result',
                message=f"Testing for ticket #{ticket.ticket_id} has been marked as {new_status}.",
                related_id=ticket.id,
                related_type='ticket'
            )
            db.session.add(notification)
        
        db.session.add(self)
        if commit:
            db.session.commit()