"""
Server monitoring data sender.
Sends collected metrics to the monitoring API endpoint.
"""

import requests
import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class MetricsSender:
    """Sends monitoring metrics to the configured API endpoint."""

    def __init__(self, api_key, api_secret=None, endpoint_url=None):
        self.api_key = api_key
        self.api_secret = api_secret
        self.endpoint_url = endpoint_url
        self.session = requests.Session()

        # Set default headers
        self.session.headers.update({
            'Content-Type': 'application/json',
            'X-API-Key': self.api_key
        })

        if self.api_secret:
            self.session.headers['X-API-Secret'] = self.api_secret

    def send_metrics(self, metrics_data, monitor_id=None):
        """
        Send metrics data to the monitoring endpoint.

        Args:
            metrics_data (dict): The metrics data to send
            monitor_id (str, optional): The monitor configuration ID

        Returns:
            bool: True if successful, False otherwise
        """
        if not self.endpoint_url:
            logger.warning("No endpoint URL configured for sending metrics")
            return False

        try:
            payload = {
                'monitor_id': monitor_id,
                'data': metrics_data
            }

            response = self.session.post(
                self.endpoint_url,
                json=payload,
                timeout=30
            )

            if response.status_code == 200:
                logger.info(f"Successfully sent metrics to {self.endpoint_url}")
                return True
            else:
                logger.error(f"Failed to send metrics. Status: {response.status_code}, Response: {response.text}")
                return False

        except requests.exceptions.RequestException as e:
            logger.error(f"Error sending metrics: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending metrics: {e}")
            return False

    def test_connection(self):
        """Test connection to the monitoring endpoint."""
        if not self.endpoint_url:
            return False

        try:
            # Send a test ping
            test_payload = {
                'type': 'ping',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }

            response = self.session.post(
                self.endpoint_url,
                json=test_payload,
                timeout=10
            )

            return response.status_code == 200

        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return False