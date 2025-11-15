export default function StatsCard({ title, value, highlight }) {
  return (
    <div className={`p-5 rounded-lg bg-white shadow-sm ${highlight ? 'ring-2 ring-green-500' : ''}`}>
      <p className="text-sm text-gray-600">{title}</p>
      <p className={`mt-1 text-3xl font-bold ${highlight ? 'text-green-600' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}
