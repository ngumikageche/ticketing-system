from flask import Blueprint, request, jsonify, abort
from app.models.conversation import Conversation
from app.models.conversation_participant import ConversationParticipant
from app.models.message import Message
from app.models.message_read_status import MessageReadStatus
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

    result = []
    for c in conversations:
        conv_dict = c.to_dict()
        if c.type == 'direct':
            # For direct conversations, set title to the other participant's name
            other_participants = [p for p in c.participants if str(p.user_id) != str(current_user_id)]
            if other_participants:
                other_user = other_participants[0].user
                conv_dict['title'] = other_user.name or other_user.email
        result.append(conv_dict)

    return jsonify(result)


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
    conv_dict = conv.to_dict()
    if conv.type == 'direct':
        # For direct conversations, set title to the other participant's name
        other_participants = [p for p in conv.participants if str(p.user_id) != str(current_user_id)]
        if other_participants:
            other_user = other_participants[0].user
            conv_dict['title'] = other_user.name or other_user.email

    return jsonify(conv_dict)


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

    # For direct conversations, check if one already exists between these users
    if conv_type == 'direct':
        recipient_id = data.get('recipient_id')
        if not recipient_id:
            abort(400, 'recipient_id required for direct conversations')
        recipient = User.query.filter_by(id=recipient_id).first()
        if not recipient:
            abort(400, 'recipient not found')
        
        # Find existing direct conversation between these two users
        # A direct conversation should have exactly 2 participants
        existing_direct = db.session.query(Conversation).join(ConversationParticipant).filter(
            Conversation.type == 'direct',
            ConversationParticipant.user_id.in_([created_by_id, recipient_id])
        ).group_by(Conversation.id).having(
            db.func.count(ConversationParticipant.user_id) == 2
        ).first()
        
        if existing_direct:
            # Verify both users are participants
            participants = ConversationParticipant.query.filter_by(conversation_id=existing_direct.id).all()
            participant_ids = {p.user_id for p in participants}
            if participant_ids == {created_by_id, recipient_id}:
                # Return existing conversation
                conv_dict = existing_direct.to_dict()
                if existing_direct.type == 'direct':
                    # For direct conversations, set title to the other participant's name
                    other_participants = [p for p in existing_direct.participants if str(p.user_id) != str(created_by_id)]
                    if other_participants:
                        other_user = other_participants[0].user
                        conv_dict['title'] = other_user.name or other_user.email
                return jsonify(conv_dict), 200

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

    conv_dict = conv.to_dict()
    if conv.type == 'direct':
        # For direct conversations, set title to the other participant's name
        other_participants = [p for p in conv.participants if str(p.user_id) != str(created_by_id)]
        if other_participants:
            other_user = other_participants[0].user
            conv_dict['title'] = other_user.name or other_user.email

    return jsonify(conv_dict), 201


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
    
    # Get read status for current user
    read_message_ids = set(
        db.session.query(MessageReadStatus.message_id)
        .filter_by(user_id=current_user_id)
        .filter(MessageReadStatus.message_id.in_([m.id for m in messages]))
        .all()
    )
    read_message_ids = {str(mid) for (mid,) in read_message_ids}
    
    result = []
    for m in messages:
        msg_dict = m.to_dict()
        msg_dict['is_read'] = str(m.id) in read_message_ids
        result.append(msg_dict)
    
    return jsonify(result)


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
    print(f"[MESSAGE] Created message {m.id} in conversation {conv.id} by user {sender_id}")

    # emit hook
    try:
        send_message_created(m)
    except Exception:
        import logging
        logging.exception('error running message.created hooks')

    return jsonify(m.to_dict()), 201


