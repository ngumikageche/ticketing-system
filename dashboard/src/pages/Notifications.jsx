import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getNotifications, markNotificationAsRead, deleteNotification } from '../api/notifications.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getTickets } from '../api/tickets.js';
import { getConversations } from '../api/conversations.js';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && currentUser) {
      loadNotifications();
    }
  }, [authLoading, currentUser]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [notificationsData, ticketsData, conversationsData] = await Promise.all([
        getNotifications(),
        getTickets(),
        getConversations()
      ]);
      setNotifications(notificationsData);
      setTickets(ticketsData);
      setConversations(conversationsData);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => prev.map(n =>
        n.id === id ? { ...n, is_read: true } : n
      ));
    } catch (error) {
      toast.error('Failed to mark notification as read: ' + error.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      for (const notification of unreadNotifications) {
        await markNotificationAsRead(notification.id);
      }
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read!');
    } catch (error) {
      toast.error('Failed to mark all notifications as read: ' + error.message);
    }
  };

  const handleDeleteAllRead = async () => {
    const readNotifications = notifications.filter(n => n.is_read);
    if (readNotifications.length === 0) {
      toast('No read notifications to delete.');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete all ${readNotifications.length} read notifications?`)) return;
    
    try {
      for (const notification of readNotifications) {
        await deleteNotification(notification.id);
      }
      setNotifications(prev => prev.filter(n => !n.is_read));
      setCurrentPage(1); // Reset to first page
      toast.success('All read notifications deleted!');
    } catch (error) {
      toast.error('Failed to delete read notifications: ' + error.message);
    }
  };

  const handleDeleteNotification = async (id) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;
    
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      // Reset to page 1 if we're on a page that becomes empty
      if (currentNotifications.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
      toast.success('Notification deleted!');
    } catch (error) {
      toast.error('Failed to delete notification: ' + error.message);
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.is_read;
    if (filter === 'read') return notification.is_read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getTicketInfo = (ticketId) => {
    const ticket = tickets.find(t => t.id === ticketId);
    return ticket ? { id: ticket.id, subject: ticket.subject, ticket_id: ticket.ticket_id } : null;
  };

  const getConversationInfo = (conversationId) => {
    const conversation = conversations.find(c => c.id === conversationId);
    return conversation ? { id: conversation.id, title: conversation.title } : null;
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'comment_on_ticket':
      case 'reply_to_comment':
      case 'comment_updated':
      case 'comment_deleted':
      case 'ticket_updated':
      case 'ticket_assigned':
      case 'attachment_added':
      case 'attachment_updated':
      case 'attachment_deleted':
        // Navigate to tickets page with specific ticket if available
        if (notification.related_id) {
          navigate(`/tickets?ticket=${notification.related_id}`);
        } else {
          navigate('/tickets');
        }
        break;

      case 'message_on_ticket':
      case 'message_deleted':
        // Navigate to chat page for ticket messages
        if (notification.data && notification.data.conversation_id) {
          navigate(`/chat?conversation=${notification.data.conversation_id}`);
        } else {
          navigate('/chat');
        }
        break;

      case 'message_on_conversation':
        // Navigate to chat page and select the specific conversation
        if (notification.data && notification.data.conversation_id) {
          navigate(`/chat?conversation=${notification.data.conversation_id}`);
        } else {
          // Fallback if conversation_id is not available
          navigate('/chat');
        }
        break;

      case 'new_ticket':
      case 'ticket_deleted':
        // Navigate to tickets page
        navigate('/tickets');
        break;

      case 'user_created':
      case 'user_deactivated':
        // Navigate to users page
        navigate('/users');
        break;

      case 'kb_article_created':
        // Navigate to knowledge base
        navigate('/knowledge-base');
        break;

      default:
        // For unknown types, stay on notifications page
        console.log('Unknown notification type:', notification.type);
        break;
    }
  };

  const getEnhancedMessage = (notification) => {
    let message = notification.message;
    
    // If this is a conversation message notification, try to enhance it with conversation name
    if (notification.type === 'message_on_conversation' && notification.related_type === 'message') {
      // Try to find conversation info from the message content or related data
      // The message might contain conversation info, or we might need to look it up differently
      // For now, let's check if we can find conversation info from the conversations list
      // This might need backend changes to include conversation_id in the notification
      const conversationMatch = message.match(/New message in "([^"]+)"/);
      if (conversationMatch) {
        const conversationTitle = conversationMatch[1];
        // If it says "conversation", try to find the actual conversation
        if (conversationTitle === 'conversation') {
          // This is a fallback - ideally the backend should provide conversation_id
          // For now, we'll keep the original message
          return message;
        }
      }
    }
    
    return message;
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentNotifications = filteredNotifications.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
        <div className="flex gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Mark All as Read
            </button>
          )}
          {notifications.some(n => n.is_read) && (
            <button
              onClick={handleDeleteAllRead}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 flex items-center gap-2"
              title="Delete all read notifications"
            >
              <Trash2 className="w-4 h-4" />
              Delete All Read
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{notifications.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Notifications</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{unreadCount}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Unread</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{notifications.filter(n => n.is_read).length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Read</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6 border border-gray-200 dark:border-gray-700">
        <div className="flex gap-4">
          <button
            onClick={() => {
              setFilter('all');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all' 
                ? 'bg-blue-600 text-white dark:bg-blue-500' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => {
              setFilter('unread');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'unread' 
                ? 'bg-blue-600 text-white dark:bg-blue-500' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => {
              setFilter('read');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'read' 
                ? 'bg-blue-600 text-white dark:bg-blue-500' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Read ({notifications.filter(n => n.is_read).length})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading notifications...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {filter === 'all' ? 'No notifications found' :
             filter === 'unread' ? 'No unread notifications' :
             'No read notifications'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {currentNotifications
              .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
              .map(notification => (
              <div key={notification.id} className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${!notification.is_read ? 'bg-blue-50 dark:bg-gray-700 border-l-4 border-blue-500 dark:border-blue-400' : ''}`} onClick={() => handleNotificationClick(notification)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {notification.type === 'message_on_conversation' 
                          ? `💬 ${notification.message.replace('"conversation"', 'a conversation')}`
                          : notification.message
                        }
                      </p>
                      {!notification.is_read && (
                        <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">Unread</span>
                      )}
                      {notification.type === 'message_on_conversation' && (
                        <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">Conversation</span>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(notification.created_at).toLocaleString()}
                    </div>
                  </div>
                  {!notification.is_read && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                      >
                        Mark as Read
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification.id);
                        }}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                        title="Delete notification"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  {notification.is_read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(notification.id);
                      }}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 ml-4"
                      title="Delete notification"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6 rounded-b-lg">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                <span className="font-medium">{Math.min(endIndex, filteredNotifications.length)}</span> of{' '}
                <span className="font-medium">{filteredNotifications.length}</span> notifications
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="sr-only">Previous</span>
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${
                      page === currentPage
                        ? 'z-10 bg-blue-600 border-blue-600 text-white dark:bg-blue-500 dark:border-blue-500'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="sr-only">Next</span>
                  ›
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}