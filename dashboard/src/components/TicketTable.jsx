const tickets = [
  { id: '#1245', subject: 'Unable to login', requester: 'James Anderson', status: 'Open', priority: 'High' },
  { id: '#1243', subject: 'Issue on checkout', requester: 'Lisa Brown', status: 'Closed', priority: 'Low' },
  { id: '#1241', subject: 'Payment failed', requester: 'David Williams', status: 'In Progress', priority: 'Medium' },
  // add more rows as needed
];

const priorityColor = {
  Urgent: 'text-red-600',
  High: 'text-orange-600',
  Medium: 'text-amber-600',
  Low: 'text-green-600',
};

export default function TicketTable() {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium">Recent Tickets</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {['Ticket #', 'Subject', 'Requester', 'Status', 'Priority'].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tickets.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{t.subject}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{t.requester}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full
                    ${t.status === 'Open' ? 'bg-green-100 text-green-800' :
                      t.status === 'Closed' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'}`}>
                    {t.status}
                  </span>
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${priorityColor[t.priority] || ''}`}>
                  {t.priority}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