@conversations_bp.route('/<conv_id>/messages/<message_id>/read', methods=['POST'])
@jwt_required_optional
def mark_message_read(conv_id, message_id):
    conv = _get_or_404(Conversation, conv_id)
    message = _get_or_404(Message, message_id)
    
    if str(message.conversation_id) != conv_id:
        abort(400, 'message does not belong to this conversation')
    
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
    
    # Check if already read, insert if needed (safe against races/duplicates)
    from app.models.message_read_status import MessageReadStatus
    existing = MessageReadStatus.query.filter_by(message_id=message_id, user_id=current_user_id).first()
    if existing:
        return jsonify({'status': 'already read', 'messages_marked_read': 0}), 200

    # Attempt to insert safely. If Postgres available, use ON CONFLICT DO NOTHING for efficiency.
    read_status = MessageReadStatus(message_id=message_id, user_id=current_user_id)
    if db.session.bind and getattr(db.session.bind, 'dialect', None) and db.session.bind.dialect.name == 'postgresql':
        try:
            from sqlalchemy.dialects.postgresql import insert as pg_insert
            row = {
                'id': uuid.uuid4(),
                'message_id': read_status.message_id,
                'user_id': read_status.user_id,
                'is_deleted': read_status.is_deleted,
            }
            stmt = pg_insert(MessageReadStatus.__table__).values([row])
            stmt = stmt.on_conflict_do_nothing(index_elements=['message_id', 'user_id'])
            db.session.execute(stmt)
            db.session.commit()
            return jsonify({'status': 'marked as read', 'messages_marked_read': 1}), 200
        except Exception:
            db.session.rollback()
    # Fallback: try a per-row insert and tolerate IntegrityError if inserted concurrently
    try:
        db.session.add(read_status)
        db.session.commit()
        return jsonify({'status': 'marked as read', 'messages_marked_read': 1}), 200
    except Exception:
        # likely an IntegrityError due to a concurrent insert. Return success: 0 newly created.
        db.session.rollback()
        return jsonify({'status': 'already read', 'messages_marked_read': 0}), 200


@conversations_bp.route('/<conv_id>/read', methods=['POST'])
@jwt_required_optional
def mark_conversation_read(conv_id):
    conv = _get_or_404(Conversation, conv_id)

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

    # Get all unread messages in this conversation
    unread_messages = Message.active().filter_by(conversation_id=conv.id).filter(
        ~Message.id.in_(
            db.session.query(MessageReadStatus.message_id).filter_by(user_id=current_user_id)
        )
    ).all()

    # Build read status objects
    read_statuses = []
    for msg in unread_messages:
        read_statuses.append(MessageReadStatus(message_id=msg.id, user_id=current_user_id))

    # Insert with upsert on Postgres or safe per-row insert
    if read_statuses:
        if db.session.bind and getattr(db.session.bind, 'dialect', None) and db.session.bind.dialect.name == 'postgresql':
            try:
                from sqlalchemy.dialects.postgresql import insert as pg_insert
                rows = [
                    {
                        'id': uuid.uuid4(),
                        'message_id': rs.message_id,
                        'user_id': rs.user_id,
                        'is_deleted': rs.is_deleted,
                    }
                    for rs in read_statuses
                ]
                stmt = pg_insert(MessageReadStatus.__table__).values(rows)
                stmt = stmt.on_conflict_do_nothing(index_elements=['message_id', 'user_id'])
                db.session.execute(stmt)
                db.session.commit()
            except Exception:
                db.session.rollback()
        else:
            from sqlalchemy.exc import IntegrityError
            try:
                db.session.bulk_save_objects(read_statuses)
                db.session.commit()
            except IntegrityError:
                db.session.rollback()
                for rs in read_statuses:
                    exists = MessageReadStatus.query.filter_by(message_id=rs.message_id, user_id=rs.user_id).first()
                    if not exists:
                        db.session.add(rs)
                db.session.commit()

    return jsonify({'status': 'conversation marked as read', 'messages_marked_read': len(read_statuses)}), 200
    
    # Mark all unread messages as read
    # Deduplicate message IDs in case unread_messages contains duplicates
    read_statuses = []
    seen_msg_ids = set()
    for message in unread_messages:
        if message.id in seen_msg_ids:
            continue
        seen_msg_ids.add(message.id)
        read_status = MessageReadStatus(message_id=message.id, user_id=current_user_id)
        read_statuses.append(read_status)
    
    if read_statuses:
        # Try to perform a bulk upsert (insert do nothing on conflict) on Postgres
        try:
            from sqlalchemy.dialects.postgresql import insert as pg_insert
            rows = [
                {
                    'id': uuid.uuid4(),
                    'message_id': rs.message_id,
                    'user_id': rs.user_id,
                    'is_deleted': rs.is_deleted,
                }
                for rs in read_statuses
            ]
            stmt = pg_insert(MessageReadStatus.__table__).values(rows)
            stmt = stmt.on_conflict_do_nothing(index_elements=['message_id', 'user_id'])
            db.session.execute(stmt)
            db.session.commit()
        except Exception:
            # Fall back to safe per-row insert if upsert isn't available (e.g., sqlite or older SQLAlchemy)
            from sqlalchemy.exc import IntegrityError
            try:
                # As a fallback for distinctive DBs, prefer session.add_all with an exist check
                db.session.bulk_save_objects(read_statuses)
                db.session.commit()
            except IntegrityError:
                db.session.rollback()
                # Insert rows individually, skipping any that already exist to avoid UniqueViolation
                for rs in read_statuses:
                    exists = MessageReadStatus.query.filter_by(message_id=rs.message_id, user_id=rs.user_id).first()
                    if not exists:
                        db.session.add(rs)
                db.session.commit()
    
    return jsonify({
        'status': 'conversation marked as read',
        'messages_marked_read': len(read_statuses)
    }), 200


