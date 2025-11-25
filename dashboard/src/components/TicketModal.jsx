import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { uploadFileToCloudinary } from '../api/uploads.js';
import { X } from 'lucide-react';

export default function TicketModal({ open, onClose, onSubmit, mode = 'create', ticket = null, users = [], attachments: initialAttachments = [], currentUser = null }) {
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
  const [attachments, setAttachments] = useState([]);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentType, setAttachmentType] = useState('document');
  const [uploading, setUploading] = useState(false);

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
      // preload attachments if the ticket has them (front-end may load separate ticketAttachments)
  setAttachments(initialAttachments || ticket.media || []);
    } else if (open && mode === 'create') {
      setForm({
        subject: '',
        requester_id: '',
        requester_name: '',
        assignee_id: '',
        priority: 'Medium',
        status: 'Open',
        description: ''
      });
      setAttachments([]);
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
    
    // Validate required fields
    if (!form.subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    
    if (requesterType === 'registered' && !form.requester_id) {
      toast.error('Please select a registered requester');
      return;
    }
    
    if (requesterType === 'external' && !form.requester_name.trim()) {
      toast.error('Requester name is required for external requesters');
      return;
    }
    
    if (!form.priority) {
      toast.error('Please select a priority');
      return;
    }
    
    if (!form.status) {
      toast.error('Please select a status');
      return;
    }
    
    if (!form.description.trim()) {
      toast.error('Description is required');
      return;
    }
    
    const submitData = { ...form };
    if (requesterType === 'external') {
      delete submitData.requester_id;
    } else {
      delete submitData.requester_name;
    }
    if (attachments && attachments.length > 0) {
      const ids = attachments.map(a => a.id).filter(Boolean);
      if (ids.length) submitData.media_ids = ids;
    }
    onSubmit(submitData);
  };

  const addAttachment = async () => {
    if (!attachmentFile) return;
    try {
      setUploading(true);
      const owner = {};
      if (mode === 'edit' && ticket && ticket.id) owner.ticket_id = ticket.id;
      const createdMedia = await uploadFileToCloudinary(attachmentFile, owner, { uploaded_by: currentUser ? currentUser.id : undefined, type: attachmentType });
      setAttachments(prev => [...prev, createdMedia]);
      setAttachmentFile(null);
      setAttachmentType('document');
      toast.success('Attachment uploaded successfully!');
    } catch (err) {
      toast.error('Failed to upload attachment: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (i) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== i));
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
                required
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
                required
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                required
                rows={4}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Attachments input: simple URL-based attachments for now */}
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
                <div className="flex gap-2 items-center">
                  <input type="file" onChange={e => setAttachmentFile(e.target.files[0])} className="flex-1 p-2" />
                  <select value={attachmentType} onChange={e => setAttachmentType(e.target.value)} className="p-2 border rounded">
                    <option value="document">Document</option>
                    <option value="photo">Photo</option>
                    <option value="video">Video</option>
                  </select>
                  <button type="button" onClick={addAttachment} disabled={!attachmentFile || uploading} className="px-3 py-1 bg-primary text-white rounded disabled:opacity-50">{uploading ? 'Uploading...' : 'Add'}</button>
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
                {mode === 'edit' ? 'Update Ticket' : 'Create Ticket'}
              </button>
            </div>
          </form>
      </div>
    </div>
  );
}
