from flask import Blueprint, request, jsonify, abort, make_response
from flask import current_app, redirect
from app.models.user import User
from app.models.base import db
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    set_access_cookies,
    set_refresh_cookies,
    unset_jwt_cookies,
)
import datetime
import uuid

auth_bp = Blueprint('auth', __name__)

# Security questions with correct answers
SECURITY_QUESTIONS = [
    {
        "question": "Which year was NexTek started?",
        "answer": "2023"
    },
    {
        "question": "What building is the company office located at?",
        "answer": "muguku business center"
    }
]


@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json() or {}
    
    required_fields = ['email', 'password', 'name', 'security_answers']
    for field in required_fields:
        if field not in data:
            abort(400, f'{field} is required')
    
    email = data['email'].strip().lower()
    password = data['password']
    name = data['name'].strip()
    security_answers = data['security_answers']  # Should be a list of answers
    
    # Validate email format
    if '@' not in email or '.' not in email:
        abort(400, 'invalid email format')
    
    # Validate password strength
    if len(password) < 8:
        abort(400, 'password must be at least 8 characters long')
    
    # Validate security answers
    if not isinstance(security_answers, list) or len(security_answers) != len(SECURITY_QUESTIONS):
        abort(400, 'must provide answers for all security questions')
    
    # Check how many answers are correct
    correct_count = 0
    for i, answer in enumerate(security_answers):
        if isinstance(answer, str) and answer.strip().lower() == SECURITY_QUESTIONS[i]['answer']:
            correct_count += 1
    
    # Assign role based on correct answers
    if correct_count == len(SECURITY_QUESTIONS):
        role = 'Admin'
    elif correct_count >= 1:
        role = 'CUSTOMER'
    else:
        abort(400, 'at least one security answer must be correct')
    
    # Check if user already exists
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        if existing_user.is_deleted:
            # Reactivate soft-deleted user
            existing_user.is_deleted = False
            existing_user.name = name
            existing_user.set_password(password)
            existing_user.role = role
            # Store the first correct answer as security question/answer
            for i, answer in enumerate(security_answers):
                if answer.strip().lower() == SECURITY_QUESTIONS[i]['answer']:
                    existing_user.security_question = SECURITY_QUESTIONS[i]['question']
                    existing_user.set_security_answer(answer.strip().lower())
                    break
            existing_user.save()
            users = User.active().all()
            return jsonify([u.to_dict() for u in users]), 200
        else:
            abort(409, 'user already exists')
    
    # Create new user
    user = User(
        email=email,
        name=name,
        role=role
    )
    user.set_password(password)
    
    # Store the first correct answer as security question/answer for password recovery
    for i, answer in enumerate(security_answers):
        if answer.strip().lower() == SECURITY_QUESTIONS[i]['answer']:
            user.security_question = SECURITY_QUESTIONS[i]['question']
            user.set_security_answer(answer.strip().lower())
            break
    
    user.save()
    
    # Create access and refresh tokens and set them in httpOnly cookies
    access = create_access_token(identity=str(user.id), expires_delta=datetime.timedelta(hours=1))
    refresh = create_refresh_token(identity=str(user.id), expires_delta=datetime.timedelta(days=30))
    body = {'user': user.to_dict()}
    # For non-production environments, also return tokens in JSON for dev/test tools and localStorage fallback.
    if current_app.config.get('ENV') != 'production':
        body['access_token'] = access
        body['refresh_token'] = refresh
    resp = make_response(jsonify(body), 201)
    set_access_cookies(resp, access)
    set_refresh_cookies(resp, refresh)
    
    # Return all users instead of just the created user
    users = User.active().all()
    body['users'] = [u.to_dict() for u in users]
    resp = make_response(jsonify(body), 201)
    set_access_cookies(resp, access)
    set_refresh_cookies(resp, refresh)
    # Return JSON response with cookies set; frontend SPA should handle navigation.
    return resp


@auth_bp.route('/security-questions', methods=['GET'])
def get_security_questions():
    """Get available security questions for signup"""
    questions = [q['question'] for q in SECURITY_QUESTIONS]
    return jsonify({
        'questions': questions
    }), 200


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    if 'email' not in data or 'password' not in data:
        abort(400, 'email and password are required')
    u = User.active().filter_by(email=data['email']).first()
    if not u or not u.check_password(data['password']):
        abort(401, 'invalid credentials')
    # Create access and refresh tokens and set as httpOnly cookies
    access = create_access_token(identity=str(u.id), expires_delta=datetime.timedelta(hours=1))
    refresh = create_refresh_token(identity=str(u.id), expires_delta=datetime.timedelta(days=30))
    body = {'user': u.to_dict()}
    if current_app.config.get('ENV') != 'production':
        body['access_token'] = access
        body['refresh_token'] = refresh
    resp = make_response(jsonify(body), 200)
    set_access_cookies(resp, access)
    set_refresh_cookies(resp, refresh)
    # Return JSON response with cookies set; frontend SPA should handle navigation.
    return resp


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_access():
    identity = get_jwt_identity()
    new_access = create_access_token(identity=str(identity), expires_delta=datetime.timedelta(hours=1))
    # In non-production, return new access token so client can keep localStorage fallback in sync
    body = {'msg': 'access token refreshed'}
    if current_app.config.get('ENV') != 'production':
        body['access_token'] = new_access
    resp = jsonify(body)
    set_access_cookies(resp, new_access)
    return resp, 200


@auth_bp.route('/logout', methods=['POST'])
def logout():
    resp = jsonify({'msg': 'logout successful'})
    unset_jwt_cookies(resp)
    return resp, 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    identity = get_jwt_identity()
    try:
        user_id = uuid.UUID(identity)
    except ValueError:
        abort(401, 'invalid token')
    user = User.active().filter_by(id=user_id).first()
    if not user:
        abort(404, 'user not found')
    return jsonify(user.to_dict()), 200
