import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const mockData = [
  { name: 'Open', value: 120, color: '#ef4444' },
  { name: 'In Progress', value: 80, color: '#f97316' },
  { name: 'Closed', value: 200, color: '#10b981' },
];

const colors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6'];

export default function DonutChart({ data }) {
  const chartData = data && data.length > 0 ? data.map((item, index) => ({
    name: item.status,
    value: item.count,
    color: colors[index % colors.length]
  })) : mockData;

  return (
    <div className="bg-white p-5 rounded-lg shadow-sm">
      <h3 className="text-lg font-medium mb-4">Tickets by Status</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            formatter={(value, entry) => `${entry.payload.name} ${entry.payload.value}`}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
