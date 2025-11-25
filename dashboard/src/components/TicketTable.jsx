const priorityColor = {
  Urgent: 'text-red-600 dark:text-red-400',
  High: 'text-orange-600 dark:text-orange-400',
  Medium: 'text-amber-600 dark:text-amber-400',
  Low: 'text-green-600 dark:text-green-400',
};

export default function TicketTable({ tickets = [], userMap = {}, commentCount = {} }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Recent Tickets</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['Ticket #', 'Subject', 'Requester', 'Status', 'Priority', 'Comments'].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
            {tickets.slice(0, 5).map((t) => (  // Show only first 5
              <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{t.ticket_id || t.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{t.subject}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{userMap[t.requester_id] || t.requester_name || t.requester_id}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full
                    ${t.status === 'Open' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' :
                      t.status === 'Closed' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300' :
                      t.status === 'Resolved' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300' :
                      'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'}`}>
                    {t.status}
                  </span>
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${priorityColor[t.priority] || 'text-gray-600 dark:text-gray-400'}`}>
                  {t.priority}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                  {commentCount[t.id] || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
