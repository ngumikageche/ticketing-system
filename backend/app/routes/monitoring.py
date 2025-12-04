from flask import Blueprint, request, jsonify, abort
from app.models.server_monitor import ServerMonitor
from app.models.base import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.monitoring.worker import get_monitoring_worker
import uuid
from datetime import datetime, timezone
import os
import requests

try:
    import psutil
except Exception:
    psutil = None

monitoring_bp = Blueprint('monitoring', __name__)


def _get_monitor_or_404(monitor_id):
    """Get monitor by ID or abort with 404."""
    try:
        monitor_uuid = uuid.UUID(monitor_id)
    except Exception:
        abort(400, 'invalid monitor id')

    monitor = ServerMonitor.query.filter_by(id=monitor_uuid, is_deleted=False).first()
    if not monitor:
        abort(404, 'monitor not found')
    return monitor


def _verify_api_key():
    """Verify API key from request headers."""
    api_key = request.headers.get('X-API-Key')
    if not api_key:
        abort(401, 'API key required')

    monitor = ServerMonitor.query.filter_by(api_key=api_key, is_active=True, is_deleted=False).first()
    if not monitor:
        abort(401, 'invalid API key')

    return monitor


@monitoring_bp.route('/', methods=['GET'])
@jwt_required()
def list_monitors():
    """List all server monitors for the current user."""
    identity = get_jwt_identity()
    try:
        user_uuid = uuid.UUID(identity)
    except Exception:
        abort(401, 'invalid token identity')

    monitors = ServerMonitor.query.filter_by(user_id=user_uuid, is_deleted=False).all()
    return jsonify([m.to_dict() for m in monitors])


@monitoring_bp.route('/', methods=['POST'])
@jwt_required()
def create_monitor():
    """Create a new server monitor configuration."""
    identity = get_jwt_identity()
    try:
        user_uuid = uuid.UUID(identity)
    except Exception:
        abort(401, 'invalid token identity')

    data = request.get_json() or {}

    required_fields = ['name']
    for field in required_fields:
        if field not in data:
            abort(400, f'{field} is required')

    # Auto-generate API credentials
    import secrets
    api_key = secrets.token_urlsafe(32)
    api_secret = secrets.token_urlsafe(32)

    monitor = ServerMonitor(
        name=data['name'],
        description=data.get('description', ''),
        api_key=api_key,
        api_secret=api_secret,
        endpoint_url=data.get('endpoint_url'),
        server_ip=data.get('server_ip'),  # For whitelisting purposes
        monitored_resources=data.get('monitored_resources', ['cpu', 'ram', 'storage', 'network']),
        check_interval=data.get('check_interval', 60),
        alert_thresholds=data.get('alert_thresholds', {
            'cpu': 80,
            'ram': 85,
            'storage': 90,
            'network': 1000000000  # 1GB/s
        }),
        user_id=user_uuid
    )

    monitor.save()

    # Start monitoring worker if endpoint is configured
    worker = get_monitoring_worker()
    if worker and monitor.endpoint_url:
        worker.start_monitoring(str(monitor.id))

    # Return monitor data but exclude sensitive API credentials from initial response
    response_data = monitor.to_dict()
    response_data['generated_api_key'] = api_key  # Only show once during creation
    response_data['generated_api_secret'] = api_secret  # Only show once during creation

    return jsonify(response_data), 201


@monitoring_bp.route('/<monitor_id>', methods=['GET'])
@jwt_required()
def get_monitor(monitor_id):
    """Get a specific server monitor configuration."""
    monitor = _get_monitor_or_404(monitor_id)

    # Check ownership
    identity = get_jwt_identity()
    if str(monitor.user_id) != identity:
        abort(403, 'access denied')

    return jsonify(monitor.to_dict())


