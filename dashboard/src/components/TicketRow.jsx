const statusBadge = {
  Open: 'bg-green-100 text-green-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  Closed: 'bg-gray-100 text-gray-800',
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
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">{ticket.id}</td>
      <td className="px-6 py-4 text-sm text-gray-900">{ticket.subject}</td>
      <td className="px-6 py-4 text-sm text-gray-600">{ticket.requester}</td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge[ticket.status]}`}>
          {ticket.status}
        </span>
      </td>
      <td className={`px-6 py-4 whitespace-nowrap text-sm ${priorityBadge[ticket.priority]}`}>
        {ticket.priority}
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">{ticket.date}</td>
    </tr>
  );
}
