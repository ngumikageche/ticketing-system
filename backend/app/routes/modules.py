from flask import Blueprint, request, jsonify, abort
from app.models.module import Module
from app.models.base import db
from flask_jwt_extended import jwt_required, get_jwt_identity
import uuid
from functools import wraps

modules_bp = Blueprint('modules', __name__)


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


@modules_bp.route('/', methods=['GET'])
def list_modules():
    """Get all active modules"""
    modules = Module.active().all()
    return jsonify([m.to_dict() for m in modules])


@modules_bp.route('/', methods=['POST'])
@jwt_required()
def create_module():
    """Create a new module"""
    data = request.get_json() or {}
    if 'name' not in data:
        abort(400, 'name is required')

    # Check if module with this name already exists
    existing = Module.query.filter_by(name=data['name'], is_deleted=False).first()
    if existing:
        abort(400, 'Module with this name already exists')

    module = Module(
        name=data['name'],
        description=data.get('description', ''),
        is_active=data.get('is_active', True)
    )
    module.save()
    return jsonify(module.to_dict()), 201


@modules_bp.route('/<uuid:module_id>', methods=['GET'])
def get_module(module_id):
    """Get a specific module by ID"""
    module = _get_or_404(Module, module_id)
    return jsonify(module.to_dict())


@modules_bp.route('/<uuid:module_id>', methods=['PUT'])
@jwt_required()
def update_module(module_id):
    """Update a module"""
    module = _get_or_404(Module, module_id)
    data = request.get_json() or {}

    # Check name uniqueness if name is being changed
    if 'name' in data and data['name'] != module.name:
        existing = Module.query.filter_by(name=data['name'], is_deleted=False).first()
        if existing and existing.id != module_id:
            abort(400, 'Module with this name already exists')

    # Update fields
    if 'name' in data:
        module.name = data['name']
    if 'description' in data:
        module.description = data['description']
    if 'is_active' in data:
        module.is_active = data['is_active']

    module.save()
    return jsonify(module.to_dict())


@modules_bp.route('/<uuid:module_id>', methods=['DELETE'])
@jwt_required()
def delete_module(module_id):
    """Soft delete a module"""
    module = _get_or_404(Module, module_id)
    module.delete()
    return '', 204