"""
Server monitoring worker.
Background worker that periodically collects and sends system metrics.
"""

import threading
import time
import logging
from datetime import datetime, timezone
from app.monitoring.collector import MetricsCollector
from app.monitoring.sender import MetricsSender
from app.models.server_monitor import ServerMonitor
from app.models.base import db

logger = logging.getLogger(__name__)


class MonitoringWorker:
    """Background worker for server monitoring."""

    def __init__(self, app=None):
        self.app = app
        self.collector = MetricsCollector()
        self.workers = {}  # monitor_id -> thread
        self.running = False

    def start_monitoring(self, monitor_id):
        """Start monitoring for a specific monitor configuration."""
        if monitor_id in self.workers:
            logger.warning(f"Monitoring already running for {monitor_id}")
            return

        thread = threading.Thread(
            target=self._monitor_loop,
            args=(monitor_id,),
            daemon=True
        )
        self.workers[monitor_id] = thread
        thread.start()
        logger.info(f"Started monitoring worker for {monitor_id}")

    def stop_monitoring(self, monitor_id):
        """Stop monitoring for a specific monitor configuration."""
        if monitor_id not in self.workers:
            logger.warning(f"No monitoring worker found for {monitor_id}")
            return

        # Set a flag to stop the thread
        self.workers[monitor_id]._stop_event = True
        self.workers[monitor_id].join(timeout=5)
        del self.workers[monitor_id]
        logger.info(f"Stopped monitoring worker for {monitor_id}")

    def start_all_active_monitors(self):
        """Start monitoring for all active monitor configurations."""
        with self.app.app_context():
            monitors = ServerMonitor.query.filter_by(is_active=True).all()
            for monitor in monitors:
                self.start_monitoring(str(monitor.id))

    def stop_all_monitors(self):
        """Stop all monitoring workers."""
        for monitor_id in list(self.workers.keys()):
            self.stop_monitoring(monitor_id)

    def _monitor_loop(self, monitor_id):
        """Main monitoring loop for a specific monitor."""
        thread = threading.current_thread()
        thread._stop_event = False

        while not getattr(thread, '_stop_event', False):
            try:
                with self.app.app_context():
                    monitor = ServerMonitor.query.get(monitor_id)
                    if not monitor or not monitor.is_active:
                        logger.info(f"Monitor {monitor_id} is no longer active, stopping worker")
                        break

                    # Collect metrics
                    metrics = self.collector.collect_all_metrics()

                    # Send metrics if endpoint is configured
                    if monitor.endpoint_url:
                        sender = MetricsSender(
                            api_key=monitor.api_key,
                            api_secret=monitor.api_secret,
                            endpoint_url=monitor.endpoint_url
                        )

                        success = sender.send_metrics(metrics, monitor_id)
                        if success:
                            # Update last check timestamp
                            monitor.last_check_at = datetime.now(timezone.utc)
                            db.session.commit()

                    # Wait for next check interval
                    time.sleep(monitor.check_interval)

            except Exception as e:
                logger.error(f"Error in monitoring loop for {monitor_id}: {e}")
                time.sleep(60)  # Wait a minute before retrying

    def get_worker_status(self):
        """Get status of all monitoring workers."""
        return {
            monitor_id: {
                'running': thread.is_alive(),
                'thread_id': thread.ident
            }
            for monitor_id, thread in self.workers.items()
        }


# Global worker instance
monitoring_worker = None


def init_monitoring_worker(app):
    """Initialize the global monitoring worker."""
    global monitoring_worker
    monitoring_worker = MonitoringWorker(app)
    return monitoring_worker


def get_monitoring_worker():
    """Get the global monitoring worker instance."""
    return monitoring_worker