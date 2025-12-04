# Server Monitor (Rust)

A small Rust service that periodically checks the health of your Flask backend and logs status/latency metrics. Designed to run side-by-side with the app and optionally report alerts or push metrics later.

## Features
- Configurable backend base URL and health path
- Periodic polling with latency measurement
- Graceful shutdown on SIGINT/SIGTERM
- Structured logs with `tracing`

## Configuration
Environment variables:
- `BACKEND_BASE_URL` (default: `http://127.0.0.1:5000`)
- `HEALTH_PATH` (default: `/health`)
- `INTERVAL_SECS` (default: `10`) – polling interval
- `REQUEST_TIMEOUT_SECS` (default: `5`)

CLI overrides:
```bash
./server-monitor-rs --backend http://localhost:5000 --health /health --interval 10 --timeout 5
```

## Build & Run
```bash
cd server-monitor-rs
cargo build --release
./target/release/server-monitor-rs --backend http://127.0.0.1:5000 --health /health
```

## Extending
- Push metrics to a time-series DB or a webhook
- Add authentication headers if your health endpoint requires them
- Subscribe to backend websocket events to correlate health with live updates