@monitoring_bp.route('/<monitor_id>', methods=['PUT'])
@jwt_required()
def update_monitor(monitor_id):
    """Update a server monitor configuration."""
    monitor = _get_monitor_or_404(monitor_id)

    # Check ownership
    identity = get_jwt_identity()
    if str(monitor.user_id) != identity:
        abort(403, 'access denied')

    data = request.get_json() or {}

    # Update fields
    updatable_fields = ['name', 'description', 'server_ip', 'endpoint_url', 'monitored_resources', 'check_interval', 'alert_thresholds', 'is_active']
    for field in updatable_fields:
        if field in data:
            setattr(monitor, field, data[field])

    monitor.save()

    # Restart monitoring worker if needed
    worker = get_monitoring_worker()
    if worker:
        if monitor.is_active and monitor.endpoint_url:
            worker.start_monitoring(str(monitor.id))
        else:
            worker.stop_monitoring(str(monitor.id))

    return jsonify(monitor.to_dict())


@monitoring_bp.route('/<monitor_id>', methods=['DELETE'])
@jwt_required()
def delete_monitor(monitor_id):
    """Delete a server monitor configuration."""
    monitor = _get_monitor_or_404(monitor_id)

    # Check ownership
    identity = get_jwt_identity()
    if str(monitor.user_id) != identity:
        abort(403, 'access denied')

    # Stop monitoring worker
    worker = get_monitoring_worker()
    if worker:
        worker.stop_monitoring(str(monitor_id))

    monitor.delete()
    return '', 204


@monitoring_bp.route('/<monitor_id>/status', methods=['GET'])
@jwt_required()
def get_monitor_status(monitor_id):
    """Get the status of a monitoring worker."""
    monitor = _get_monitor_or_404(monitor_id)

    # Check ownership
    identity = get_jwt_identity()
    if str(monitor.user_id) != identity:
        abort(403, 'access denied')

    worker = get_monitoring_worker()
    if not worker:
        return jsonify({'running': False, 'message': 'monitoring worker not initialized'})

    worker_status = worker.get_worker_status()
    monitor_status = worker_status.get(str(monitor.id), {'running': False})

    return jsonify({
        'monitor_id': monitor_id,
        'running': monitor_status.get('running', False),
        'last_check': monitor.last_check_at.isoformat() if monitor.last_check_at else None,
        'is_active': monitor.is_active
    })


@monitoring_bp.route('/data', methods=['POST'])
def receive_metrics():
    """Receive metrics data from monitoring agents."""
    monitor = _verify_api_key()

    data = request.get_json()
    if not data:
        abort(400, 'no data provided')

    # Here you could store the metrics data in a database table
    # For now, just log it and return success
    monitor.last_check_at = datetime.now(timezone.utc)
    db.session.commit()

    # Log the received data (in production, you'd store this properly)
    import logging
    logging.info(f"Received metrics for monitor {monitor.id}: {data}")

    return jsonify({'status': 'received', 'monitor_id': str(monitor.id)})


