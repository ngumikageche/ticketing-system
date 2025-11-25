import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MessageCircle, Users, Ticket, Plus, Trash2 } from 'lucide-react';
import { getConversations, getConversation, deleteConversation, getConversationMessages } from '../api/conversations.js';
import { getCurrentUser } from '../api/users.js';
import { useWebSocket } from '../contexts/WebSocketContext.jsx';
import CreateConversationModal from './CreateConversationModal.jsx';

const ConversationList = ({ onSelectConversation, selectedConversationId, initialConversationId }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [conversationDetails, setConversationDetails] = useState({});
  const [deletingConversationId, setDeletingConversationId] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const { socket } = useWebSocket();

  const fetchConversationDetails = async (conversationId) => {
    try {
      const details = await getConversation(conversationId);
      setConversationDetails(prev => ({
        ...prev,
        [conversationId]: details
      }));
    } catch (err) {
      console.error('Failed to fetch conversation details:', err);
    }
  };

  const calculateUnreadCounts = async () => {
    const counts = {};
    for (const conversation of conversations) {
      try {
        let messages = [];
        if (conversation.type === 'ticket') {
          // For tickets, comments don't have read status tracking yet
          counts[conversation.id] = 0;
          continue;
        } else {
          messages = await getConversationMessages(conversation.id);
        }
        const unreadCount = messages.filter(msg => !msg.is_read && msg.sender_id !== currentUser?.id).length;
        counts[conversation.id] = unreadCount;
      } catch (err) {
        console.error(`Failed to fetch messages for conversation ${conversation.id}:`, err);
        counts[conversation.id] = 0;
      }
    }
    setUnreadCounts(counts);
  };

  const handleDeleteConversation = async (conversationId) => {
    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingConversationId(conversationId);
      await deleteConversation(conversationId);
      
      // Remove from local state
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      // If the deleted conversation was selected, clear selection
      if (selectedConversationId === conversationId) {
        onSelectConversation(null);
      }
      toast.success('Conversation deleted successfully!');
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      toast.error('Failed to delete conversation. Please try again.');
    } finally {
      setDeletingConversationId(null);
    }
  };

  const handleSelectConversation = (conversation) => {
    onSelectConversation(conversation);
    // Unread counts will be updated via WebSocket when conversation is marked as read
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [conversationsData, userData] = await Promise.all([
          getConversations(),
          getCurrentUser()
        ]);
        setConversations(conversationsData);
        setCurrentUser(userData);

        // Fetch details for direct messages
        const directMessages = conversationsData.filter(conv => conv.type === 'direct');
        await Promise.all(directMessages.map(conv => fetchConversationDetails(conv.id)));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }

      // Auto-select conversation if specified in URL
      if (initialConversationId) {
        const conversationToSelect = conversationsData.find(conv => conv.id === initialConversationId);
        if (conversationToSelect) {
          handleSelectConversation(conversationToSelect);
        }
      }
    };
    fetchData();
  }, []);

  // Calculate unread counts when conversations or current user changes
  useEffect(() => {
    if (conversations.length > 0 && currentUser) {
      calculateUnreadCounts();
    }
  }, [conversations, currentUser]);

  // Listen for real-time conversation updates
  useEffect(() => {
    if (!socket) return;

    const handleConversationUpdate = (payload) => {
      const { data } = payload;
      setConversations(prev => {
        const exists = prev.find(conv => conv.id === data.id);
        if (exists) {
          // Update existing conversation
          return prev.map(conv => conv.id === data.id ? data : conv);
        } else {
          // Add new conversation and fetch details if it's a direct message
          if (data.type === 'direct') {
            fetchConversationDetails(data.id);
          }
          return [data, ...prev];
        }
      });
      // Recalculate unread counts when conversation is updated (e.g., marked as read)
      if (conversations.length > 0 && currentUser) {
        calculateUnreadCounts();
      }
    };

    const handleMessageUpdate = (payload) => {
      const { data } = payload;
      // Recalculate unread counts when new messages arrive
      if (conversations.length > 0 && currentUser) {
        calculateUnreadCounts();
      }
    };

    socket.on('conversation.update', handleConversationUpdate);
    socket.on('message.update', handleMessageUpdate);

    return () => {
      socket.off('conversation.update', handleConversationUpdate);
      socket.off('message.update', handleMessageUpdate);
    };
  }, [socket, conversations, currentUser]);

  const getConversationIcon = (type) => {
    switch (type) {
      case 'direct':
        return <MessageCircle className="w-5 h-5" />;
      case 'group':
        return <Users className="w-5 h-5" />;
      case 'ticket':
        return <Ticket className="w-5 h-5" />;
      default:
        return <MessageCircle className="w-5 h-5" />;
    }
  };

  const getConversationDisplayName = (conversation) => {
    if (conversation.type === 'ticket') {
      return `Ticket: ${conversation.title || conversation.ticket_id}`;
    }
    if (conversation.type === 'direct') {
      const details = conversationDetails[conversation.id];
      if (details && details.participants && currentUser) {
        const otherParticipant = details.participants.find(p => p.id !== currentUser.id);
        if (otherParticipant) {
          return otherParticipant.name || otherParticipant.username || otherParticipant.email || 'Unknown User';
        }
      }
      // If we don't have conversation details yet, try to get from conversation object itself
      if (conversation.participants && currentUser) {
        const otherParticipant = conversation.participants.find(p => p.id !== currentUser.id);
        if (otherParticipant) {
          return otherParticipant.name || otherParticipant.username || otherParticipant.email || 'Unknown User';
        }
      }
      return 'Direct Message';
    }
    return conversation.title || 'Untitled Conversation';
  };

  const groupedConversations = conversations.reduce((acc, conv) => {
    if (!acc[conv.type]) acc[conv.type] = [];
    acc[conv.type].push(conv);
    return acc;
  }, {});

  if (loading) return <div className="p-4">Loading conversations...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="w-full md:w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Messages</h2>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        {/* Direct Messages */}
        {groupedConversations.direct && groupedConversations.direct.length > 0 && (
          <div className="p-2">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Direct Messages
            </h3>
            {groupedConversations.direct.map(conversation => (
              <div key={conversation.id} className="relative group">
                <button
                  onClick={() => handleSelectConversation(conversation)}
                  className={`w-full text-left p-3 rounded-lg mb-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    selectedConversationId === conversation.id ? 'bg-blue-50 dark:bg-gray-700 border-l-4 border-blue-500 dark:border-blue-400' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-gray-600 dark:text-gray-400">
                      {getConversationIcon(conversation.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {getConversationDisplayName(conversation)}
                        </p>
                        {unreadCounts[conversation.id] > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                            {unreadCounts[conversation.id] > 99 ? '99+' : unreadCounts[conversation.id]}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        Last message preview...
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conversation.id);
                  }}
                  disabled={deletingConversationId === conversation.id}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-opacity disabled:opacity-50"
                  title="Delete conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Group Chats */}
        {groupedConversations.group && groupedConversations.group.length > 0 && (
          <div className="p-2">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Groups
            </h3>
            {groupedConversations.group.map(conversation => (
              <div key={conversation.id} className="relative group">
                <button
                  onClick={() => onSelectConversation(conversation)}
                  className={`w-full text-left p-3 rounded-lg mb-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    selectedConversationId === conversation.id ? 'bg-blue-50 dark:bg-gray-700 border-l-4 border-blue-500 dark:border-blue-400' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-gray-600 dark:text-gray-400">
                      {getConversationIcon(conversation.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {getConversationDisplayName(conversation)}
                        </p>
                        {unreadCounts[conversation.id] > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                            {unreadCounts[conversation.id] > 99 ? '99+' : unreadCounts[conversation.id]}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        Last message preview...
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conversation.id);
                  }}
                  disabled={deletingConversationId === conversation.id}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-opacity disabled:opacity-50"
                  title="Delete conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Ticket Chats */}
        {groupedConversations.ticket && groupedConversations.ticket.length > 0 && (
          <div className="p-2">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Ticket Chats
            </h3>
            {groupedConversations.ticket.map(conversation => (
              <div key={conversation.id} className="relative group">
                <button
                  onClick={() => handleSelectConversation(conversation)}
                  className={`w-full text-left p-3 rounded-lg mb-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    selectedConversationId === conversation.id ? 'bg-blue-50 dark:bg-gray-700 border-l-4 border-blue-500 dark:border-blue-400' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-gray-600 dark:text-gray-400">
                      {getConversationIcon(conversation.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {getConversationDisplayName(conversation)}
                        </p>
                        {unreadCounts[conversation.id] > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                            {unreadCounts[conversation.id] > 99 ? '99+' : unreadCounts[conversation.id]}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        Last message preview...
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conversation.id);
                  }}
                  disabled={deletingConversationId === conversation.id}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-opacity disabled:opacity-50"
                  title="Delete conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {conversations.length === 0 && (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-900 dark:text-white">No conversations yet</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Start a conversation to get help</p>
          </div>
        )}
      </div>

      {/* Create Conversation Modal */}
      <CreateConversationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onConversationCreated={(newConversation) => {
          setConversations(prev => [newConversation, ...prev]);
          handleSelectConversation(newConversation);
        }}
        onExistingConversationFound={(existingConversation) => {
          handleSelectConversation(existingConversation);
        }}
      />
    </div>
  );
};

export default ConversationList;