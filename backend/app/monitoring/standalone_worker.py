#!/usr/bin/env python3
"""
Server Monitoring Worker

This script collects system metrics and sends them to a monitoring dashboard.
Configure your credentials in config.py before running.
"""

import time
import requests
import json
import psutil
import socket
from datetime import datetime, timezone
from config import *

class MonitoringWorker:
    def __init__(self):
        self.api_key = API_KEY
        self.api_secret = API_SECRET if 'API_SECRET' in globals() else None
        self.endpoint_url = ENDPOINT_URL
        self.monitor_id = MONITOR_ID if 'MONITOR_ID' in globals() else None
        self.check_interval = CHECK_INTERVAL
        self.monitored_resources = MONITORED_RESOURCES

        # Setup session with authentication
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'X-API-Key': self.api_key
        })
        if self.api_secret:
            self.session.headers['X-API-Secret'] = self.api_secret

    def get_cpu_usage(self):
        """Get CPU usage statistics."""
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
        """Get storage/disk usage."""
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
        import platform
        return {
            'hostname': socket.gethostname(),
            'platform': platform.platform(),
            'boot_time': datetime.fromtimestamp(psutil.boot_time(), tz=timezone.utc).isoformat()
        }

    def collect_metrics(self):
        """Collect all system metrics."""
        timestamp = datetime.now(timezone.utc).isoformat()

        metrics = {
            'timestamp': timestamp,
            'system_info': self.get_system_info()
        }

        if 'cpu' in self.monitored_resources:
            metrics['cpu'] = self.get_cpu_usage()

        if 'ram' in self.monitored_resources:
            metrics['memory'] = self.get_memory_usage()

        if 'storage' in self.monitored_resources:
            metrics['storage'] = self.get_storage_usage()

        if 'network' in self.monitored_resources:
            metrics['network'] = self.get_network_usage()

        return metrics

    def send_metrics(self, metrics):
        """Send metrics to the monitoring endpoint."""
        payload = {
            'monitor_id': self.monitor_id,
            'data': metrics
        }

        try:
            response = self.session.post(
                self.endpoint_url,
                json=payload,
                timeout=30
            )

            if response.status_code == 200:
                print(f"[{datetime.now()}] Successfully sent metrics")
                return True
            else:
                print(f"[{datetime.now()}] Failed to send metrics: {response.status_code}")
                return False

        except Exception as e:
            print(f"[{datetime.now()}] Error sending metrics: {e}")
            return False

    def run(self):
        """Main worker loop."""
        print(f"Starting monitoring worker...")
        print(f"Endpoint: {self.endpoint_url}")
        print(f"Check interval: {self.check_interval}s")
        print(f"Monitored resources: {', '.join(self.monitored_resources)}")

        while True:
            try:
                metrics = self.collect_metrics()
                success = self.send_metrics(metrics)

                if not success:
                    print("Failed to send metrics, will retry on next interval")

            except Exception as e:
                print(f"Error in monitoring loop: {e}")

            time.sleep(self.check_interval)

if __name__ == "__main__":
    worker = MonitoringWorker()
    worker.run()