"""
Server monitoring metrics collector.
Collects system resource usage data.
"""

import psutil
import time
from datetime import datetime, timezone
import socket
import uuid
import platform


class MetricsCollector:
    """Collects system metrics like CPU, RAM, storage, and network usage."""

    def __init__(self):
        self.hostname = socket.gethostname()
        self.system_id = str(uuid.uuid4())  # Unique identifier for this system

    def get_cpu_usage(self):
        """Get CPU usage percentage."""
        return {
            'usage_percent': psutil.cpu_percent(interval=1),
            'cores': psutil.cpu_count(),
            'cores_logical': psutil.cpu_count(logical=True),
            'load_average': psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None
        }

    def get_memory_usage(self):
        """Get RAM/memory usage."""
        mem = psutil.virtual_memory()
        return {
            'total': mem.total,
            'available': mem.available,
            'used': mem.used,
            'percentage': mem.percent,
            'free': mem.free
        }

    def get_storage_usage(self):
        """Get storage/disk usage for all mounted partitions."""
        disks = []
        for partition in psutil.disk_partitions():
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                disks.append({
                    'device': partition.device,
                    'mountpoint': partition.mountpoint,
                    'filesystem': partition.fstype,
                    'total': usage.total,
                    'used': usage.used,
                    'free': usage.free,
                    'percentage': usage.percent
                })
            except PermissionError:
                # Skip partitions we can't access
                continue
        return disks

    def get_network_usage(self):
        """Get network interface statistics."""
        net_io = psutil.net_io_counters(pernic=True)
        interfaces = []
        for interface, stats in net_io.items():
            interfaces.append({
                'interface': interface,
                'bytes_sent': stats.bytes_sent,
                'bytes_recv': stats.bytes_recv,
                'packets_sent': stats.packets_sent,
                'packets_recv': stats.packets_recv,
                'errin': stats.errin,
                'errout': stats.errout,
                'dropin': stats.dropin,
                'dropout': stats.dropout
            })
        return interfaces

    def get_system_info(self):
        """Get basic system information."""
        return {
            'hostname': self.hostname,
            'system_id': self.system_id,
            'platform': platform.platform(),
            'boot_time': datetime.fromtimestamp(psutil.boot_time(), tz=timezone.utc).isoformat()
        }

    def collect_all_metrics(self):
        """Collect all system metrics."""
        timestamp = datetime.now(timezone.utc).isoformat()

        return {
            'timestamp': timestamp,
            'system_info': self.get_system_info(),
            'cpu': self.get_cpu_usage(),
            'memory': self.get_memory_usage(),
            'storage': self.get_storage_usage(),
            'network': self.get_network_usage()
        }