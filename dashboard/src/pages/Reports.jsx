import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getDashboard } from '../api/dashboard.js';

export default function Reports() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await getDashboard();
        setDashboardData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  // Derived stats - display as N/A when not present
  const stats = dashboardData ? [
    { label: 'Total Tickets', value: dashboardData.totalTickets ?? 'N/A' },
    { label: 'Resolved', value: dashboardData.resolvedTickets ?? 'N/A' },
    { label: 'Avg. Response', value: dashboardData.avgResponse ?? 'N/A' }
  ] : [
    { label: 'Total Tickets', value: 'N/A' },
    { label: 'Resolved', value: 'N/A' },
    { label: 'Avg. Response', value: 'N/A' }
  ];

  // Chart data comes from the API's `monthlyData` field. If it's missing or
  // empty, show a short message instead of a hardcoded chart.
  const chartData = (dashboardData && Array.isArray(dashboardData.monthlyData)) ? dashboardData.monthlyData : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Tickets by Month</h3>
        {chartData.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 py-16 text-center">No monthly ticket data available.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-600" />
              <XAxis dataKey="month" stroke="#6b7280" className="dark:stroke-gray-400" />
              <YAxis stroke="#6b7280" className="dark:stroke-gray-400" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgb(255 255 255)',
                  border: '1px solid rgb(229 231 235)',
                  borderRadius: '0.5rem',
                  color: 'rgb(17 24 39)'
                }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-2 shadow-lg">
                        <p className="text-gray-900 dark:text-white">{`${label}: ${payload[0].value}`}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="tickets" fill="#3b82f6" className="dark:fill-blue-500" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
