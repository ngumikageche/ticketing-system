import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { month: 'Jan', tickets: 120 },
  { month: 'Feb', tickets: 180 },
  { month: 'Mar', tickets: 150 },
  { month: 'Apr', tickets: 200 },
  { month: 'May', tickets: 165 },
];

export default function Reports() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600">Total Tickets</p>
          <p className="text-3xl font-bold text-gray-900">815</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600">Resolved</p>
          <p className="text-3xl font-bold text-green-600">720</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600">Avg. Response</p>
          <p className="text-3xl font-bold text-blue-600">28m</p>
        </div>
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
