import { useState, useMemo } from 'react';
import TicketModal from '../components/TicketModal';
import TicketRow from '../components/TicketRow';
import { Plus, Search } from 'lucide-react';

const mockTickets = [
  { id: '#1245', subject: 'Unable to login', requester: 'James Anderson', status: 'Open', priority: 'High', date: '2025-11-14' },
  { id: '#1243', subject: 'Issue on checkout', requester: 'Lisa Brown', status: 'Closed', priority: 'Low', date: '2025-11-13' },
  { id: '#1241', subject: 'Payment failed', requester: 'David Williams', status: 'In Progress', priority: 'Medium', date: '2025-11-12' },
  { id: '#1239', subject: 'Slow loading times', requester: 'Sarah Kim', status: 'Open', priority: 'Urgent', date: '2025-11-11' },
  { id: '#1237', subject: 'Password reset not working', requester: 'Mike Chen', status: 'Open', priority: 'High', date: '2025-11-10' },
  // add more as needed
];

const priorityOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
const statusOptions = ['All', 'Open', 'In Progress', 'Closed'];
const priorityOptions = ['All', 'Urgent', 'High', 'Medium', 'Low'];

export default function Tickets() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);

  const filtered = useMemo(() => {
    return mockTickets
      .filter(t => {
        const matchesSearch = t.subject.toLowerCase().includes(search.toLowerCase()) ||
                              t.id.includes(search) ||
                              t.requester.toLowerCase().includes(search);
        const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
        const matchesPriority = priorityFilter === 'All' || t.priority === priorityFilter;
        return matchesSearch && matchesStatus && matchesPriority;
      })
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [search, statusFilter, priorityFilter]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header + New Ticket */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">All Tickets</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          New Ticket
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Ticket #', 'Subject', 'Requester', 'Status', 'Priority', 'Created'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No tickets found.
                  </td>
                </tr>
              ) : (
                filtered.map(ticket => (
                  <TicketRow key={ticket.id} ticket={ticket} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (mock) */}
        <div className="px-6 py-3 bg-gray-50 border-t flex items-center justify-between text-sm text-gray-700">
          <span>Showing 1 to {filtered.length} of {mockTickets.length} results</span>
          <div className="flex gap-1">
            <button className="px-3 py-1 rounded bg-white border hover:bg-gray-100">1</button>
            <button disabled className="px-3 py-1 rounded bg-white border text-gray-400">2</button>
          </div>
        </div>
      </div>

      {/* New Ticket Modal */}
      <TicketModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
