import { useState, useEffect } from 'react';
import { Search, Bell, User, LogOut, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../api/auth.js';
import { markNotificationAsRead } from '../api/notifications.js';
import { useWebSocket } from '../contexts/WebSocketContext';

export default function Topbar({ title = 'Dashboard' }) {
  const navigate = useNavigate();
  const { notifications, isConnected } = useWebSocket();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      // Note: In a full implementation, the backend would emit an update via WebSocket
      // For now, we'll just remove it from local state
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

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
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
          )}
          {!isConnected && (
            <span className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-full" title="Disconnected"></span>
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
            <h3 className="font-semibold">Notifications</h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-gray-500">No notifications</p>
            ) : (
              notifications.map(notification => (
                <div key={notification.id} className={`p-4 border-b ${!notification.is_read ? 'bg-blue-50' : ''}`}>
                  <p className="text-sm">{notification.message}</p>
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
