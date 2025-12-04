import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import TicketModal from '../components/TicketModal';
import TicketRow from '../components/TicketRow';
import { Plus, Search } from 'lucide-react';
import { getTickets, createTicket, updateTicket, deleteTicket } from '../api/tickets.js';
import { getUsers } from '../api/users.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getComments, createComment } from '../api/comments.js';
import { getAttachments, createAttachment, deleteAttachment } from '../api/attachments.js';
import { uploadFileToCloudinary } from '../api/uploads.js';
import { useRealtimeTickets, useRealtimeComments } from '../hooks/useRealtime';
import { useSettings } from '../contexts/SettingsContext.jsx';
import { getModules } from '../api/modules.js';
import { toast } from 'react-hot-toast';
import { encryptMessage, decryptMessage } from '../utils/encryption';

const priorityOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
const statusOptions = ['All', 'Open', 'In Progress', 'Closed'];
const priorityOptions = ['All', 'Urgent', 'High', 'Medium', 'Low'];

export default function Tickets() {
  const [users, setUsers] = useState([]);
  const [modules, setModules] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [viewTicket, setViewTicket] = useState(null);
  const [editTicket, setEditTicket] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTicketAttachments, setEditTicketAttachments] = useState([]);
  const [newComment, setNewComment] = useState({ content: '' });
  const [ticketAttachments, setTicketAttachments] = useState([]);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentFilename, setAttachmentFilename] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentType, setAttachmentType] = useState('document');
  const [currentUser, setCurrentUser] = useState(null);
  const { currentUser: authCurrentUser, loading: authLoading } = useAuth();
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const [initialLoading, setInitialLoading] = useState(true);

  // Use real-time hooks
  const { tickets, loading: ticketsLoading, loadTickets } = useRealtimeTickets();
  const { comments, loading: commentsLoading, loadComments } = useRealtimeComments(viewTicket?.id);

  // Show loading state while settings or auth are loading
  if (authLoading || settings.loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg text-gray-600 dark:text-gray-400">Loading...</div>
    </div>;
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersData = await getUsers();
        setUsers(usersData);
        const modulesData = await getModules();
        setModules(modulesData);
        // set current user from auth context when available
        if (!authLoading && authCurrentUser) setCurrentUser(authCurrentUser);
        // Load tickets using the real-time hook
        await loadTickets();
        setInitialLoading(false);
      } catch (err) {
        setError(err.message);
        setInitialLoading(false);
      }
    };
    fetchData();
  }, []);

  // Auto-refresh tickets based on settings - use refs to prevent frequent re-renders
  const refreshIntervalRef = useRef(null);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    if (!settings.ticket_auto_refresh || settings.auto_refresh_interval <= 0) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    // Clear existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Set new interval
    refreshIntervalRef.current = setInterval(() => {
      // Use ref to avoid stale closure issues
      if (settingsRef.current.ticket_auto_refresh) {
        loadTickets();
      }
    }, settings.auto_refresh_interval * 1000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [settings.ticket_auto_refresh, settings.auto_refresh_interval, loadTickets]);

  const fetchTickets = async () => {
    await loadTickets();
  };

  const handleCreateTicket = useCallback(async (ticketData) => {
    try {
      const created = await createTicket(ticketData);
      setShowModal(false);
      fetchTickets(); // Refetch tickets
      toast.success('Ticket created successfully!');
      // Create attachments if included
      if (Array.isArray(ticketData.attachments) && ticketData.attachments.length > 0) {
        for (const att of ticketData.attachments) {
          await createAttachment({
            filename: att.filename,
            url: att.url,
            uploaded_by: currentUser ? currentUser.id : undefined,
            ticket_id: created.id,
          });
        }
      }
    } catch (err) {
      toast.error('Error creating ticket: ' + err.message);
    }
  }, [currentUser]);

  const handleView = useCallback(async (ticket) => {
    setViewTicket(ticket);
    setShowViewModal(true);
    // Load comments for this ticket using real-time hook
    await loadComments(ticket.id);
    // Load attachments for this ticket
    try {
      const atts = await getAttachments({ ticket_id: ticket.id });
      setTicketAttachments(atts);
    } catch (err) {
      console.error('Failed to load ticket attachments', err);
      setTicketAttachments([]);
    }
  }, [loadComments]);

  const handleEdit = useCallback((ticket) => {
    setEditTicket(ticket);
    setShowEditModal(true);
    // Preload attachments for editing
    (async () => {
      try {
        const atts = await getAttachments({ ticket_id: ticket.id });
        setEditTicketAttachments(atts);
      } catch (err) {
        setEditTicketAttachments([]);
      }
    })();
  }, []);

  const handleDelete = useCallback(async (ticket) => {
    if (window.confirm(`Are you sure you want to delete ticket "${ticket.subject}"?`)) {
      try {
        await deleteTicket(ticket.id);
        fetchTickets();
        toast.success('Ticket deleted successfully!');
      } catch (err) {
        toast.error('Error deleting ticket: ' + err.message);
      }
    }
  }, []);

  const handleUpdateTicket = useCallback(async (ticketData) => {
    try {
      const updated = await updateTicket(editTicket.id, ticketData);
      setShowEditModal(false);
      setEditTicket(null);
      fetchTickets();
      toast.success('Ticket updated successfully!');
      // Create attachments if included
      if (Array.isArray(ticketData.attachments) && ticketData.attachments.length > 0) {
        for (const att of ticketData.attachments) {
          await createAttachment({
            filename: att.filename,
            url: att.url,
            uploaded_by: currentUser ? currentUser.id : undefined,
            ticket_id: updated.id,
          });
        }
      }
    } catch (err) {
      toast.error('Error updating ticket: ' + err.message);
    }
  }, [editTicket, currentUser]);

  const handleAddComment = useCallback(async (e) => {
    e.preventDefault();
    if (!newComment.content || !currentUser) return;
    try {
      await createComment({
        content: encryptMessage(newComment.content),
        ticket_id: viewTicket.id,
        author_id: currentUser.id
      });
      setNewComment({ content: '' });
      // Comments will be updated automatically via WebSocket
      toast.success('Comment added successfully!');
    } catch (err) {
      toast.error('Error adding comment: ' + err.message);
    }
  }, [newComment.content, currentUser, viewTicket]);

  const handleAddAttachment = useCallback(async (e) => {
    e.preventDefault();
    if (!currentUser || !viewTicket) return;
    try {
      let created;
      if (attachmentFile) {
        // Use Cloudinary signed upload helper and attach to this ticket
        const owner = { ticket_id: viewTicket.id };
        created = await uploadFileToCloudinary(attachmentFile, owner, { uploaded_by: currentUser.id, type: attachmentType });
        setAttachmentFile(null);
        setAttachmentType('document');
      } else {
        // fallback to URL-based attachment
        if (!attachmentFilename || !attachmentUrl) return;
        created = await createAttachment({
          filename: attachmentFilename,
          url: attachmentUrl,
          uploaded_by: currentUser.id,
          ticket_id: viewTicket.id,
        });
        setAttachmentFilename('');
        setAttachmentUrl('');
      }
      // reload attachments
      const atts = await getAttachments({ ticket_id: viewTicket.id });
      setTicketAttachments(atts);
      toast.success('Attachment added successfully!');
    } catch (err) {
      toast.error('Failed to add attachment: ' + err.message);
    }
  }, [currentUser, viewTicket, attachmentFile, attachmentFilename, attachmentUrl, attachmentType]);

  const handleDeleteAttachment = useCallback(async (id) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;
    try {
      await deleteAttachment(id);
      setTicketAttachments(ticketAttachments.filter(a => a.id !== id));
      toast.success('Attachment deleted successfully!');
    } catch (err) {
      toast.error('Failed to delete attachment: ' + err.message);
    }
  }, [ticketAttachments]);

  const userMap = useMemo(() => {
    const map = {};
    users.forEach(user => {
      map[user.id] = user.name;
    });
    return map;
  }, [users]);

  const filtered = useMemo(() => {
    let sorted = tickets
      .filter(t => {
        const matchesSearch = t.subject.toLowerCase().includes(search.toLowerCase()) ||
                              (t.ticket_id || t.id).toLowerCase().includes(search.toLowerCase()) ||
                              t.requester_id.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
        const matchesPriority = priorityFilter === 'All' || t.priority === priorityFilter;
        return matchesSearch && matchesStatus && matchesPriority;
      });

    // Apply sorting based on user settings
    switch (settings.ticket_sort_order) {
      case 'newest':
        sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
        break;
      case 'priority':
        sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        break;
      case 'status':
        sorted.sort((a, b) => a.status.localeCompare(b.status));
        break;
      default:
        sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    }

    return sorted;
  }, [tickets, search, statusFilter, priorityFilter, settings.ticket_sort_order]); // Only depend on specific settings property

  if (initialLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header + New Ticket */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">All Tickets</h1>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            New Ticket
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {['Ticket #', 'Subject', 'Requester', 'Status', 'Priority', 'Assignee', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      No tickets found.
                    </td>
                  </tr>
                ) : (
                  filtered.map(ticket => (
                    <TicketRow key={ticket.id} ticket={ticket} userMap={userMap} onView={handleView} onEdit={handleEdit} onDelete={handleDelete} />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination (mock) */}
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
            <span>Showing 1 to {filtered.length} of {tickets.length} results</span>
            <div className="flex gap-1">
              <button className="px-3 py-1 rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300">1</button>
              <button disabled className="px-3 py-1 rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-400 dark:text-gray-500">2</button>
            </div>
          </div>
        </div>
      </div>

      {/* New Ticket Modal */}
      <TicketModal open={showModal} onClose={() => setShowModal(false)} onSubmit={handleCreateTicket} users={users} modules={modules} onModulesUpdate={setModules} />

      {/* View Ticket Modal */}
      {showViewModal && viewTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 relative border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => { setShowViewModal(false); setViewTicket(null); setNewComment({ content: '' }); setTicketAttachments([]); }}
              className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Ticket Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="text-gray-900 dark:text-gray-100"><strong>ID:</strong> {viewTicket.ticket_id || viewTicket.id}</div>
                <div className="text-gray-900 dark:text-gray-100"><strong>Subject:</strong> {viewTicket.subject}</div>
                <div className="text-gray-900 dark:text-gray-100"><strong>Description:</strong> {decryptMessage(viewTicket.description)}</div>
                <div className="text-gray-900 dark:text-gray-100"><strong>Status:</strong> {viewTicket.status}</div>
                <div className="text-gray-900 dark:text-gray-100"><strong>Priority:</strong> {viewTicket.priority}</div>
                <div className="text-gray-900 dark:text-gray-100"><strong>Requester:</strong> {userMap[viewTicket.requester_id] || viewTicket.requester_name || viewTicket.requester_id}</div>
                <div className="text-gray-900 dark:text-gray-100"><strong>Assignee:</strong> {userMap[viewTicket.assignee_id] || 'Unassigned'}</div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Comments</h3>
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {comments.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">No comments yet.</p>
                  ) : (
                    comments.map(comment => (
                      <div key={comment.id} className="border-b border-gray-200 dark:border-gray-600 pb-2">
                        <div className="flex justify-between">
                          <strong className="text-gray-900 dark:text-gray-100">{userMap[comment.author_id] || comment.author_id}</strong>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{new Date(comment.created_at || Date.now()).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300">{decryptMessage(comment.content)}</p>
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={handleAddComment} className="mt-4 space-y-2">
                  <textarea
                    required
                    rows={3}
                    placeholder="Add a comment..."
                    value={newComment.content}
                    onChange={e => setNewComment({ ...newComment, content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <button
                    type="submit"
                    disabled={!currentUser}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Add Comment
                  </button>
                </form>
                
                {/* Attachments for this ticket */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Attachments</h3>
                  <div className="space-y-3 mb-3">
                    {ticketAttachments.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400">No attachments for this ticket.</p>
                    ) : (
                      ticketAttachments.map(a => (
                        <div key={a.id} className="flex items-center justify-between p-2 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                          <div>
                            <a href={a.secure_url || a.url} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{a.filename}</a>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{a.resource_type || a.type} • {a.size || '-'} bytes</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleDeleteAttachment(a.id)} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500">Delete</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleAddAttachment} className="space-y-2">
                    <div className="flex gap-2 items-center">
                      <input type="file" onChange={e => setAttachmentFile(e.target.files[0])} className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                      <select value={attachmentType} onChange={e => setAttachmentType(e.target.value)} className="p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                        <option value="document">Document</option>
                        <option value="photo">Photo</option>
                        <option value="video">Video</option>
                      </select>
                    </div>
                    <div className="flex gap-2 items-center">
                      <input value={attachmentFilename} onChange={e => setAttachmentFilename(e.target.value)} placeholder="Filename" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400" />
                      <input value={attachmentUrl} onChange={e => setAttachmentUrl(e.target.value)} placeholder="URL (e.g., https://)" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400" />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button type="submit" className="px-3 py-1 bg-primary text-white rounded">Attach</button>
                      <button type="button" onClick={() => { setAttachmentFilename(''); setAttachmentUrl(''); }} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500">Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Ticket Modal */}
      <TicketModal
        open={showEditModal}
        onClose={() => { setShowEditModal(false); setEditTicket(null); }}
        onSubmit={handleUpdateTicket}
        mode="edit"
        ticket={editTicket}
        users={users}
        modules={modules}
        onModulesUpdate={setModules}
        attachments={editTicketAttachments}
      />
    </>
  );
}
