import { useState, useEffect } from 'react';
import { MessageCircle, Users, Ticket, Plus, Trash2 } from 'lucide-react';
import { getConversations, getConversation, deleteConversation } from '../api/conversations.js';
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
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      alert('Failed to delete conversation. Please try again.');
    } finally {
      setDeletingConversationId(null);
    }
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
          onSelectConversation(conversationToSelect);
        }
      }
    };
    fetchData();
  }, []);

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
    };

    socket.on('conversation.updated', handleConversationUpdate);

    return () => {
      socket.off('conversation.updated', handleConversationUpdate);
    };
  }, [socket]);

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
          return otherParticipant.name || otherParticipant.email || 'Unknown User';
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
    <div className="w-full md:w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Messages</h2>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Direct Messages */}
        {groupedConversations.direct && groupedConversations.direct.length > 0 && (
          <div className="p-2">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Direct Messages
            </h3>
            {groupedConversations.direct.map(conversation => (
              <div key={conversation.id} className="relative group">
                <button
                  onClick={() => onSelectConversation(conversation)}
                  className={`w-full text-left p-3 rounded-lg mb-1 hover:bg-gray-50 ${
                    selectedConversationId === conversation.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-gray-600">
                      {getConversationIcon(conversation.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {getConversationDisplayName(conversation)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
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
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-opacity disabled:opacity-50"
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
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Groups
            </h3>
            {groupedConversations.group.map(conversation => (
              <div key={conversation.id} className="relative group">
                <button
                  onClick={() => onSelectConversation(conversation)}
                  className={`w-full text-left p-3 rounded-lg mb-1 hover:bg-gray-50 ${
                    selectedConversationId === conversation.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-gray-600">
                      {getConversationIcon(conversation.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {getConversationDisplayName(conversation)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
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
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-opacity disabled:opacity-50"
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
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Ticket Chats
            </h3>
            {groupedConversations.ticket.map(conversation => (
              <div key={conversation.id} className="relative group">
                <button
                  onClick={() => onSelectConversation(conversation)}
                  className={`w-full text-left p-3 rounded-lg mb-1 hover:bg-gray-50 ${
                    selectedConversationId === conversation.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-gray-600">
                      {getConversationIcon(conversation.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {getConversationDisplayName(conversation)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
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
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-opacity disabled:opacity-50"
                  title="Delete conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {conversations.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No conversations yet</p>
            <p className="text-sm">Start a conversation to get help</p>
          </div>
        )}
      </div>

      {/* Create Conversation Modal */}
      <CreateConversationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onConversationCreated={(newConversation) => {
          setConversations(prev => [newConversation, ...prev]);
          onSelectConversation(newConversation);
        }}
        onExistingConversationFound={(existingConversation) => {
          onSelectConversation(existingConversation);
        }}
      />
    </div>
  );
};

export default ConversationList;