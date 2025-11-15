import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getDashboard } from '../api/dashboard.js';

const data = [
  { month: 'Jan', tickets: 120 },
  { month: 'Feb', tickets: 180 },
  { month: 'Mar', tickets: 150 },
  { month: 'Apr', tickets: 200 },
  { month: 'May', tickets: 165 },
];

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

  const stats = dashboardData ? [
    { label: 'Total Tickets', value: dashboardData.totalTickets || '815' },
    { label: 'Resolved', value: dashboardData.resolvedTickets || '720' },
    { label: 'Avg. Response', value: dashboardData.avgResponse || '28m' }
  ] : [
    { label: 'Total Tickets', value: '815' },
    { label: 'Resolved', value: '720' },
    { label: 'Avg. Response', value: '28m' }
  ];

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
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="tickets" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
