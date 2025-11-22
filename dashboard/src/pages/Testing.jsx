import { useState, useEffect } from 'react';
import { getTestingSessions, createTestingSession, updateTestingSession, deleteTestingSession } from '../api/testing.js';
import { createAttachment } from '../api/attachments.js';
import { uploadFileToCloudinary } from '../api/uploads.js';
import { getTickets } from '../api/tickets.js';
import { getCurrentUser } from '../api/users.js';

export default function Testing() {
  const [testingSessions, setTestingSessions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [filters, setFilters] = useState({
    ticket_id: '',
    user_id: '',
    status: ''
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  useEffect(() => {
    const loadCurrent = async () => {
      try {
        const cur = await getCurrentUser();
        setCurrentUser(cur);
      } catch (err) {
        // not logged in or failed - ignore gracefully
      }
    };
    loadCurrent();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessionsData, ticketsData] = await Promise.all([
        getTestingSessions(filters),
        getTickets()
      ]);
      setTestingSessions(sessionsData);
      setTickets(ticketsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (sessionData) => {
    try {
      const created = await createTestingSession(sessionData);
      setShowCreateModal(false);
      loadData();
      // If attachments included in sessionData, create them and associate with testing id
      if (Array.isArray(sessionData.attachments) && sessionData.attachments.length > 0) {
        for (const att of sessionData.attachments) {
          await createAttachment({
            filename: att.filename,
            url: att.url,
            uploaded_by: currentUser ? currentUser.id : undefined,
            testing_id: created.id,
          });
        }
      }
    } catch (error) {
      alert('Failed to create testing session: ' + error.message);
    }
  };

  const handleUpdateSession = async (id, updateData) => {
    try {
      const updated = await updateTestingSession(id, updateData);
      setSelectedSession(null);
      loadData();
      // Create attachments for testing session if provided
      if (Array.isArray(updateData.attachments) && updateData.attachments.length > 0) {
        for (const att of updateData.attachments) {
          await createAttachment({
            filename: att.filename,
            url: att.url,
            uploaded_by: currentUser ? currentUser.id : undefined,
            testing_id: updated.id,
          });
        }
      }
    } catch (error) {
      alert('Failed to update testing session: ' + error.message);
    }
  };

  const handleDeleteSession = async (id) => {
    if (!confirm('Are you sure you want to delete this testing session?')) return;
    try {
      await deleteTestingSession(id);
      loadData();
    } catch (error) {
      alert('Failed to delete testing session: ' + error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'passed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTestTypeColor = (type) => {
    switch (type) {
      case 'manual': return 'bg-purple-100 text-purple-800';
      case 'unit': return 'bg-indigo-100 text-indigo-800';
      case 'integration': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTicketSubject = (ticketId) => {
    const ticket = tickets.find(t => t.id === ticketId);
    return ticket ? ticket.subject : `Ticket ${ticketId}`;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Testing Sessions</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Create Testing Session
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ticket ID</label>
            <input
              type="text"
              value={filters.ticket_id}
              onChange={(e) => setFilters({ ...filters, ticket_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Filter by ticket ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
            <input
              type="text"
              value={filters.user_id}
              onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Filter by user ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Testing Sessions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Results</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {testingSessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{getTicketSubject(session.ticket_id)}</div>
                    <div className="text-xs text-gray-500">ID: {session.ticket_id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(session.status)}`}>
                      {session.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTestTypeColor(session.test_type)}`}>
                      {session.test_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {session.results || 'No results yet'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(session.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedSession(session)}
                      className="text-primary hover:text-blue-700 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateTestingModal
          tickets={tickets}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSession}
        />
      )}

      {/* Edit Modal */}
      {selectedSession && (
        <EditTestingModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onSubmit={handleUpdateSession}
        />
      )}
    </div>
  );
}

// Create Testing Modal Component
function CreateTestingModal({ tickets, onClose, onSubmit }) {
  const [form, setForm] = useState({
    ticket_id: '',
    status: 'pending',
    test_type: 'manual',
    results: ''
  });
  const [attachments, setAttachments] = useState([]);
  const [attachmentFilename, setAttachmentFilename] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentType, setAttachmentType] = useState('document');

  // Filter tickets to only show resolved ones
  const eligibleTickets = tickets.filter(ticket => ticket.status === 'Resolved');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.ticket_id) {
      alert('Please select a ticket');
      return;
    }
    const payload = { ...form };
    if (attachments.length > 0) {
      // Prefer sending media_ids (created via cloudinary) to the server
      const mediaIds = attachments.filter(a => a.id).map(a => a.id);
      if (mediaIds.length > 0) payload.media_ids = mediaIds;
      // Keep legacy attachments payload (without ids) when no media ids exist
      const legacy = attachments.filter(a => !a.id);
      if (legacy.length > 0) payload.attachments = legacy;
    }
    onSubmit(payload);
  };

  const addAttachment = async () => {
    if (attachmentFile) {
      try {
        const owner = {};
        const created = await uploadFileToCloudinary(attachmentFile, owner, { uploaded_by: undefined, type: attachmentType });
        setAttachments(prev => [...prev, created]);
        setAttachmentFile(null);
        setAttachmentType('document');
      } catch (err) {
        alert('Failed to upload attachment: ' + err.message);
      }
      return;
    }
    if (!attachmentFilename || !attachmentUrl) return;
    setAttachments(prev => [...prev, { filename: attachmentFilename, url: attachmentUrl }]);
    setAttachmentFilename('');
    setAttachmentUrl('');
  };

  const removeAttachment = (i) => setAttachments(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Create Testing Session</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ticket</label>
            <select
              required
              value={form.ticket_id}
              onChange={(e) => setForm({ ...form, ticket_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Resolved Ticket</option>
              {eligibleTickets.map(ticket => (
                <option key={ticket.id} value={ticket.id}>
                  {ticket.ticket_id} - {ticket.subject}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Test Type</label>
            <select
              value={form.test_type}
              onChange={(e) => setForm({ ...form, test_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="manual">Manual</option>
              <option value="unit">Unit</option>
              <option value="integration">Integration</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Initial Results</label>
            <textarea
              value={form.results}
              onChange={(e) => setForm({ ...form, results: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              placeholder="Optional initial test results"
            />
          </div>
            {/* Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Attachments</label>
              <div className="space-y-2">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 p-2 border rounded">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{att.filename}</div>
                      <div className="text-xs text-gray-500 truncate max-w-full">{att.url}</div>
                    </div>
                    <button type="button" onClick={() => removeAttachment(i)} className="text-red-600">Remove</button>
                  </div>
                ))}
                  <div className="flex gap-2">
                  <input type="file" onChange={e => setAttachmentFile(e.target.files[0])} className="flex-1 p-2 border rounded" />
                  <select value={attachmentType} onChange={e => setAttachmentType(e.target.value)} className="p-2 border rounded">
                    <option value="document">Document</option>
                    <option value="photo">Photo</option>
                    <option value="video">Video</option>
                  </select>
                  </div>
                  <div className="flex gap-2 mt-2">
                  <input value={attachmentFilename} onChange={e => setAttachmentFilename(e.target.value)} placeholder="Filename" className="flex-1 p-2 border rounded" />
                  <input value={attachmentUrl} onChange={e => setAttachmentUrl(e.target.value)} placeholder="URL" className="flex-1 p-2 border rounded" />
                  <button type="button" onClick={addAttachment} className="px-3 py-1 bg-primary text-white rounded">Add</button>
                </div>
              </div>
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
              Create Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Testing Modal Component
function EditTestingModal({ session, onClose, onSubmit }) {
  const [form, setForm] = useState({
    status: session.status,
    test_type: session.test_type,
    results: session.results || ''
  });
  const [attachments, setAttachments] = useState([]);
  const [attachmentFilename, setAttachmentFilename] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentType, setAttachmentType] = useState('document');

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (attachments.length > 0) {
      const mediaIds = attachments.filter(a => a.id).map(a => a.id);
      if (mediaIds.length > 0) payload.media_ids = mediaIds;
      const legacy = attachments.filter(a => !a.id);
      if (legacy.length > 0) payload.attachments = legacy;
    }
    onSubmit(session.id, payload);
  };

  const addAttachment = async () => {
    if (attachmentFile) {
      try {
        const owner = {};
        const created = await uploadFileToCloudinary(attachmentFile, owner, { uploaded_by: undefined, type: attachmentType });
        setAttachments(prev => [...prev, created]);
        setAttachmentFile(null);
        setAttachmentType('document');
      } catch (err) {
        alert('Failed to upload attachment: ' + err.message);
      }
      return;
    }
    if (!attachmentFilename || !attachmentUrl) return;
    setAttachments(prev => [...prev, { filename: attachmentFilename, url: attachmentUrl }]);
    setAttachmentFilename('');
    setAttachmentUrl('');
  };

  const removeAttachment = (i) => setAttachments(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Update Testing Session</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Test Type</label>
            <select
              value={form.test_type}
              onChange={(e) => setForm({ ...form, test_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="manual">Manual</option>
              <option value="unit">Unit</option>
              <option value="integration">Integration</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Results</label>
            <textarea
              value={form.results}
              onChange={(e) => setForm({ ...form, results: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              rows={4}
              placeholder="Test results and notes"
            />
          </div>
          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Attachments</label>
            <div className="space-y-2">
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center justify-between gap-3 p-2 border rounded">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{att.filename}</div>
                    <div className="text-xs text-gray-500 truncate max-w-full">{att.url}</div>
                  </div>
                  <button type="button" onClick={() => removeAttachment(i)} className="text-red-600">Remove</button>
                </div>
              ))}
              <div className="flex gap-2">
                <input type="file" onChange={e => setAttachmentFile(e.target.files[0])} className="flex-1 p-2 border rounded" />
                <select value={attachmentType} onChange={e => setAttachmentType(e.target.value)} className="p-2 border rounded">
                  <option value="document">Document</option>
                  <option value="photo">Photo</option>
                  <option value="video">Video</option>
                </select>
              </div>
              <div className="flex gap-2 mt-2">
                <input value={attachmentFilename} onChange={e => setAttachmentFilename(e.target.value)} placeholder="Filename" className="flex-1 p-2 border rounded" />
                <input value={attachmentUrl} onChange={e => setAttachmentUrl(e.target.value)} placeholder="URL" className="flex-1 p-2 border rounded" />
                <button type="button" onClick={addAttachment} className="px-3 py-1 bg-primary text-white rounded">Add</button>
              </div>
            </div>
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
              Update Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}