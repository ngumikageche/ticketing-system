from app.models.base import db
import json


def test_sign_upload_returns_payload(client):
    # Configure Cloudinary values within the test app context
    with client.application.app_context():
        client.application.config['CLOUDINARY_ENABLED'] = True
        client.application.config['CLOUDINARY_API_SECRET'] = 'test-secret'
        client.application.config['CLOUDINARY_API_KEY'] = 'test-key'
        client.application.config['CLOUDINARY_CLOUD_NAME'] = 'test-cloud'
        client.application.config['CLOUDINARY_UPLOAD_PRESET'] = 'preset'

    # Create a user and get an access token via signup
    payload = {
        'email': 'uploadtest@example.com',
        'password': 'supersecret',
        'name': 'Uploader',
        'security_answers': ['2023', 'muguku business center']
    }
    resp = client.post('/api/auth/signup', json=payload)
    assert resp.status_code == 201
    data = resp.get_json()
    token = data['access_token']

    # Call sign endpoint
    headers = { 'Authorization': f'Bearer {token}' }
    r = client.get('/api/uploads/sign', headers=headers)
    assert r.status_code == 200, r.get_data(as_text=True)
    j = r.get_json()
    assert j['api_key'] == 'test-key'
    assert 'timestamp' in j and 'signature' in j and j['cloud_name'] == 'test-cloud'
