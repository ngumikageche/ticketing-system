import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function TicketModal({ open, onClose, onSubmit, mode = 'create', ticket = null, users = [] }) {
  const [requesterType, setRequesterType] = useState('registered');
  const [form, setForm] = useState({
    subject: '',
    requester_id: '',
    requester_name: '',
    assignee_id: '',
    priority: '',
    status: '',
    description: ''
  });

  useEffect(() => {
    if (open && mode === 'edit' && ticket) {
      const isExternal = ticket.requester_name && !ticket.requester_id;
      setRequesterType(isExternal ? 'external' : 'registered');
      setForm({
        subject: ticket.subject || '',
        requester_id: ticket.requester_id || '',
        requester_name: ticket.requester_name || '',
        assignee_id: ticket.assignee_id || '',
        priority: ticket.priority || '',
        status: ticket.status || '',
        description: ticket.description || ''
      });
    } else if (open && mode === 'create') {
      setForm({
        subject: '',
        requester_id: '',
        requester_name: '',
        assignee_id: '',
        priority: '',
        status: '',
        description: ''
      });
      if (users.length > 0) {
        setForm(prev => ({ ...prev, requester_id: users[0].id }));
      }
    }
  }, [open, mode, ticket, users]);

  useEffect(() => {
    if (requesterType === 'registered') {
      setForm(prev => ({ ...prev, requester_name: '' }));
    } else if (requesterType === 'external') {
      setForm(prev => ({ ...prev, requester_id: '' }));
    }
  }, [requesterType]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = { ...form };
    if (requesterType === 'external') {
      delete submitData.requester_id;
    } else {
      delete submitData.requester_name;
    }
    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold mb-4">{mode === 'edit' ? 'Edit Ticket' : 'Create New Ticket'}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                required
                type="text"
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Requester Type</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="registered"
                    checked={requesterType === 'registered'}
                    onChange={e => setRequesterType(e.target.value)}
                    className="mr-2"
                  />
                  Registered User
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="external"
                    checked={requesterType === 'external'}
                    onChange={e => setRequesterType(e.target.value)}
                    className="mr-2"
                  />
                  External Requester
                </label>
              </div>
            </div>

            {requesterType === 'registered' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requester</label>
                <select
                  required
                  value={form.requester_id}
                  onChange={e => setForm({ ...form, requester_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select Requester</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requester Name</label>
                <input
                  required
                  type="text"
                  value={form.requester_name}
                  onChange={e => setForm({ ...form, requester_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
              <select
                value={form.assignee_id}
                onChange={e => setForm({ ...form, assignee_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Unassigned</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Priority</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700"
              >
                {mode === 'edit' ? 'Update Ticket' : 'Create Ticket'}
              </button>
            </div>
          </form>
      </div>
    </div>
  );
}
