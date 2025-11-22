import React, { useEffect, useRef, useState } from 'react';
import { Bell, User, LogOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useAuth } from '../contexts/AuthContext.jsx';

// Clean Topbar component: uses AuthContext and WebSocket context (notifications)
export default function Topbar({ title = 'Dashboard', onMenuClick }) {
  const navigate = useNavigate();
  const { notifications: wsNotifications = [] } = useWebSocket() || {};
  const { currentUser, loading: authLoading, logout: authLogout, sessionExpiring, refresh } = useAuth() || {};
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleNotifications = () => setShowNotifications(prev => !prev);
  const handleNotificationClick = (notification) => {
    setShowNotifications(false);
    if (notification?.related_type === 'ticket') {
      navigate(`/tickets?ticket=${notification.related_id}`);
    } else {
      navigate('/notifications');
    }
  };

  const notifications = Array.isArray(wsNotifications) ? wsNotifications : [];
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const totalCount = notifications.length;

  const doLogout = async () => {
    if (typeof authLogout === 'function') {
      try { await authLogout(); } catch (e) { /* ignore */ }
    }
    navigate('/login');
  };

  const handleRefreshNow = async () => {
    if (typeof refresh === 'function') {
      try { await refresh(); } catch (e) { /* ignore */ }
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between relative">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800">{title}</h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="relative" ref={notificationRef}>
          <button onClick={toggleNotifications} className="relative p-2 text-gray-600 hover:text-gray-900 cursor-pointer">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  <button onClick={() => navigate('/notifications')} className="text-xs text-blue-600 hover:text-blue-800">View all</button>
                </div>
                <p className="text-xs text-gray-500 mt-1">{unreadCount} unread of {totalCount} total</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">No notifications</div>
                ) : (
                  notifications
                    .slice()
                    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
                    .slice(0, 5)
                    .map((notification) => (
                      <div key={notification.id} onClick={() => handleNotificationClick(notification)} className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notification.is_read ? 'bg-blue-50' : ''}`}>
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{notification.created_at ? new Date(notification.created_at).toLocaleString() : ''}</p>
                          </div>
                          {!notification.is_read && (<div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>)}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </div>

        {currentUser && (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
            <User className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">{currentUser.name || currentUser.email || 'User'}</span>
          </div>
        )}

        {sessionExpiring && (
          <div className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded mr-2">
            Session expiring soon <button className="ml-2 text-blue-700 underline" onClick={handleRefreshNow}>Refresh</button>
          </div>
        )}

        <button onClick={doLogout} className="flex items-center gap-2 p-2 text-gray-600 hover:text-gray-900" title="Logout">
          <LogOut className="w-5 h-5"/>
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
/* Duplicate/old Topbar block removed */
// End of Topbar component
