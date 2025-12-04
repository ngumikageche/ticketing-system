# Server Monitoring System

This is a custom-built server monitoring system that collects and displays real-time system resource metrics including CPU, RAM, storage, and network usage.

## Features

- **Real-time Monitoring**: Collect system metrics at configurable intervals
- **Multiple Resources**: Monitor CPU, RAM, storage, and network usage
- **API Authentication**: Secure API key-based authentication
- **Web Dashboard**: Real-time visualization with charts and graphs
- **Background Workers**: Automated data collection and transmission
- **User Management**: Per-user monitoring configurations

## Architecture

### Backend Components

1. **ServerMonitor Model** (`app/models/server_monitor.py`)
   - Stores monitoring configuration
   - API keys and secrets
   - Monitoring settings and thresholds

2. **Monitoring Collector** (`app/monitoring/collector.py`)
   - Collects system metrics using psutil
   - CPU, memory, storage, and network statistics

3. **Metrics Sender** (`app/monitoring/sender.py`)
   - Sends collected data to configured endpoints
   - API key authentication

4. **Monitoring Worker** (`app/monitoring/worker.py`)
   - Background worker for periodic data collection
   - Manages multiple monitoring instances

5. **API Routes** (`app/routes/monitoring.py`)
   - RESTful API for managing monitors
   - CRUD operations for monitoring configurations

### Frontend Components

1. **Monitoring Page** (`src/pages/Monitoring.jsx`)
   - Monitor management interface
   - Real-time dashboard view

2. **Monitoring Dashboard** (`src/components/MonitoringDashboard.jsx`)
   - Real-time charts and metrics display
   - Historical data visualization

## Setup

1. **Install Dependencies**
   ```bash
   cd backend
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Run Migrations**
   ```bash
   python -m flask db upgrade
   ```

3. **Start the Application**
   ```bash
   python wsgi.py
   ```

## Usage

### Creating a Monitor

1. Navigate to the Monitoring page in the dashboard
2. Click "Add Monitor"
3. Fill in the configuration:
   - Name: Descriptive name for the monitor
   - API Key: Key for authenticating data submissions
   - Endpoint URL: Where to send monitoring data (optional)
   - Check Interval: How often to collect metrics (seconds)
   - Monitored Resources: Select CPU, RAM, Storage, Network

### Viewing Real-time Data

1. Click on any monitor card to view the real-time dashboard
2. See live metrics with charts showing:
   - CPU usage over time
   - Memory usage trends
   - Storage utilization
   - Network activity

### API Endpoints

#### Monitor Management
- `GET /api/monitoring/` - List monitors
- `POST /api/monitoring/` - Create monitor
- `PUT /api/monitoring/<id>` - Update monitor
- `DELETE /api/monitoring/<id>` - Delete monitor
- `GET /api/monitoring/<id>/status` - Get monitor status
- `POST /api/monitoring/<id>/start` - Start monitoring
- `POST /api/monitoring/<id>/stop` - Stop monitoring

#### Data Ingestion
- `POST /api/monitoring/data` - Receive monitoring data (requires API key)

## Data Collection

The system collects the following metrics:

### CPU
- Usage percentage
- Number of cores
- Load averages

### Memory (RAM)
- Total, available, used memory
- Usage percentage

### Storage
- Disk usage per mount point
- Total, used, free space
- Usage percentages

### Network
- Bytes sent/received
- Packets sent/received
- Interface statistics

## Security

- API keys are required for data submission
- User-based access control for monitor management
- Sensitive data (API keys) excluded from API responses

## Future Enhancements

- Alert system for threshold breaches
- Historical data storage and analysis
- Multiple server monitoring
- Custom metric collection
- Integration with external monitoring services</content>
<parameter name="filePath">/home/future/support-ticketing-system/backend/app/monitoring/README.md