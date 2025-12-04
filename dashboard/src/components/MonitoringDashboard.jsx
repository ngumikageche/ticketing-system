import { useState, useEffect } from 'react';
import { Cpu, HardDrive, Wifi, Zap, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function MonitoringDashboard({ monitorId }) {
  const [metrics, setMetrics] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate initial mock data
    generateMockMetrics();

    // Simulate real-time data updates (less frequent to avoid UI refresh issues)
    const interval = setInterval(() => {
      generateMockMetrics();
    }, 10000); // Changed from 2000ms to 10000ms (10 seconds)

    return () => clearInterval(interval);
  }, []);

  const generateMockMetrics = () => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString();

    // Generate mock metrics
    const newMetrics = {
      timestamp,
      cpu: {
        usage_percent: Math.random() * 100,
        cores: 8,
        load_average: [Math.random() * 4, Math.random() * 3, Math.random() * 2]
      },
      memory: {
        total: 17179869184, // 16GB
        available: Math.random() * 17179869184,
        used: Math.random() * 17179869184,
        percentage: Math.random() * 100
      },
      storage: [
        {
          device: '/dev/sda1',
          mountpoint: '/',
          total: 1000000000000, // 1TB
          used: Math.random() * 1000000000000,
          free: Math.random() * 1000000000000,
          percentage: Math.random() * 100
        }
      ],
      network: [
        {
          interface: 'eth0',
          bytes_sent: Math.random() * 1000000000,
          bytes_recv: Math.random() * 1000000000,
          packets_sent: Math.random() * 1000000,
          packets_recv: Math.random() * 1000000
        }
      ]
    };

    setMetrics(newMetrics);

    // Add to historical data
    setHistoricalData(prev => {
      const newData = [...prev, {
        time: timestamp,
        cpu: newMetrics.cpu.usage_percent,
        memory: newMetrics.memory.percentage,
        storage: newMetrics.storage[0]?.percentage || 0,
        network_sent: newMetrics.network[0]?.bytes_sent / 1000000 || 0,
        network_recv: newMetrics.network[0]?.bytes_recv / 1000000 || 0
      }];

      // Keep only last 50 data points
      return newData.slice(-50);
    });

    setLoading(false);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNetworkSpeed = (bytes) => {
    return formatBytes(bytes) + '/s';
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
      {/* Real-time Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Usage */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">CPU Usage</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics?.cpu?.usage_percent?.toFixed(1)}%
              </p>
            </div>
            <Cpu className="w-8 h-8 text-blue-500" />
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${metrics?.cpu?.usage_percent || 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Memory Usage</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics?.memory?.percentage?.toFixed(1)}%
              </p>
            </div>
            <Zap className="w-8 h-8 text-green-500" />
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${metrics?.memory?.percentage || 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Storage Usage */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Storage Usage</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics?.storage?.[0]?.percentage?.toFixed(1)}%
              </p>
            </div>
            <HardDrive className="w-8 h-8 text-purple-500" />
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${metrics?.storage?.[0]?.percentage || 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Network Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Network</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {formatNetworkSpeed(metrics?.network?.[0]?.bytes_recv || 0)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">↓ received</p>
            </div>
            <Wifi className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU and Memory Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">CPU & Memory Usage</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Line
                type="monotone"
                dataKey="cpu"
                stroke="#3B82F6"
                strokeWidth={2}
                name="CPU %"
              />
              <Line
                type="monotone"
                dataKey="memory"
                stroke="#10B981"
                strokeWidth={2}
                name="Memory %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Storage Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Storage Usage</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Area
                type="monotone"
                dataKey="storage"
                stroke="#8B5CF6"
                fill="#8B5CF6"
                fillOpacity={0.3}
                name="Storage %"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">System Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* CPU Details */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">CPU Information</h4>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div>Cores: {metrics?.cpu?.cores}</div>
              <div>Load Average: {metrics?.cpu?.load_average?.map(l => l.toFixed(2)).join(', ')}</div>
            </div>
          </div>

          {/* Memory Details */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Memory Information</h4>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div>Total: {formatBytes(metrics?.memory?.total || 0)}</div>
              <div>Used: {formatBytes(metrics?.memory?.used || 0)}</div>
              <div>Available: {formatBytes(metrics?.memory?.available || 0)}</div>
            </div>
          </div>

          {/* Storage Details */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Storage Information</h4>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              {metrics?.storage?.map((disk, index) => (
                <div key={index}>
                  <div>{disk.mountpoint}: {formatBytes(disk.used)} / {formatBytes(disk.total)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}