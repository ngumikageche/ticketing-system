import { useState, useEffect } from 'react';
import { X, Search, Users, MessageCircle, Plus } from 'lucide-react';
import { getUsers, getCurrentUser } from '../api/users.js';
import { createConversation, getConversations, getConversation } from '../api/conversations.js';

const CreateConversationModal = ({ isOpen, onClose, onConversationCreated, onExistingConversationFound }) => {
  const [conversationType, setConversationType] = useState('direct');
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      const [usersData, userData] = await Promise.all([
        getUsers(),
        getCurrentUser()
      ]);
      setUsers(usersData);
      setCurrentUser(userData);
    } catch (err) {
      setError('Failed to load users');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedUsers.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      // For direct messages, check if a conversation already exists with this user
      if (conversationType === 'direct') {
        const existingConversations = await getConversations();
        
        // Check if there's already a direct conversation between current user and selected user
        let foundExisting = null;
        for (const conv of existingConversations.filter(c => c.type === 'direct')) {
          try {
            const details = await getConversation(conv.id);
            if (details.participants && details.participants.length === 2) {
              // Check if both current user and selected user are participants
              const participantIds = details.participants.map(p => p.user_id);
              if (participantIds.includes(currentUser.id) && participantIds.includes(selectedUsers[0].id)) {
                foundExisting = conv;
                break;
              }
            }
          } catch (err) {
            console.error('Error checking conversation details:', err);
          }
        }

        if (foundExisting) {
          // If conversation exists, open it instead of creating a new one
          if (onExistingConversationFound) {
            onExistingConversationFound(foundExisting);
            // Reset form
            setConversationType('direct');
            setGroupName('');
            setSelectedUsers([]);
            setSearchTerm('');
            onClose();
            return;
          }
        }
      }

      const conversationData = {
        type: conversationType,
        created_by_id: currentUser.id,
        ...(conversationType === 'direct' && { recipient_id: selectedUsers[0].id }),
        ...(conversationType === 'group' && { 
          participants: selectedUsers.map(user => user.id),
          title: groupName.trim() || undefined
        })
      };

      const newConversation = await createConversation(conversationData);
      onConversationCreated(newConversation);

      // Reset form
      setConversationType('direct');
      setGroupName('');
      setSelectedUsers([]);
      setSearchTerm('');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (user) => {
    if (conversationType === 'direct') {
      // For direct messages, only allow selecting one user
      setSelectedUsers([user]);
    } else {
      // For groups, allow multiple selections
      setSelectedUsers(prev =>
        prev.find(u => u.id === user.id)
          ? prev.filter(u => u.id !== user.id)
          : [...prev, user]
      );
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        {/* Fixed Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Start a Conversation</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Conversation Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Conversation Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setConversationType('direct');
                      setSelectedUsers([]);
                    }}
                    className={`p-3 border rounded-lg text-center transition-colors ${
                      conversationType === 'direct'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <MessageCircle className="w-5 h-5 mx-auto mb-2" />
                    <span className="text-sm font-medium">Direct Message</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConversationType('group');
                      setSelectedUsers([]);
                    }}
                    className={`p-3 border rounded-lg text-center transition-colors ${
                      conversationType === 'group'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Users className="w-5 h-5 mx-auto mb-2" />
                    <span className="text-sm font-medium">Group Chat</span>
                  </button>
                </div>
              </div>

              {/* Group Name Input (only for groups) */}
              {conversationType === 'group' && (
                <div>
                  <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-2">
                    Group Name
                  </label>
                  <input
                    type="text"
                    id="groupName"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Enter group name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              )}

              {/* User Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {conversationType === 'direct' ? 'Select User' : 'Select Participants'}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search users..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Selected Users Display */}
              {selectedUsers.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    {conversationType === 'direct' ? 'Selected:' : 'Selected Participants:'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map(user => (
                      <div
                        key={user.id}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        <span>{user.name}</span>
                        <button
                          type="button"
                          onClick={() => toggleUserSelection(user)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* User List */}
              <div>
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                  {filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No users found
                    </div>
                  ) : (
                    filteredUsers.map(user => {
                      const isSelected = selectedUsers.find(u => u.id === user.id);
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => toggleUserSelection(user)}
                          className={`w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                            isSelected ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-600">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {user.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {user.email}
                              </p>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-6 border-t border-gray-200 flex-shrink-0">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedUsers.length === 0 || loading || (conversationType === 'group' && !groupName.trim())}
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create {conversationType === 'direct' ? 'DM' : 'Group'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateConversationModal;