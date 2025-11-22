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
          <div key={i} className="bg-white p-5 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium mb-4">Tickets by Month</h3>
        {chartData.length === 0 ? (
          <div className="text-sm text-gray-500 py-16 text-center">No monthly ticket data available.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="tickets" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
