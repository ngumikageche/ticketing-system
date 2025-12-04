use clap::Parser;
use serde::Deserialize;
use std::time::Instant;
use thiserror::Error;
use tracing::{error, info};
use tracing_subscriber::{fmt, EnvFilter};
use url::Url;
use reqwest::header::{HeaderMap, HeaderValue};
use sysinfo::System;

#[derive(Parser, Debug, Clone)]
#[command(name = "server-monitor-rs", version, about = "Backend health & metrics monitor")] 
struct Args {
    /// Backend base URL (e.g., http://127.0.0.1:5000)
    #[arg(long, env = "BACKEND_BASE_URL", default_value = "http://127.0.0.1:5000")]
    backend: String,

    /// Health path (e.g., /health)
    #[arg(long, env = "HEALTH_PATH", default_value = "/health")]
    health: String,

    /// Metrics path (e.g., /api/monitoring/system)
    #[arg(long, env = "METRICS_PATH", default_value = "/api/monitoring/system")]
    metrics: String,

    /// Metrics API key sent as X-Metrics-Key header
    #[arg(long, env = "METRICS_API_KEY")]
    metrics_api_key: Option<String>,

    /// Polling interval seconds
    #[arg(long, env = "INTERVAL_SECS", default_value_t = 10u64)]
    interval: u64,

    /// Request timeout seconds
    #[arg(long, env = "REQUEST_TIMEOUT_SECS", default_value_t = 5u64)]
    timeout: u64,

    /// Enable push agent mode (collect locally and POST to /api/monitoring/data)
    #[arg(long, env = "PUSH_MODE", default_value_t = false)]
    push_mode: bool,

    /// API key for push mode, sent as X-API-Key
    #[arg(long, env = "PUSH_API_KEY")]
    push_api_key: Option<String>,
}

#[derive(Debug, Error)]
enum MonitorError {
    #[error("invalid URL: {0}")]
    InvalidUrl(String),
    #[error("request error: {0}")]
    Request(#[from] reqwest::Error),
}

#[derive(Debug, Deserialize)]
struct HealthResponse {
    status: Option<String>,
    // add other fields if your /health returns more data
}

fn build_health_url(base: &str, health_path: &str) -> Result<Url, MonitorError> {
    let base = Url::parse(base).map_err(|_| MonitorError::InvalidUrl(base.to_string()))?;
    let joined = base.join(health_path).map_err(|_| MonitorError::InvalidUrl(format!("{base}{health_path}")))?;
    Ok(joined)
}

fn build_metrics_url(base: &str, metrics_path: &str) -> Result<Url, MonitorError> {
    let base = Url::parse(base).map_err(|_| MonitorError::InvalidUrl(base.to_string()))?;
    let joined = base.join(metrics_path).map_err(|_| MonitorError::InvalidUrl(format!("{base}{metrics_path}")))?;
    Ok(joined)
}

#[tokio::main]
async fn main() -> Result<(), MonitorError> {
    // logging
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    fmt().with_env_filter(filter).init();

    let args = Args::parse();
    let health_url = build_health_url(&args.backend, &args.health)?;
    let metrics_url = build_metrics_url(&args.backend, &args.metrics)?;
    info!(%health_url, %metrics_url, interval = args.interval, timeout = args.timeout, push_mode = args.push_mode, "monitor starting");

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(args.timeout))
        .build()?;

