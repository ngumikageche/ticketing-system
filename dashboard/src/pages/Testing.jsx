import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getTestingSessions, createTestingSession, updateTestingSession, deleteTestingSession } from '../api/testing.js';
import { createAttachment } from '../api/attachments.js';
import { uploadFileToCloudinary } from '../api/uploads.js';
import { getTickets } from '../api/tickets.js';
import { getCurrentUser } from '../api/users.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Testing() {
  const [testingSessions, setTestingSessions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const { currentUser: authCurrentUser, loading: authLoading } = useAuth();
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
    // Use auth current user from context if available
    if (!authLoading && authCurrentUser) {
      setCurrentUser(authCurrentUser);
    }
  }, [authLoading, authCurrentUser]);

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
      toast.success('Testing session created successfully!');
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
      toast.error('Failed to create testing session: ' + error.message);
    }
  };

  const handleUpdateSession = async (id, updateData) => {
    try {
      const updated = await updateTestingSession(id, updateData);
      setSelectedSession(null);
      loadData();
      toast.success('Testing session updated successfully!');
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
      toast.error('Failed to update testing session: ' + error.message);
    }
  };

  const handleDeleteSession = async (id) => {
    if (!confirm('Are you sure you want to delete this testing session?')) return;
    try {
      await deleteTestingSession(id);
      loadData();
      toast.success('Testing session deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete testing session: ' + error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'passed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getTestTypeColor = (type) => {
    switch (type) {
      case 'manual': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'unit': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300';
      case 'integration': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getTicketSubject = (ticketId) => {
    const ticket = tickets.find(t => t.id === ticketId);
    return ticket ? ticket.subject : `Ticket ${ticketId}`;
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Testing Sessions</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          Create Testing Session
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ticket ID</label>
            <input
              type="text"
              value={filters.ticket_id}
              onChange={(e) => setFilters({ ...filters, ticket_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Filter by ticket ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User ID</label>
            <input
              type="text"
              value={filters.user_id}
              onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Filter by user ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ticket</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Test Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Results</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {testingSessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{getTicketSubject(session.ticket_id)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">ID: {session.ticket_id}</div>
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
                    <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                      {session.results || 'No results yet'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(session.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedSession(session)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
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
      toast.error('Please select a ticket');
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
        toast.success('Attachment uploaded successfully!');
      } catch (err) {
        toast.error('Failed to upload attachment: ' + err.message);
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Create Testing Session</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ticket</label>
            <select
              required
              value={form.ticket_id}
              onChange={(e) => setForm({ ...form, ticket_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Test Type</label>
            <select
              value={form.test_type}
              onChange={(e) => setForm({ ...form, test_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="manual">Manual</option>
              <option value="unit">Unit</option>
              <option value="integration">Integration</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Initial Results</label>
            <textarea
              value={form.results}
              onChange={(e) => setForm({ ...form, results: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              rows={3}
              placeholder="Optional initial test results"
            />
          </div>
            {/* Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Attachments</label>
              <div className="space-y-2">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 p-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{att.filename}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-full">{att.url}</div>
                    </div>
                    <button type="button" onClick={() => removeAttachment(i)} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">Remove</button>
                  </div>
                ))}
                  <div className="flex gap-2">
                  <input type="file" onChange={e => setAttachmentFile(e.target.files[0])} className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                  <select value={attachmentType} onChange={e => setAttachmentType(e.target.value)} className="p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <option value="document">Document</option>
                    <option value="photo">Photo</option>
                    <option value="video">Video</option>
                  </select>
                  </div>
                  <div className="flex gap-2 mt-2">
                  <input value={attachmentFilename} onChange={e => setAttachmentFilename(e.target.value)} placeholder="Filename" className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400" />
                  <input value={attachmentUrl} onChange={e => setAttachmentUrl(e.target.value)} placeholder="URL" className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400" />
                  <button type="button" onClick={addAttachment} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">Add</button>
                </div>
              </div>
            </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
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
        toast.success('Attachment uploaded successfully!');
      } catch (err) {
        toast.error('Failed to upload attachment: ' + err.message);
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Update Testing Session</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Test Type</label>
            <select
              value={form.test_type}
              onChange={(e) => setForm({ ...form, test_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="manual">Manual</option>
              <option value="unit">Unit</option>
              <option value="integration">Integration</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Results</label>
            <textarea
              value={form.results}
              onChange={(e) => setForm({ ...form, results: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              rows={4}
              placeholder="Test results and notes"
            />
          </div>
          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Attachments</label>
            <div className="space-y-2">
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center justify-between gap-3 p-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{att.filename}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-full">{att.url}</div>
                  </div>
                  <button type="button" onClick={() => removeAttachment(i)} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">Remove</button>
                </div>
              ))}
              <div className="flex gap-2">
                <input type="file" onChange={e => setAttachmentFile(e.target.files[0])} className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                <select value={attachmentType} onChange={e => setAttachmentType(e.target.value)} className="p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <option value="document">Document</option>
                  <option value="photo">Photo</option>
                  <option value="video">Video</option>
                </select>
              </div>
              <div className="flex gap-2 mt-2">
                <input value={attachmentFilename} onChange={e => setAttachmentFilename(e.target.value)} placeholder="Filename" className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400" />
                <input value={attachmentUrl} onChange={e => setAttachmentUrl(e.target.value)} placeholder="URL" className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400" />
                <button type="button" onClick={addAttachment} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">Add</button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Update Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}