import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Smile, MessageCircle, Users, Ticket, ArrowLeft } from 'lucide-react';
import { getConversationMessages, sendConversationMessage, getTicketMessages, sendTicketMessage, getConversation, markConversationAsRead } from '../api/conversations.js';
import { getCurrentUser, getUser } from '../api/users.js';
import { useWebSocket } from '../contexts/WebSocketContext.jsx';

const ChatInterface = ({ conversation, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [conversationDetails, setConversationDetails] = useState(null);
  const [userMap, setUserMap] = useState(new Map());
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const hasMountedRef = useRef(false);
  const sortMessages = (list) => (Array.isArray(list) ? list.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) : []);
  const markedConversationsRef = useRef(new Set());
  const { socket, getRealtimeData } = useWebSocket();

  useEffect(() => {
    const fetchData = async () => {
      // Reset the mount flag on conversation change so we treat the first
      // load of a conversation as an initial render (auto scroll) even if
      // another conversation was previously open.
      hasMountedRef.current = false;
      if (!conversation) return;

      try {
        setLoading(true);
        const fetchPromises = [
          conversation.type === 'ticket'
            ? getTicketMessages(conversation.ticket_id)
            : getConversationMessages(conversation.id),
          getCurrentUser()
        ];

        // Fetch conversation details for non-ticket conversations to get participants
        if (conversation.type !== 'ticket') {
          fetchPromises.push(getConversation(conversation.id));
        }

        const results = await Promise.all(fetchPromises);
        const messagesData = results[0];
        const userData = results[1];
        const conversationData = results[2];

  setMessages(sortMessages(messagesData));
        setCurrentUser(userData);
        if (conversationData) {
          setConversationDetails(conversationData);
        }

        // Mark conversation as read when opened (only for non-ticket conversations)
        if (conversation.type !== 'ticket' && !markedConversationsRef.current.has(conversation.id)) {
          try {
            await markConversationAsRead(conversation.id);
            markedConversationsRef.current.add(conversation.id);
          } catch (err) {
            console.error('Failed to mark conversation as read:', err);
            // Don't show error to user as this is not critical functionality
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [conversation]);

  // Fetch sender names for messages
  useEffect(() => {
    const fetchSenderNames = async () => {
      if (!messages.length || !currentUser) return;

      const senderIds = [...new Set(messages.map(msg => msg.sender_id || msg.author_id).filter(id => id && id !== currentUser.id))];
      const newUserMap = new Map(userMap);

      for (const id of senderIds) {
        if (!newUserMap.has(id)) {
          try {
            const user = await getUser(id);
            newUserMap.set(id, user.name || user.username || 'Unknown');
          } catch (err) {
            console.error(`Failed to fetch user ${id}:`, err);
            newUserMap.set(id, 'Unknown');
          }
        }
      }

      setUserMap(newUserMap);
    };

    fetchSenderNames();
  }, [messages, currentUser]);

  useEffect(() => {
    const behavior = hasMountedRef.current ? 'smooth' : 'auto';
    scrollToBottom(behavior);
    if (!hasMountedRef.current) hasMountedRef.current = true;
  }, [messages, conversation]);

  // Listen for real-time message updates
  useEffect(() => {
    if (!socket || !conversation) return;

    const handleNewMessage = (payload) => {
      const { data } = payload;
      console.log('[CHAT] Received real-time message update:', data);
      // Check if the message belongs to the current conversation
      const belongsToConversation = 
        (conversation.type === 'ticket' && data.ticket_id === conversation.ticket_id) ||
        (conversation.type !== 'ticket' && data.conversation_id === conversation.id);

      console.log('[CHAT] Message belongs to current conversation:', belongsToConversation, 'conversation:', conversation.id || conversation.ticket_id);

      if (belongsToConversation) {
        setMessages(prev => {
          // Check if this message already exists (avoid duplicates)
          const exists = prev.find(msg => msg.id === data.id);
          if (exists) {
            console.log('[CHAT] Message already exists, skipping duplicate');
            return prev;
          }

          // Check if there's an optimistic message to replace
          const optimisticIndex = prev.findIndex(msg => 
            msg.isOptimistic && msg.content === data.content && 
            (msg.sender_id === data.sender_id || msg.author_id === data.author_id)
          );
          
          if (optimisticIndex !== -1) {
            // Replace optimistic message with real one
            console.log('[CHAT] Replacing optimistic message with real message:', data.id);
            const newMessages = [...prev];
            newMessages[optimisticIndex] = data;
            // After replacing the optimistic entry, make sure we show the latest
            setTimeout(() => scrollToBottom('smooth'), 0);
            return newMessages;
          }

          console.log('[CHAT] Adding new message to UI:', data.id, data.content?.slice(0, 50));
          const newList = [...prev, data];
          setTimeout(() => scrollToBottom('smooth'), 0);
          return newList;
        });

        // Fetch sender name if not already known
        const senderId = data.sender_id || data.author_id;
        if (senderId && senderId !== currentUser?.id && !userMap.has(senderId)) {
          getUser(senderId).then(user => {
            setUserMap(prev => new Map(prev).set(senderId, user.name || user.username || 'Unknown'));
          }).catch(err => {
            console.error(`Failed to fetch user ${senderId}:`, err);
            setUserMap(prev => new Map(prev).set(senderId, 'Unknown'));
          });
        }
      }
    };

    // Listen for both message and comment updates
    socket.on('message.update', handleNewMessage);
    socket.on('comment.update', handleNewMessage);

    return () => {
      socket.off('message.update', handleNewMessage);
      socket.off('comment.update', handleNewMessage);
    };
  }, [socket, conversation]);

  const scrollToBottom = (behavior = 'smooth') => {
    const el = messagesEndRef.current;
    if (el) {
      try {
        el.scrollIntoView({ behavior, block: 'end' });
        return;
      } catch (err) {
        // fall through to container fallback
      }
    }
    const container = messagesContainerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    console.log('[CHAT] Sending message:', newMessage.trim());

    try {
      setSending(true);
      const messageData = conversation.type === 'ticket'
        ? {
            content: newMessage.trim(),
            ticket_id: typeof conversation.ticket_id === 'object' ? conversation.ticket_id.id : conversation.ticket_id,
            author_id: currentUser.id
          }
        : {
            content: newMessage.trim(),
            sender_id: currentUser.id,
            message_type: 'text'
          };

      console.log('[CHAT] Message data:', messageData);

      const sentMessage = conversation.type === 'ticket'
        ? await sendTicketMessage(messageData.ticket_id, messageData)
        : await sendConversationMessage(conversation.id, messageData);

      console.log('[CHAT] Message sent successfully:', sentMessage.id);

      // Optimistically add the message to UI immediately for better UX
      const optimisticMessage = {
        ...sentMessage,
        id: `temp-${Date.now()}`, // Temporary ID to avoid conflicts
        isOptimistic: true // Mark as optimistic
      };
      setMessages(prev => [...prev, optimisticMessage]);
      // Ensure the UI scrolls to the latest message as soon as we add one
      scrollToBottom('smooth');
      
      setNewMessage('');
    } catch (err) {
      console.error('[CHAT] Error sending message:', err);
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const groupMessagesByDate = (messages) => {
    const groups = {};
    messages.forEach(message => {
      const date = formatDate(message.created_at);
      if (!groups[date]) groups[date] = [];
      groups[date].push(message);
    });
    return groups;
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
          <p>Choose a conversation from the list to start messaging</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex-1 p-4">Loading messages...</div>;
  if (error) return <div className="flex-1 p-4 text-red-500">Error: {error}</div>;

  const messageGroups = groupMessagesByDate(messages);

  // Get recipient name for direct messages
  const getRecipientName = () => {
    if (conversation.type !== 'direct') return null;

    // First try to get from conversation participants
    if (conversationDetails?.participants) {
      const otherParticipant = conversationDetails.participants.find(p => p.id !== currentUser?.id);
      if (otherParticipant) {
        return otherParticipant.name || otherParticipant.username || otherParticipant.email || 'Unknown User';
      }
    }

    // Fallback to finding from messages and userMap
    const otherUserMessage = messages.find(msg => msg.sender_id !== currentUser?.id);
    if (otherUserMessage) {
      const senderId = otherUserMessage.sender_id || otherUserMessage.author_id;
      if (senderId) {
        const userName = userMap.get(senderId);
        if (userName && userName !== 'Unknown') {
          return userName;
        }
      }
    }

    // Last resort - try to get from any message sender
    for (const message of messages) {
      const senderId = message.sender_id || message.author_id;
      if (senderId && senderId !== currentUser?.id) {
        const userName = userMap.get(senderId);
        if (userName && userName !== 'Unknown') {
          return userName;
        }
      }
    }

    // If we still don't have a name, return a generic label
    return 'Direct Message';
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-white overflow-hidden">
      {/* Chat Header - Always visible */}
      <div className="flex-shrink-0 p-2 sm:p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            {conversation.type === 'direct' && <MessageCircle className="w-5 h-5 text-gray-600" />}
            {conversation.type === 'group' && <Users className="w-5 h-5 text-gray-600" />}
            {conversation.type === 'ticket' && <Ticket className="w-5 h-5 text-gray-600" />}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">
              {conversation.type === 'ticket'
                ? `Ticket: ${conversation.title || conversation.ticket_id}`
                : conversation.type === 'direct'
                ? getRecipientName()
                : conversation.title || 'Untitled Conversation'
              }
            </h3>
            <p className="text-sm text-gray-500">
              {conversation.type === 'group' && `${conversationDetails?.participants?.length || conversation.participants?.length || 0} members`}
              {conversation.type === 'ticket' && 'Support conversation'}
              {conversation.type === 'direct' && 'Direct message'}
            </p>
          </div>
        </div>
      </div>

  {/* Messages Area - Only this scrolls */}
  <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-4">
        {Object.entries(messageGroups).map(([date, dateMessages]) => (
          <div key={date}>
            <div className="text-center mb-4">
              <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                {date}
              </span>
            </div>
            {dateMessages.map((message, index) => {
              const senderId = message.sender_id || message.author_id;
              const isCurrentUser = senderId === currentUser?.id;
              const showAvatar = !isCurrentUser && (
                index === 0 ||
                (dateMessages[index - 1].sender_id || dateMessages[index - 1].author_id) !== senderId
              );

              const senderName = isCurrentUser 
                ? 'You' 
                : (userMap.get(senderId) || 'Unknown');

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 mb-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isCurrentUser && (
                    <div className="w-8 h-8 flex-shrink-0">
                      {showAvatar && (
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">
                          {senderName.charAt(0).toUpperCase()}
                        </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`max-w-full sm:max-w-xs lg:max-w-md ${isCurrentUser ? 'order-1' : 'order-2'}`}>
                    <div className={`text-xs text-gray-500 mb-1 px-3 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                      {senderName}
                    </div>

                    <div
                      className={`px-3 py-2 rounded-lg ${
                        isCurrentUser
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>

                    <div className={`text-xs text-gray-500 mt-1 px-3 flex items-center justify-between ${
                      isCurrentUser ? 'text-right' : 'text-left'
                    }`}>
                      <span>{formatTime(message.created_at)}</span>
                      {isCurrentUser && message.is_read !== undefined && (
                        <span className="ml-2 flex items-center">
                          {message.is_read ? (
                            <span className="text-blue-500">✓✓</span>
                          ) : (
                            <span className="text-gray-400">✓</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {isCurrentUser && (
                    <div className="w-8 h-8 flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-white">
                          {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input - Always visible */}
      <div className="flex-shrink-0 p-2 sm:p-4 border-t border-gray-200 bg-white sticky bottom-0 z-10">
        <form onSubmit={handleSendMessage} className="flex gap-1 sm:gap-2">
          <button
            type="button"
            className="p-1 sm:p-2 text-gray-400 hover:text-gray-600"
            disabled
          >
            <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={sending}
            />
          </div>

          <button
            type="button"
            className="p-1 sm:p-2 text-gray-400 hover:text-gray-600"
            disabled
          >
            <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-2 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-2"
          >
            <Send className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{sending ? 'Sending...' : 'Send'}</span>
            <span className="sm:hidden">{sending ? '...' : 'Send'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;