    let mut term = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()).ok();
    let mut int = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::interrupt()).ok();

    loop {
        if args.push_mode {
            // Collect system info locally and POST to /api/monitoring/data
            let mut sys = System::new_all();
            sys.refresh_all();

            // Approximate CPU usage by averaging all CPUs
            let cpu_percent = {
                let mut sum = 0.0f32;
                let cpus = sys.cpus();
                for c in cpus { sum += c.cpu_usage(); }
                if cpus.len() > 0 { (sum as f64) / (cpus.len() as f64) } else { 0.0 }
            };
            let cpu_count = sys.cpus().len() as i64;
            let total_mem = sys.total_memory() as i64; // already in bytes in recent sysinfo
            let used_mem = sys.used_memory() as i64;
            let avail_mem = total_mem - used_mem;
            let _total_swap = sys.total_swap() as i64;
            let _used_swap = sys.used_swap() as i64;

            // Disk (approx): total = sum of disks total space; used computed via available if possible not exposed here
            let disk_total: i64 = 0;
            let disk_used: i64 = 0;
            // sysinfo 0.30 exposes disks via Disks in newer API but not on System; fallback: keep zeros

            // Network totals not available via System in this build; keep zeros
            let bytes_sent: i64 = 0;
            let bytes_recv: i64 = 0;

            let payload = serde_json::json!({
                "cpu": {"percent": cpu_percent, "count": cpu_count},
                "memory": {"total": total_mem, "used": used_mem, "available": avail_mem, "percent": ((used_mem as f64 / total_mem as f64) * 100.0)},
                "disk": {"total": disk_total, "used": disk_used, "free": (disk_total - disk_used), "percent": if disk_total>0 { (disk_used as f64 / disk_total as f64) * 100.0 } else { 0.0 }},
                "network": {"bytes_sent": bytes_sent, "bytes_recv": bytes_recv}
            });

            let post_url = Url::parse(&args.backend).unwrap().join("/api/monitoring/data").unwrap();
            let mut req = client.post(post_url).json(&payload);
            if let Some(ref key) = args.push_api_key {
                req = req.header("X-API-Key", key);
            }
            match req.send().await {
                Ok(resp) => {
                    info!(code = %resp.status(), "push posted");
                }
                Err(e) => {
                    error!(error = %e, "push post failed");
                }
            }
        }
        let started = Instant::now();
        match client.get(health_url.clone()).send().await {
            Ok(resp) => {
                let latency_ms = started.elapsed().as_millis();
                let code = resp.status();
                let ok = code.is_success();
                let json = resp.json::<serde_json::Value>().await.ok();

                // try to deserialize if matches HealthResponse
                let status_str = json.as_ref().and_then(|v| v.get("status").and_then(|s| s.as_str())).unwrap_or("");

                if ok {
                    info!(code = %code, latency_ms, status = %status_str, "backend healthy");
                } else {
                    error!(code = %code, latency_ms, body = ?json, "backend unhealthy");
                }
            }
            Err(e) => {
                error!(error = %e, "request failed");
            }
        }

        // poll metrics
        let mut headers = HeaderMap::new();
        if let Some(ref k) = args.metrics_api_key {
            match HeaderValue::from_str(k) {
                Ok(v) => { headers.insert("X-Metrics-Key", v); },
                Err(e) => { error!(error = %e, "invalid metrics api key header value"); }
            }
        }
        let started = Instant::now();
        match client.get(metrics_url.clone()).headers(headers).send().await {
            Ok(resp) => {
                let latency_ms = started.elapsed().as_millis();
                let code = resp.status();
                let json = resp.json::<serde_json::Value>().await.ok();
                if code.is_success() {
                    info!(code = %code, latency_ms, metrics = ?json, "metrics polled");
                } else {
                    error!(code = %code, latency_ms, body = ?json, "metrics poll failed");
                }
            }
            Err(e) => {
                error!(error = %e, "metrics request failed");
            }
        }

        // sleep or exit on signal
        let sleep = tokio::time::sleep(std::time::Duration::from_secs(args.interval));
        tokio::pin!(sleep);

        tokio::select! {
            _ = &mut sleep => {},
            _ = async {
                if let Some(ref mut sig) = term { sig.recv().await; }
            } => { info!("received SIGTERM, exiting"); break; }
            _ = async {
                if let Some(ref mut sig) = int { sig.recv().await; }
            } => { info!("received SIGINT, exiting"); break; }
        }
    }

    Ok(())
}
