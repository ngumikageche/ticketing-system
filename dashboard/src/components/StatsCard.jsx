export default function StatsCard({ title, value, highlight }) {
  return (
    <div className={`p-5 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors ${highlight ? 'ring-2 ring-green-500 dark:ring-green-400' : ''}`}>
      <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
      <p className={`mt-1 text-3xl font-bold ${highlight ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
        {value}
      </p>
    </div>
  );
}
