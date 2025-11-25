import React, { useEffect, useRef, useState } from 'react';
import { Bell, User, LogOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useSettings } from '../contexts/SettingsContext.jsx';

// Clean Topbar component: uses AuthContext and WebSocket context (notifications)
export default function Topbar({ title = 'Dashboard', onMenuClick }) {
  const navigate = useNavigate();
  const { notifications: wsNotifications = [] } = useWebSocket() || {};
  const { currentUser, loading: authLoading, logout: authLogout, sessionExpiring, refresh } = useAuth() || {};
  const { settings } = useSettings();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  const notifications = Array.isArray(wsNotifications) ? wsNotifications : [];
  const unreadCount = settings.notifications_enabled ? notifications.filter(n => !n.is_read).length : 0;
  const totalCount = settings.notifications_enabled ? notifications.length : 0;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle browser notifications
  useEffect(() => {
    if (settings.browser_notifications && notifications.length > 0) {
      const latestNotification = notifications
        .filter(n => !n.is_read)
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];

      if (latestNotification && 'Notification' in window) {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('Support Ticket System', {
              body: latestNotification.message,
              icon: '/favicon.ico'
            });
          }
        });
      }
    }
  }, [notifications, settings.browser_notifications]);

  const toggleNotifications = () => setShowNotifications(prev => !prev);
  const handleNotificationClick = (notification) => {
    setShowNotifications(false);
    if (notification?.related_type === 'ticket') {
      navigate(`/tickets?ticket=${notification.related_id}`);
    } else {
      navigate('/notifications');
    }
  };

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
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 flex items-center justify-between relative transition-colors duration-200">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200">{title}</h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {settings.notifications_enabled && (
          <div className="relative" ref={notificationRef}>
            <button onClick={toggleNotifications} className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-gray-900 dark:bg-gray-800 rounded-lg shadow-lg border border-gray-700 dark:border-gray-600 z-50">
                <div className="p-4 border-b border-gray-700 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white dark:text-gray-100">Notifications</h3>
                    <button onClick={() => navigate('/notifications')} className="text-xs text-blue-400 dark:text-blue-400 hover:text-blue-300 dark:hover:text-blue-300">View all</button>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">{unreadCount} unread of {totalCount} total</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 dark:text-gray-400 text-sm">No notifications</div>
                  ) : (
                    notifications
                      .slice()
                      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
                      .slice(0, 5)
                      .map((notification) => (
                        <div key={notification.id} onClick={() => handleNotificationClick(notification)} className={`p-3 border-b border-gray-700 dark:border-gray-600 hover:bg-gray-800 dark:hover:bg-gray-700 cursor-pointer ${!notification.is_read ? 'bg-gray-800 dark:bg-gray-700' : ''} transition-colors`}>
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white dark:text-gray-100 truncate">{notification.message}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">{notification.created_at ? new Date(notification.created_at).toLocaleString() : ''}</p>
                            </div>
                            {!notification.is_read && (<div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0 mt-1"></div>)}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {currentUser && (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors">
            <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{currentUser.name || currentUser.email || 'User'}</span>
          </div>
        )}

        {sessionExpiring && (
          <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/20 px-2 py-1 rounded mr-2">
            Session expiring soon <button className="ml-2 text-blue-700 dark:text-blue-300 underline hover:text-blue-800 dark:hover:text-blue-200" onClick={handleRefreshNow}>Refresh</button>
          </div>
        )}

        <button onClick={doLogout} className="flex items-center gap-2 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors" title="Logout">
          <LogOut className="w-5 h-5"/>
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
/* Duplicate/old Topbar block removed */
// End of Topbar component
