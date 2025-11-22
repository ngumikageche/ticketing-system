from app.models.base import db
from app.models.user import User
from app.models.ticket import Ticket
from app.models.media import Media


def test_create_media_and_associate_with_ticket(client):
    # create a user and ticket via models directly to avoid auth checks in routes
    with client.application.app_context():
        u = User(email='mediauser@example.com', name='Media User')
        u.set_password('secret')
        u.save()

        t = Ticket(subject='Ticket w media', description='Has an attachment', requester_id=u.id)
        t.save()

        m = Media(
            filename='example.txt',
            mime_type='text/plain',
            size=42,
            cloudinary_public_id='abc-123',
            url='http://res.cloudinary.com/abc-123',
            secure_url='https://res.cloudinary.com/abc-123',
            uploaded_by=u.id,
            ticket_id=t.id,
        )
        m.save()

        # refresh from DB and assert
        assert m.id is not None
        assert m.ticket_id == t.id
        # ensure relationship resolves
        assert m.ticket.id == t.id
        assert t.media[0].id == m.id


def test_user_profile_media_assignment(client):
    with client.application.app_context():
        u = User(email='pmuser@example.com', name='ProfileMedia User')
        u.set_password('secret')
        u.save()

        m = Media(
            filename='avatar.png',
            mime_type='image/png',
            size=1234,
            cloudinary_public_id='avatar-123',
            url='http://res.cloudinary.com/avatar-123.png',
            secure_url='https://res.cloudinary.com/avatar-123.png',
            uploaded_by=u.id,
            user_id=u.id,
        )
        m.save()

        # Set user's profile_media_id to the created media
        u.profile_media_id = m.id
        u.save()

        assert u.profile_media_id == m.id
        assert u.profile_media.id == m.id
        assert u.media[0].id == m.id
