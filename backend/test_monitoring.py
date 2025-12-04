#!/usr/bin/env python3
"""
Test script for the server monitoring system.
This script demonstrates collecting and sending metrics.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.monitoring.collector import MetricsCollector
from app.monitoring.sender import MetricsSender
import json
import time

def test_collector():
    """Test the metrics collector."""
    print("Testing Metrics Collector...")
    collector = MetricsCollector()

    metrics = collector.collect_all_metrics()
    print("✓ Metrics collected successfully")
    print(f"  Timestamp: {metrics['timestamp']}")
    print(f"  System: {metrics['system_info']['hostname']}")
    print(f"  CPU Usage: {metrics['cpu']['usage_percent']:.1f}%")
    print(f"  Memory Usage: {metrics['memory']['percentage']:.1f}%")
    print(f"  Storage devices: {len(metrics['storage'])}")
    print(f"  Network interfaces: {len(metrics['network'])}")

    return metrics

def test_sender(metrics, api_key, endpoint_url=None):
    """Test the metrics sender."""
    print("\nTesting Metrics Sender...")

    if not endpoint_url:
        print("⚠ No endpoint URL provided, skipping send test")
        return

    sender = MetricsSender(api_key=api_key, endpoint_url=endpoint_url)

    # Test connection
    print("  Testing connection...")
    connected = sender.test_connection()
    if connected:
        print("  ✓ Connection successful")
    else:
        print("  ✗ Connection failed")
        return

    # Send metrics
    print("  Sending metrics...")
    success = sender.send_metrics(metrics)
    if success:
        print("  ✓ Metrics sent successfully")
    else:
        print("  ✗ Failed to send metrics")

if __name__ == "__main__":
    print("Server Monitoring System Test")
    print("=" * 40)

    # Test collector
    metrics = test_collector()

    # Test sender (optional - requires API key and endpoint)
    api_key = os.getenv('MONITOR_API_KEY')
    endpoint_url = os.getenv('MONITOR_ENDPOINT_URL')

    if api_key and endpoint_url:
        test_sender(metrics, api_key, endpoint_url)
    else:
        print("\n⚠ Set MONITOR_API_KEY and MONITOR_ENDPOINT_URL environment variables to test sending")

    print("\nTest completed!")