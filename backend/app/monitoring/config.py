# Server Monitoring Worker Configuration
# Replace these values with your generated credentials from the dashboard

# API Configuration (Required)
API_KEY = "your-generated-api-key-here"
API_SECRET = "your-generated-api-secret-here"
MONITOR_ID = "your-monitor-id-here"

# Monitoring Configuration
ENDPOINT_URL = "http://localhost:5000/api/monitoring/data"
CHECK_INTERVAL = 30  # seconds (30 seconds for testing)
MONITORED_RESOURCES = ["cpu", "ram", "storage", "network"]