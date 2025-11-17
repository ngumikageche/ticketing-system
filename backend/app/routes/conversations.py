from flask import Blueprint, request, jsonify, abort
from app.models.conversation import Conversation
from app.models.conversation_participant import ConversationParticipant
from app.models.message import Message
from app.models.user import User
from app.models.ticket import Ticket
from app.hooks import send_conversation_created, send_message_created, send_message_deleted
from app.models.base import db
from flask_jwt_extended import jwt_required, get_jwt_identity
import uuid
from functools import wraps

conversations_bp = Blueprint('conversations', __name__)


def jwt_required_optional(fn):
    """JWT required decorator that allows OPTIONS requests through"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if request.method == 'OPTIONS':
            # Allow OPTIONS requests without authentication
            return fn(*args, **kwargs)
        return jwt_required()(fn)(*args, **kwargs)
    return wrapper


def _get_or_404(model, id_):
    if not id_:
        abort(400, 'id required')
    obj = model.query.filter_by(id=id_).first()
    if not obj:
        abort(404)
    return obj


@conversations_bp.route('/', methods=['GET'])
@jwt_required_optional
def list_conversations():
    # Get current user from JWT token
    identity = get_jwt_identity()
    try:
        current_user_id = uuid.UUID(identity)
    except ValueError:
        abort(401, 'invalid token')

    # Subquery of conversation ids where the current user is a participant
    participant_conv_ids = db.session.query(ConversationParticipant.conversation_id).filter_by(user_id=current_user_id)

    # Include conversations that are not direct OR where the user is a participant
    conversations = Conversation.active().filter(
        (Conversation.type != 'direct') | (Conversation.id.in_(participant_conv_ids))
    ).all()

    return jsonify([c.to_dict() for c in conversations])


@conversations_bp.route('/<id_>', methods=['GET'])
@jwt_required_optional
def get_conversation(id_):
    conv = _get_or_404(Conversation, id_)
    
    # Get current user from JWT token
    identity = get_jwt_identity()
    try:
        current_user_id = uuid.UUID(identity)
    except ValueError:
        abort(401, 'invalid token')
    
    # For direct conversations, check if user is a participant
    if conv.type == 'direct':
        participant = ConversationParticipant.query.filter_by(conversation_id=conv.id, user_id=current_user_id).first()
        if not participant:
            abort(403, 'not a participant in this direct conversation')
    
    # For group and ticket conversations, allow access to all authenticated users
    return jsonify(conv.to_dict())


@conversations_bp.route('/', methods=['POST'])
@jwt_required_optional
def create_conversation():
    data = request.get_json() or {}
    if not data.get('type'):
        abort(400, 'type is required')
    conv_type = data['type']
    if conv_type not in ['ticket', 'direct', 'group']:
        abort(400, 'invalid type')

    created_by_id = data.get('created_by_id')
    if not created_by_id:
        abort(400, 'created_by_id required')
    creator = User.query.filter_by(id=created_by_id).first()
    if not creator:
        abort(400, 'creator not found')

    conv = Conversation(
        type=conv_type,
        title=data.get('title'),
        ticket_id=data.get('ticket_id'),
        created_by_id=created_by_id
    )
    conv.save()

    # Add participants based on conversation type
    if conv_type == 'direct':
        recipient_id = data.get('recipient_id')
        if not recipient_id:
            abort(400, 'recipient_id required for direct conversations')
        recipient = User.query.filter_by(id=recipient_id).first()
        if not recipient:
            abort(400, 'recipient not found')
        
        # Add both creator and recipient as participants (avoid duplicates)
        if not ConversationParticipant.query.filter_by(conversation_id=conv.id, user_id=created_by_id).first():
            ConversationParticipant(conversation_id=conv.id, user_id=created_by_id).save()
        if not ConversationParticipant.query.filter_by(conversation_id=conv.id, user_id=recipient_id).first():
            ConversationParticipant(conversation_id=conv.id, user_id=recipient_id).save()
        
    elif conv_type == 'group':
        participants = data.get('participants', [])
        if not participants:
            abort(400, 'participants required for group conversations')
        for pid in participants:
            user = User.query.filter_by(id=pid).first()
            if not user:
                abort(400, f'participant {pid} not found')
            if not ConversationParticipant.query.filter_by(conversation_id=conv.id, user_id=pid).first():
                ConversationParticipant(conversation_id=conv.id, user_id=pid).save()
            
    elif conv_type == 'ticket':
        # Auto-add requester and assignee
        ticket = Ticket.query.filter_by(id=data['ticket_id']).first()
        if ticket:
            if ticket.requester_id:
                if not ConversationParticipant.query.filter_by(conversation_id=conv.id, user_id=ticket.requester_id).first():
                    ConversationParticipant(conversation_id=conv.id, user_id=ticket.requester_id).save()
            if ticket.assignee_id:
                if not ConversationParticipant.query.filter_by(conversation_id=conv.id, user_id=ticket.assignee_id).first():
                    ConversationParticipant(conversation_id=conv.id, user_id=ticket.assignee_id).save()

    # emit hook
    try:
        send_conversation_created(conv)
    except Exception:
        import logging
        logging.exception('error running conversation.created hooks')

    return jsonify(conv.to_dict()), 201


@conversations_bp.route('/<id_>/messages', methods=['GET'])
@jwt_required_optional
def get_messages(id_):
    conv = _get_or_404(Conversation, id_)
    
    # Get current user from JWT token
    identity = get_jwt_identity()
    try:
        current_user_id = uuid.UUID(identity)
    except ValueError:
        abort(401, 'invalid token')
    
    # Check if current user is a participant in this conversation
    participant = ConversationParticipant.query.filter_by(conversation_id=conv.id, user_id=current_user_id).first()
    if not participant:
        abort(403, 'not a participant in this conversation')
    
    messages = Message.active().filter_by(conversation_id=conv.id).order_by(Message.created_at).all()
    return jsonify([m.to_dict() for m in messages])


@conversations_bp.route('/<id_>/messages', methods=['POST'])
@jwt_required_optional
def create_message(id_):
    conv = _get_or_404(Conversation, id_)
    data = request.get_json() or {}
    if not data.get('content') or not data.get('sender_id'):
        abort(400, 'content and sender_id are required')

    # Require authentication and ensure the authenticated user is the sender
    identity = get_jwt_identity()
    try:
        current_user_id = uuid.UUID(identity)
    except Exception:
        abort(401, 'invalid token')
    sender_id = data['sender_id']
    try:
        sender_uuid = uuid.UUID(sender_id)
    except Exception:
        abort(400, 'invalid sender_id')
    if sender_uuid != current_user_id:
        abort(403, 'sender_id does not match authenticated user')

    # validate sender is participant
    participant = ConversationParticipant.query.filter_by(conversation_id=conv.id, user_id=sender_id).first()
    if not participant:
        abort(403, 'sender not in conversation')

    # Validate parent_message_id if provided
    parent_message_id = data.get('parent_message_id')
    if parent_message_id:
        parent_message = Message.query.filter_by(id=parent_message_id, conversation_id=conv.id).first()
        if not parent_message:
            abort(400, 'parent_message_id not found in this conversation')

    m = Message(
        conversation_id=conv.id,
        sender_id=sender_id,
        content=data['content'],
        message_type=data.get('message_type', 'text'),
        parent_message_id=parent_message_id
    )
    m.save()

    # emit hook
    try:
        send_message_created(m)
    except Exception:
        import logging
        logging.exception('error running message.created hooks')

    return jsonify(m.to_dict()), 201


@conversations_bp.route('/<conv_id>/participants', methods=['POST'])
@jwt_required_optional
def add_participant(conv_id):
    conv = _get_or_404(Conversation, conv_id)
    
    # Get current user from JWT token
    identity = get_jwt_identity()
    try:
        current_user_id = uuid.UUID(identity)
    except ValueError:
        abort(401, 'invalid token')
    
    # Check if current user is a participant in this conversation
    current_participant = ConversationParticipant.query.filter_by(conversation_id=conv.id, user_id=current_user_id).first()
    if not current_participant:
        abort(403, 'not a participant in this conversation')
    
    data = request.get_json() or {}
    user_id = data.get('user_id')
    if not user_id:
        abort(400, 'user_id required')
    user = User.query.filter_by(id=user_id).first()
    if not user:
        abort(400, 'user not found')
    # Check if already participant
    existing = ConversationParticipant.query.filter_by(conversation_id=conv.id, user_id=user_id).first()
    if existing:
        abort(400, 'already participant')
    p = ConversationParticipant(conversation_id=conv.id, user_id=user_id)
    p.save()
    return jsonify(p.to_dict()), 201