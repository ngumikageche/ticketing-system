import json


def test_users_and_tickets_crud(client):
    # Create a user
    payload = {"email": "testuser@example.com", "name": "Test User", "password": "secret"}
    rv = client.post('/api/users', data=json.dumps(payload), content_type='application/json')
    assert rv.status_code == 201
    user = rv.get_json()
    assert user['email'] == payload['email']
    user_id = user['id']

    # Get the user
    rv = client.get(f'/api/users/{user_id}')
    assert rv.status_code == 200
    got = rv.get_json()
    assert got['email'] == payload['email']

    # Create a ticket for the user
    ticket_payload = {"subject": "Test ticket", "description": "Details", "requester_id": user_id}
    rv = client.post('/api/tickets', data=json.dumps(ticket_payload), content_type='application/json')
    assert rv.status_code == 201
    ticket = rv.get_json()
    assert ticket['subject'] == ticket_payload['subject']
    ticket_id = ticket['id']

    # Get the ticket
    rv = client.get(f'/api/tickets/{ticket_id}')
    assert rv.status_code == 200
    got_t = rv.get_json()
    assert got_t['subject'] == ticket_payload['subject']
