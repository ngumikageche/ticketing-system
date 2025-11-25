import { LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockData = [
  { date: 'May 1', tickets: 70 },
  { date: 'May 3', tickets: 58 },
  { date: 'May 5', tickets: 45 },
  { date: 'May 7', tickets: 48 },
];

export default function LineChart({ data, animate = true }) {
  const chartData = data && data.length > 0 ? data.map(item => ({
    date: item.date,
    created: item.created,
    resolved: item.resolved
  })) : mockData;

  return (
    <div className="bg-white p-5 rounded-lg shadow-sm">
      <h3 className="text-lg font-medium mb-4">Tickets Trend</h3>
      <ResponsiveContainer width="100%" height={220}>
        <RechartsLine
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={2} name="Created" />
          <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} name="Resolved" />
        </RechartsLine>
      </ResponsiveContainer>
    </div>
  );
}
