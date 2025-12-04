# Server Monitoring Worker Setup

This guide explains how to set up a monitoring worker on your server to send system metrics to the monitoring dashboard.

## Prerequisites

- Python 3.6+
- Access to the server you want to monitor
- Generated API credentials from the monitoring dashboard

## Installation

1. **Copy the worker files to your server**
   ```bash
   # Create a directory for the monitoring worker
   mkdir server-monitor-worker
   cd server-monitor-worker

   # Copy the worker script and config template from your app directory
   cp /path/to/your/app/backend/app/monitoring/standalone_worker.py worker.py
   cp /path/to/your/app/backend/app/monitoring/config.py.example config.py
   ```

2. **Install required packages**
   ```bash
   pip install psutil requests
   ```

## Configuration

Edit the `config.py` file with your generated credentials (from the credentials modal in the dashboard):

```python
# Server Monitoring Worker Configuration

# API Configuration (Required)
API_KEY = "your-generated-api-key-here"  # From the credentials modal
API_SECRET = "your-generated-api-secret-here"  # From the credentials modal
MONITOR_ID = "your-monitor-id-here"  # From the credentials modal

# Monitoring Configuration
ENDPOINT_URL = "https://your-app-domain.com/api/monitoring/data"
CHECK_INTERVAL = 60  # seconds

# Resources to monitor
MONITORED_RESOURCES = ["cpu", "ram", "storage", "network"]
```

## Running the Worker

1. **Test the configuration**
   ```bash
   python worker.py
   ```

2. **Run in background (using nohup)**
   ```bash
   nohup python worker.py > monitor.log 2>&1 &
   ```

3. **Check if it's running**
   ```bash
   ps aux | grep worker.py
   ```

4. **View logs**
   ```bash
   tail -f monitor.log
   ```

## Systemd Service (Optional)

For production deployments, create a systemd service:

1. **Create service file** `/etc/systemd/system/monitoring-worker.service`:
   ```ini
   [Unit]
   Description=Server Monitoring Worker
   After=network.target

   [Service]
   Type=simple
   User=your-user
   WorkingDirectory=/path/to/server-monitor-worker
   ExecStart=/usr/bin/python3 /path/to/server-monitor-worker/worker.py
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```

2. **Enable and start the service**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable monitoring-worker
   sudo systemctl start monitoring-worker
   sudo systemctl status monitoring-worker
   ```

## Troubleshooting

- **Permission errors**: Make sure the user running the worker has access to system information
- **Network issues**: Check firewall settings and ensure the endpoint URL is accessible
- **API errors**: Verify your API key and endpoint URL are correct
- **High CPU usage**: Adjust the check interval to reduce monitoring frequency

## Security Notes

- Store configuration files securely with appropriate permissions
- Use HTTPS endpoints when possible
- Regularly rotate API keys
- Monitor the worker logs for any issues</content>
<parameter name="filePath">/home/future/support-ticketing-system/backend/app/monitoring/WORKER_SETUP.md