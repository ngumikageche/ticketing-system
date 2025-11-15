const statusBadge = {
  Open: 'bg-green-100 text-green-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  Closed: 'bg-gray-100 text-gray-800',
  Resolved: 'bg-blue-100 text-blue-800',
};

const priorityBadge = {
  Urgent: 'text-red-600 font-medium',
  High: 'text-orange-600 font-medium',
  Medium: 'text-amber-600 font-medium',
  Low: 'text-green-600 font-medium',
};

export default function TicketRow({ ticket }) {
  return (
    <tr className="hover:bg-gray-50 transition">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">{ticket.ticket_id || ticket.id}</td>
      <td className="px-6 py-4 text-sm text-gray-900">{ticket.subject}</td>
      <td className="px-6 py-4 text-sm text-gray-600">{ticket.requester_id}</td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge[ticket.status] || 'bg-gray-100 text-gray-800'}`}>
          {ticket.status}
        </span>
      </td>
      <td className={`px-6 py-4 whitespace-nowrap text-sm ${priorityBadge[ticket.priority] || 'text-gray-600'}`}>
        {ticket.priority}
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">{ticket.assignee_id || 'Unassigned'}</td>
    </tr>
  );
}
