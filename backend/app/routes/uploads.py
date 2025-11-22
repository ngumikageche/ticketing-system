from flask import Blueprint, jsonify, abort, current_app
from flask_jwt_extended import jwt_required
import time
import hashlib

try:
    # Prefer using Cloudinary SDK if installed
    import cloudinary
    import cloudinary.utils
    CLOUDINARY_AVAILABLE = True
except Exception:
    cloudinary = None
    CLOUDINARY_AVAILABLE = False

uploads_bp = Blueprint('uploads', __name__)


@uploads_bp.route('/sign', methods=['GET'])
@jwt_required()
def sign_upload():
    """Return a short-lived signature and upload info for client direct uploads
    This endpoint returns a JSON structure the client can use to upload to
    Cloudinary directly (signature, timestamp, api_key, cloud_name, optional upload_preset).
    Requires authenticated user (JWT)."""
    if not current_app.config.get('CLOUDINARY_ENABLED'):
        abort(501, 'Cloudinary is not configured on this server')

    timestamp = int(time.time())
    api_secret = current_app.config.get('CLOUDINARY_API_SECRET')
    api_key = current_app.config.get('CLOUDINARY_API_KEY')
    cloud_name = current_app.config.get('CLOUDINARY_CLOUD_NAME')
    upload_preset = current_app.config.get('CLOUDINARY_UPLOAD_PRESET')

    # Client may want to sign additional parameters (folder, eager transformations, etc.)
    # For a basic timestamp-based upload signature we will compute the signature over
    # `timestamp={timestamp}` string per Cloudinary's API signing algorithm.
    if CLOUDINARY_AVAILABLE:
        # Use the SDK helper if available for accuracy
        params_to_sign = { 'timestamp': timestamp }
        signature = cloudinary.utils.api_sign_request(params_to_sign, api_secret)
    else:
        # Fallback: simple signing for the timestamp param (sha1 of 'timestamp={ts}{secret}')
        to_sign = f"timestamp={timestamp}{api_secret}"
        signature = hashlib.sha1(to_sign.encode('utf-8')).hexdigest()

    result = {
        'api_key': api_key,
        'timestamp': timestamp,
        'signature': signature,
        'cloud_name': cloud_name,
        'upload_preset': upload_preset,
    }
    return jsonify(result)