@monitoring_bp.route('/system', methods=['GET'])
@jwt_required(optional=True)
def system_metrics():
    """Return local system metrics for CPU, memory, disk, and network.

    Designed for remote monitoring agents to poll via REST or for webhooks
    to consume. Authentication is optional here; if you need to restrict
    access, front this endpoint with a reverse proxy or enable JWT/auth.
    """
    # Authenticate via static API key header if configured
    from flask import current_app
    api_key_cfg = current_app.config.get('METRICS_API_KEY')
    if api_key_cfg:
        provided = request.headers.get('X-Metrics-Key')
        if not provided or provided != api_key_cfg:
            abort(401, 'invalid metrics api key')

    if psutil is None:
        abort(503, 'psutil not available')

    try:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        cpu_count = psutil.cpu_count(logical=True)
        load = None
        try:
            load = os.getloadavg()
        except Exception:
            load = None

        virtual_mem = psutil.virtual_memory()
        swap_mem = psutil.swap_memory()
        disk_usage = psutil.disk_usage('/')
        net_io = psutil.net_io_counters()

        data = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'cpu': {
                'percent': cpu_percent,
                'count': cpu_count,
                'loadavg_1m_5m_15m': load,
            },
            'memory': {
                'total': virtual_mem.total,
                'available': virtual_mem.available,
                'used': virtual_mem.used,
                'free': getattr(virtual_mem, 'free', None),
                'percent': virtual_mem.percent,
                'swap_total': swap_mem.total,
                'swap_used': swap_mem.used,
                'swap_free': swap_mem.free,
                'swap_percent': swap_mem.percent,
            },
            'disk': {
                'total': disk_usage.total,
                'used': disk_usage.used,
                'free': disk_usage.free,
                'percent': disk_usage.percent,
            },
            'network': {
                'bytes_sent': net_io.bytes_sent,
                'bytes_recv': net_io.bytes_recv,
                'packets_sent': net_io.packets_sent,
                'packets_recv': net_io.packets_recv,
                'errin': net_io.errin,
                'errout': net_io.errout,
                'dropin': net_io.dropin,
                'dropout': net_io.dropout,
            },
        }

        # Optional webhook forwarding
        webhook_url = request.args.get('webhook')
        if webhook_url:
            try:
                import requests
                requests.post(webhook_url, json=data, timeout=3)
                data['webhook_forwarded'] = True
            except Exception:
                data['webhook_forwarded'] = False

        return jsonify(data), 200
    except Exception as e:
        abort(500, f'system metrics error: {e}')


@monitoring_bp.route('/<monitor_id>/system', methods=['GET'])
@jwt_required()
def proxy_system_metrics(monitor_id):
    """Proxy metrics from a remote server using the stored API key.

    This allows the dashboard to fetch metrics for multiple servers without
    exposing per-server API keys to the client. It constructs the remote
    URL based on the monitor's `server_ip` and polls `/api/monitoring/system`.
    Optionally, a `base` query parameter can override the base URL.
    """
    monitor = _get_monitor_or_404(monitor_id)

    # Authorization owned by user
    identity = get_jwt_identity()
    if str(monitor.user_id) != identity:
        abort(403, 'access denied')

    # Determine base URL
    base = request.args.get('base')
    if not base:
        if not monitor.server_ip:
            abort(400, 'server_ip is not configured; provide ?base=https://server-domain')
        scheme = request.args.get('scheme', 'http')
        base = f"{scheme}://{monitor.server_ip}"

    # Build target URL
    url = base.rstrip('/') + '/api/monitoring/system'

    try:
        resp = requests.get(url, headers={'X-Metrics-Key': monitor.api_key}, timeout=5)
        return jsonify(resp.json()), resp.status_code
    except requests.RequestException as e:
        abort(502, f'remote metrics fetch error: {e}')


@monitoring_bp.route('/<monitor_id>/start', methods=['POST'])
@jwt_required()
def start_monitoring(monitor_id):
    """Start monitoring for a specific monitor."""
    monitor = _get_monitor_or_404(monitor_id)

    # Check ownership
    identity = get_jwt_identity()
    if str(monitor.user_id) != identity:
        abort(403, 'access denied')

    if not monitor.endpoint_url:
        abort(400, 'endpoint_url must be configured to start monitoring')

    worker = get_monitoring_worker()
    if worker:
        worker.start_monitoring(str(monitor.id))
        monitor.is_active = True
        monitor.save()

    return jsonify({'status': 'started', 'monitor_id': monitor_id})


@monitoring_bp.route('/<monitor_id>/stop', methods=['POST'])
@jwt_required()
def stop_monitoring(monitor_id):
    """Stop monitoring for a specific monitor."""
    monitor = _get_monitor_or_404(monitor_id)

    # Check ownership
    identity = get_jwt_identity()
    if str(monitor.user_id) != identity:
        abort(403, 'access denied')

    worker = get_monitoring_worker()
    if worker:
        worker.stop_monitoring(str(monitor.id))

    monitor.is_active = False
    monitor.save()

    return jsonify({'status': 'stopped', 'monitor_id': monitor_id})