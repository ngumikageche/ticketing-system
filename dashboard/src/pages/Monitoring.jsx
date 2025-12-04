import { useState, useEffect } from 'react';
import { Monitor, Plus, Play, Square, Trash2, Edit, Activity, Cpu, HardDrive, Wifi, Zap, ArrowLeft, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getServerMonitors,
  createServerMonitor,
  updateServerMonitor,
  deleteServerMonitor,
  getMonitorStatus,
  startMonitoring,
  stopMonitoring
} from '../api/monitoring.js';
import MonitoringDashboard from '../components/MonitoringDashboard.jsx';

export default function Monitoring() {
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState(null);
  const [editingMonitor, setEditingMonitor] = useState(null);
  const [selectedMonitor, setSelectedMonitor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    server_ip: '',
    endpoint_url: '',
    check_interval: 60
  });
  const [generatedCredentials, setGeneratedCredentials] = useState(null);

  useEffect(() => {
    loadMonitors();
  }, []);

  const loadMonitors = async () => {
    try {
      const data = await getServerMonitors();
      setMonitors(data);

      // Load status for each monitor
      const monitorsWithStatus = await Promise.all(
        data.map(async (monitor) => {
          try {
            const status = await getMonitorStatus(monitor.id);
            return { ...monitor, status };
          } catch (error) {
            return { ...monitor, status: { running: false, last_check: null } };
          }
        })
      );
      setMonitors(monitorsWithStatus);

      // Update selected monitor if it's currently selected
      if (selectedMonitor) {
        const updatedSelected = monitorsWithStatus.find(m => m.id === selectedMonitor.id);
        if (updatedSelected) {
          setSelectedMonitor(updatedSelected);
        }
      }
    } catch (error) {
      toast.error('Failed to load server monitors');
    } finally {
      setLoading(false);
    }
  };

  const openMetrics = async () => {
    setShowMetricsModal(true);
    setMetrics(null);
    setMetricsError(null);
    setMetricsLoading(true);
    try {
      // If a specific monitor is selected, fetch via backend proxy using its ID
      const rawBase = import.meta.env.VITE_API_BASE || '';
      const base = rawBase.replace(/\/+$/, '');
      const path = selectedMonitor ? `/api/monitoring/${selectedMonitor.id}/system` : `/api/monitoring/system`;
      // Avoid double /api if base already includes /api
      const url = base.endsWith('/api') ? `${base}${path.replace('/api', '')}` : `${base}${path}`;
      const headers = selectedMonitor ? {} : { 'X-Metrics-Key': import.meta.env.VITE_METRICS_API_KEY || '' };
      const res = await fetch(url, { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.msg || res.statusText);
      setMetrics(json);
    } catch (e) {
      setMetricsError(e.message);
    } finally {
      setMetricsLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const response = await createServerMonitor(formData);
      setGeneratedCredentials({
        api_key: response.generated_api_key,
        api_secret: response.generated_api_secret,
        monitor_id: response.id
      });
      toast.success('Server monitor created successfully');
      setShowCreateModal(false);
      resetForm();
      loadMonitors();
    } catch (error) {
      toast.error('Failed to create server monitor');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const updateData = { ...formData };
      if (editingMonitor) {
        updateData.is_active = editingMonitor.is_active;
      }
      await updateServerMonitor(editingMonitor.id, updateData);
      toast.success('Server monitor updated successfully');
      setEditingMonitor(null);
      resetForm();
      loadMonitors();
    } catch (error) {
      toast.error('Failed to update server monitor');
    }
  };

  const handleDelete = async (monitorId) => {
    if (!confirm('Are you sure you want to delete this monitor?')) return;
    try {
      await deleteServerMonitor(monitorId);
      toast.success('Server monitor deleted successfully');
      loadMonitors();
    } catch (error) {
      toast.error('Failed to delete server monitor');
    }
  };

  const handleStartStop = async (monitorId, isRunning) => {
    try {
      if (isRunning) {
        await stopMonitoring(monitorId);
        toast.success('Monitoring stopped');
      } else {
        await startMonitoring(monitorId);
        toast.success('Monitoring started');
      }
      loadMonitors();
    } catch (error) {
      toast.error(`Failed to ${isRunning ? 'stop' : 'start'} monitoring`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      server_ip: '',
      endpoint_url: '',
      check_interval: 60
    });
  };

  const openEditModal = (monitor) => {
    setEditingMonitor(monitor);
    setFormData({
      name: monitor.name,
      description: monitor.description || '',
      server_ip: monitor.server_ip || '',
      endpoint_url: monitor.endpoint_url || '',
      check_interval: monitor.check_interval
    });
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (timestamp) => {
    if (!timestamp) return 'Never';
    const now = new Date();
    const lastCheck = new Date(timestamp);
    const diff = now - lastCheck;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {selectedMonitor ? (
        <>
          {/* Dashboard Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedMonitor(null)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{selectedMonitor.name}</h1>
                <p className="text-gray-600 dark:text-gray-400">Real-time monitoring dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                selectedMonitor.status?.running
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              }`}>
                <div className={`w-2 h-2 rounded-full ${selectedMonitor.status?.running ? 'bg-green-500' : 'bg-red-500'}`}></div>
                {selectedMonitor.status?.running ? 'Active' : 'Inactive'}
              </div>
              <button
                onClick={() => handleStartStop(selectedMonitor.id, selectedMonitor.status?.running)}
                className={`p-2 rounded-lg ${
                  selectedMonitor.status?.running
                    ? 'hover:bg-red-100 dark:hover:bg-red-900 text-red-500'
                    : 'hover:bg-green-100 dark:hover:bg-green-900 text-green-500'
                }`}
                title={selectedMonitor.status?.running ? 'Stop monitoring' : 'Start monitoring'}
              >
                {selectedMonitor.status?.running ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Real-time Dashboard */}
          <MonitoringDashboard monitorId={selectedMonitor.id} />
        </>
      ) : (
        <>
          {/* Monitors List Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Server Monitoring</h1>
              <p className="text-gray-600 dark:text-gray-400">Monitor your server resources in real-time</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openMetrics}
                className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Server Metrics
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Monitor
              </button>
            </div>
          </div>

          {/* Monitors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {monitors.map((monitor) => (
              <div key={monitor.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedMonitor(monitor)}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${monitor.status?.running ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{monitor.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartStop(monitor.id, monitor.status?.running);
                      }}
                      className={`p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        monitor.status?.running ? 'text-red-500' : 'text-green-500'
                      }`}
                      title={monitor.status?.running ? 'Stop monitoring' : 'Start monitoring'}
                    >
                      {monitor.status?.running ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(monitor);
                      }}
                      className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500"
                      title="Edit monitor"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(monitor.id);
                      }}
                      className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500"
                      title="Delete monitor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Activity className="w-4 h-4" />
                    <span>Last check: {formatUptime(monitor.status?.last_check)}</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {monitor.monitored_resources?.includes('cpu') && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                        <Cpu className="w-3 h-3" />
                        CPU
                      </span>
                    )}
                    {monitor.monitored_resources?.includes('ram') && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                        <Zap className="w-3 h-3" />
                        RAM
                      </span>
                    )}
                    {monitor.monitored_resources?.includes('storage') && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs rounded-full">
                        <HardDrive className="w-3 h-3" />
                        Storage
                      </span>
                    )}
                    {monitor.monitored_resources?.includes('network') && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-xs rounded-full">
                        <Wifi className="w-3 h-3" />
                        Network
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    Check interval: {monitor.check_interval}s • Click to view dashboard
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingMonitor) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              {editingMonitor ? 'Edit Monitor' : 'Create Monitor'}
            </h2>
            <form onSubmit={editingMonitor ? handleUpdate : handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Monitor Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Production Server"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows="3"
                  placeholder="Optional description of this monitor"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Server IP Address
                </label>
                <input
                  type="text"
                  value={formData.server_ip}
                  onChange={(e) => setFormData({ ...formData, server_ip: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., 192.168.1.100 or server.example.com"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  IP address or hostname for whitelisting (optional)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data Endpoint URL
                </label>
                <input
                  type="url"
                  value={formData.endpoint_url}
                  onChange={(e) => setFormData({ ...formData, endpoint_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="http://your-app.com/api/monitoring/data"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  URL where monitoring data will be sent (optional)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Check Interval (seconds)
                </label>
                <input
                  type="number"
                  value={formData.check_interval}
                  onChange={(e) => setFormData({ ...formData, check_interval: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  min="10"
                  max="3600"
                />
              </div>

              {editingMonitor && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingMonitor.is_active}
                      onChange={(e) => setEditingMonitor({ ...editingMonitor, is_active: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Active</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingMonitor(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                >
                  {editingMonitor ? 'Update Monitor' : 'Create Monitor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generated Credentials Modal */}
      {generatedCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Monitor Created Successfully!</h2>
                <p className="text-gray-600 dark:text-gray-400">Configure your server worker with these credentials</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generatedCredentials.api_key}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white font-mono text-sm"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCredentials.api_key);
                      toast.success('API Key copied to clipboard');
                    }}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-300"
                    title="Copy to clipboard"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Secret
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generatedCredentials.api_secret}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white font-mono text-sm"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCredentials.api_secret);
                      toast.success('API Secret copied to clipboard');
                    }}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-300"
                    title="Copy to clipboard"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Monitor ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generatedCredentials.monitor_id}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white font-mono text-sm"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCredentials.monitor_id);
                      toast.success('Monitor ID copied to clipboard');
                    }}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-300"
                    title="Copy to clipboard"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Next Steps:</h3>
              <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>1. Copy the API Key and API Secret</li>
                <li>2. Configure your server monitoring worker with these credentials</li>
                <li>3. Set the endpoint URL to send data to this application</li>
                <li>4. Start the monitoring worker on your server</li>
              </ol>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setGeneratedCredentials(null)}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Server Metrics Modal */}
      {showMetricsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Server Metrics</h2>
              <button
                onClick={() => { setShowMetricsModal(false); setMetrics(null); setMetricsError(null); }}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md"
              >Close</button>
            </div>
            {metricsLoading && <p className="text-sm">Loading…</p>}
            {metricsError && <p className="text-sm text-red-600">Error: {metricsError}</p>}
            {metrics && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h3 className="font-medium mb-1">CPU</h3>
                  <p>Percent: {metrics.cpu?.percent}%</p>
                  <p>Cores: {metrics.cpu?.count}</p>
                  <p>Load (1/5/15): {Array.isArray(metrics.cpu?.loadavg_1m_5m_15m) ? metrics.cpu.loadavg_1m_5m_15m.join(' / ') : 'n/a'}</p>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Memory</h3>
                  <p>Used: {formatBytes(metrics.memory?.used || 0)}</p>
                  <p>Total: {formatBytes(metrics.memory?.total || 0)}</p>
                  <p>Percent: {metrics.memory?.percent}%</p>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Disk</h3>
                  <p>Used: {formatBytes(metrics.disk?.used || 0)}</p>
                  <p>Total: {formatBytes(metrics.disk?.total || 0)}</p>
                  <p>Percent: {metrics.disk?.percent}%</p>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Network</h3>
                  <p>Sent: {formatBytes(metrics.network?.bytes_sent || 0)}</p>
                  <p>Recv: {formatBytes(metrics.network?.bytes_recv || 0)}</p>
                  <p>Packets: {metrics.network?.packets_sent} / {metrics.network?.packets_recv}</p>
                </div>
                <div className="col-span-2 text-gray-600 mt-2">
                  <p>Timestamp: {metrics.timestamp}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}