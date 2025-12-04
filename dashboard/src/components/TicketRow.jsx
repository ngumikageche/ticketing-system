import { memo } from 'react';
import { Eye, Edit, Trash2 } from 'lucide-react';

const statusBadge = {
  Open: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300',
  'In Progress': 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300',
  Closed: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
  Resolved: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300',
};

const priorityBadge = {
  Urgent: 'text-red-600 dark:text-red-400 font-medium',
  High: 'text-orange-600 dark:text-orange-400 font-medium',
  Medium: 'text-amber-600 dark:text-amber-400 font-medium',
  Low: 'text-green-600 dark:text-green-400 font-medium',
};

const TicketRow = ({ ticket, userMap, onView, onEdit, onDelete }) => {
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">{ticket.ticket_id || ticket.id}</td>
      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{ticket.subject}</td>
      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{userMap[ticket.requester_id] || ticket.requester_name || ticket.requester_id}</td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={"inline-flex px-2 py-1 text-xs font-semibold rounded-full " + (statusBadge[ticket.status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300')}>
          {ticket.status}
        </span>
      </td>
      <td className={"px-6 py-4 whitespace-nowrap text-sm " + (priorityBadge[ticket.priority] || 'text-gray-600 dark:text-gray-400')}>
        {ticket.priority}
      </td>
      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{userMap[ticket.assignee_id] || 'Unassigned'}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex space-x-2">
          <button
            onClick={() => onView(ticket)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
            title="View"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => onEdit(ticket)}
            className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
            title="Edit"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => onDelete(ticket)}
            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default memo(TicketRow);
