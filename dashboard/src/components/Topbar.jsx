import { useState } from 'react';
import { Search, Bell, User, LogOut, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../api/auth.js';
import { useWebSocket } from '../contexts/WebSocketContext';

export default function Topbar({ title = 'Dashboard' }) {
  const navigate = useNavigate();
  const { notifications, markNotificationAsRead } = useWebSocket();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMarkAsRead = async (id) => {
    console.log('Marking notification as read:', id);
    await markNotificationAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    console.log('Marking all notifications as read');
    const unreadNotifications = notifications.filter(n => !n.is_read);
    for (const notification of unreadNotifications) {
      await markNotificationAsRead(notification.id);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const totalCount = notifications.length;

  // Sort notifications: unread first, then by creation date (newest first)
  const sortedNotifications = [...notifications].sort((a, b) => {
    // Unread notifications first
    if (!a.is_read && b.is_read) return -1;
    if (a.is_read && !b.is_read) return 1;
    
    // Then sort by creation date (newest first)
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between relative">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-600 hover:text-gray-900">
          <Search className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="relative p-2 text-gray-600 hover:text-gray-900"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 p-2 text-gray-600 hover:text-gray-900"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {showDropdown && (
        <div className="absolute top-full right-6 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>
            <p className="text-sm text-gray-600">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'} • {notifications.length} total
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {sortedNotifications.length === 0 ? (
              <p className="p-4 text-gray-500">No notifications</p>
            ) : (
              sortedNotifications.map(notification => (
                <div key={notification.id} className="p-4 border-b">
                  <p className="text-sm">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                  {!notification.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="mt-2 text-xs text-blue-600 hover:underline"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t">
            <button
              onClick={() => setShowDropdown(false)}
              className="w-full text-center text-sm text-gray-600 hover:text-gray-900"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
