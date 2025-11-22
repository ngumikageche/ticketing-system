import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import TicketModal from '../components/TicketModal';
import TicketRow from '../components/TicketRow';
import { Plus, Search } from 'lucide-react';
import { getTickets, createTicket, updateTicket, deleteTicket } from '../api/tickets.js';
import { getUsers, getCurrentUser } from '../api/users.js';
import { getComments, createComment } from '../api/comments.js';
import { getAttachments, createAttachment, deleteAttachment } from '../api/attachments.js';
import { uploadFileToCloudinary } from '../api/uploads.js';
import { useRealtimeTickets, useRealtimeComments } from '../hooks/useRealtime';

const priorityOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
const statusOptions = ['All', 'Open', 'In Progress', 'Closed'];
const priorityOptions = ['All', 'Urgent', 'High', 'Medium', 'Low'];

export default function Tickets() {
  const [users, setUsers] = useState([]);
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
  const [searchParams] = useSearchParams();

  // Use real-time hooks
  const { tickets, loading: ticketsLoading, loadTickets } = useRealtimeTickets();
  const { comments, loading: commentsLoading, loadComments } = useRealtimeComments(viewTicket?.id);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, currentUserData] = await Promise.all([
          getUsers(),
          getCurrentUser()
        ]);
        setUsers(usersData);
        setCurrentUser(currentUserData);
        // Load tickets using the real-time hook
        await loadTickets();
      } catch (err) {
        setError(err.message);
      }
    };
    fetchData();
  }, []);

  // Handle URL parameter for auto-opening ticket
  useEffect(() => {
    const ticketId = searchParams.get('ticket');
    if (ticketId && tickets.length > 0) {
      const ticketToOpen = tickets.find(ticket => ticket.id === ticketId || ticket.ticket_id === ticketId);
      if (ticketToOpen) {
        handleView(ticketToOpen);
      }
    }
  }, [searchParams, tickets]);

  const fetchTickets = async () => {
    await loadTickets();
  };

  const handleCreateTicket = async (ticketData) => {
    try {
      const created = await createTicket(ticketData);
      setShowModal(false);
      fetchTickets(); // Refetch tickets
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
      alert('Error creating ticket: ' + err.message);
    }
  };

  const handleView = async (ticket) => {
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
  };

  const handleEdit = (ticket) => {
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
  };

  const handleDelete = async (ticket) => {
    if (window.confirm(`Are you sure you want to delete ticket "${ticket.subject}"?`)) {
      try {
        await deleteTicket(ticket.id);
        fetchTickets();
      } catch (err) {
        alert('Error deleting ticket: ' + err.message);
      }
    }
  };

  const handleUpdateTicket = async (ticketData) => {
    try {
      const updated = await updateTicket(editTicket.id, ticketData);
      setShowEditModal(false);
      setEditTicket(null);
      fetchTickets();
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
      alert('Error updating ticket: ' + err.message);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.content || !currentUser) return;
    try {
      await createComment({
        content: newComment.content,
        ticket_id: viewTicket.id,
        author_id: currentUser.id
      });
      setNewComment({ content: '' });
      // Comments will be updated automatically via WebSocket
    } catch (err) {
      alert('Error adding comment: ' + err.message);
    }
  };

  const handleAddAttachment = async (e) => {
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
    } catch (err) {
      alert('Failed to add attachment: ' + err.message);
    }
  };

  const handleDeleteAttachment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;
    try {
      await deleteAttachment(id);
      setTicketAttachments(ticketAttachments.filter(a => a.id !== id));
    } catch (err) {
      alert('Failed to delete attachment: ' + err.message);
    }
  };

  const userMap = useMemo(() => {
    const map = {};
    users.forEach(user => {
      map[user.id] = user.name;
    });
    return map;
  }, [users]);

  const filtered = useMemo(() => {
    return tickets
      .filter(t => {
        const matchesSearch = t.subject.toLowerCase().includes(search.toLowerCase()) ||
                              (t.ticket_id || t.id).toLowerCase().includes(search.toLowerCase()) ||
                              t.requester_id.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
        const matchesPriority = priorityFilter === 'All' || t.priority === priorityFilter;
        return matchesSearch && matchesStatus && matchesPriority;
      })
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [tickets, search, statusFilter, priorityFilter]);

  if (ticketsLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

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
            <thead className="bg-gray-50">
              <tr>
                {['Ticket #', 'Subject', 'Requester', 'Status', 'Priority', 'Assignee', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
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
        <div className="px-6 py-3 bg-gray-50 border-t flex items-center justify-between text-sm text-gray-700">
          <span>Showing 1 to {filtered.length} of {tickets.length} results</span>
          <div className="flex gap-1">
            <button className="px-3 py-1 rounded bg-white border hover:bg-gray-100">1</button>
            <button disabled className="px-3 py-1 rounded bg-white border text-gray-400">2</button>
          </div>
        </div>
      </div>

      {/* New Ticket Modal */}
      <TicketModal open={showModal} onClose={() => setShowModal(false)} onSubmit={handleCreateTicket} users={users} />

      {/* View Ticket Modal */}
      {showViewModal && viewTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => { setShowViewModal(false); setViewTicket(null); setNewComment({ content: '' }); setTicketAttachments([]); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4">Ticket Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div><strong>ID:</strong> {viewTicket.ticket_id || viewTicket.id}</div>
                <div><strong>Subject:</strong> {viewTicket.subject}</div>
                <div><strong>Description:</strong> {viewTicket.description}</div>
                <div><strong>Status:</strong> {viewTicket.status}</div>
                <div><strong>Priority:</strong> {viewTicket.priority}</div>
                <div><strong>Requester:</strong> {userMap[viewTicket.requester_id] || viewTicket.requester_name || viewTicket.requester_id}</div>
                <div><strong>Assignee:</strong> {userMap[viewTicket.assignee_id] || 'Unassigned'}</div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Comments</h3>
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {comments.length === 0 ? (
                    <p className="text-gray-500">No comments yet.</p>
                  ) : (
                    comments.map(comment => (
                      <div key={comment.id} className="border-b pb-2">
                        <div className="flex justify-between">
                          <strong>{userMap[comment.author_id] || comment.author_id}</strong>
                          <span className="text-sm text-gray-500">{new Date(comment.created_at || Date.now()).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-700">{comment.content}</p>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                  <h3 className="text-lg font-semibold mb-2">Attachments</h3>
                  <div className="space-y-3 mb-3">
                    {ticketAttachments.length === 0 ? (
                      <p className="text-gray-500">No attachments for this ticket.</p>
                    ) : (
                      ticketAttachments.map(a => (
                        <div key={a.id} className="flex items-center justify-between p-2 rounded border">
                          <div>
                            <a href={a.secure_url || a.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{a.filename}</a>
                            <div className="text-xs text-gray-500">{a.resource_type || a.type} • {a.size || '-'} bytes</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleDeleteAttachment(a.id)} className="px-3 py-1 border rounded">Delete</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleAddAttachment} className="space-y-2">
                    <div className="flex gap-2 items-center">
                      <input type="file" onChange={e => setAttachmentFile(e.target.files[0])} className="flex-1 p-2" />
                      <select value={attachmentType} onChange={e => setAttachmentType(e.target.value)} className="p-2 border rounded">
                        <option value="document">Document</option>
                        <option value="photo">Photo</option>
                        <option value="video">Video</option>
                      </select>
                    </div>
                    <div className="flex gap-2 items-center">
                      <input value={attachmentFilename} onChange={e => setAttachmentFilename(e.target.value)} placeholder="Filename" className="w-full p-2 border rounded" />
                      <input value={attachmentUrl} onChange={e => setAttachmentUrl(e.target.value)} placeholder="URL (e.g., https://)" className="w-full p-2 border rounded" />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button type="submit" className="px-3 py-1 bg-primary text-white rounded">Attach</button>
                      <button type="button" onClick={() => { setAttachmentFilename(''); setAttachmentUrl(''); }} className="px-3 py-1 border rounded">Cancel</button>
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
        attachments={editTicketAttachments}
      />
    </div>
  );
}