@conversations_bp.route('/<conv_id>/read-up-to/<message_id>', methods=['POST'])
@jwt_required_optional
def mark_messages_read_up_to(conv_id, message_id):
    """Mark all messages up to and including the specified message as read"""
    conv = _get_or_404(Conversation, conv_id)
    message = _get_or_404(Message, message_id)
    
    if str(message.conversation_id) != conv_id:
        abort(400, 'message does not belong to this conversation')
    
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
    
    # Get all unread messages in this conversation that were sent before or at the same time as the specified message
    unread_messages = Message.active().filter_by(conversation_id=conv.id).filter(
        Message.created_at <= message.created_at
    ).filter(
        ~Message.id.in_(
            db.session.query(MessageReadStatus.message_id).filter_by(user_id=current_user_id)
        )
    ).all()
    
    # Mark all these messages as read
    # Deduplicate message IDs before creating read status objects
    read_statuses = []
    seen_msg_ids = set()
    for msg in unread_messages:
        if msg.id in seen_msg_ids:
            continue
        seen_msg_ids.add(msg.id)
        read_status = MessageReadStatus(message_id=msg.id, user_id=current_user_id)
        read_statuses.append(read_status)
    
    if read_statuses:
        # If we're backed by Postgres, use an efficient ON CONFLICT DO NOTHING upsert
        if db.session.bind and getattr(db.session.bind, 'dialect', None) and db.session.bind.dialect.name == 'postgresql':
            from sqlalchemy.dialects.postgresql import insert as pg_insert
            rows = [
                {
                    'id': uuid.uuid4(),
                    'message_id': rs.message_id,
                    'user_id': rs.user_id,
                    'is_deleted': rs.is_deleted,
                }
                for rs in read_statuses
            ]
            stmt = pg_insert(MessageReadStatus.__table__).values(rows)
            stmt = stmt.on_conflict_do_nothing(index_elements=['message_id', 'user_id'])
            db.session.execute(stmt)
            db.session.commit()
        else:
            # Fall back to safe per-row insert; skip existing rows to avoid duplicates
            for rs in read_statuses:
                exists = MessageReadStatus.query.filter_by(message_id=rs.message_id, user_id=rs.user_id).first()
                if not exists:
                    db.session.add(rs)
            db.session.commit()
    
    return jsonify({
        'status': 'messages marked as read up to specified message',
        'messages_marked_read': len(read_statuses)
    }), 200


@conversations_bp.route('/<id_>', methods=['DELETE'])
@jwt_required_optional
def delete_conversation(id_):
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
    
    # Soft delete the conversation
    conv.delete(soft=True)
    
    return '', 204