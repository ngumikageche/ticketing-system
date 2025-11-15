import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const data = [
  { name: 'Urgent', value: 12, color: '#ef4444' },
  { name: 'High', value: 28, color: '#f97316' },
  { name: 'Medium', value: 45, color: '#f59e0b' },
  { name: 'Low', value: 15, color: '#10b981' },
];

export default function DonutChart() {
  return (
    <div className="bg-white p-5 rounded-lg shadow-sm">
      <h3 className="text-lg font-medium mb-4">Tickets by Priority</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, i) => (
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
