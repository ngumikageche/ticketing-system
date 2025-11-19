import { useState } from 'react';
import { Search, Bell, User, LogOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../api/auth.js';
import { useWebSocket } from '../contexts/WebSocketContext';

export default function Topbar({ title = 'Dashboard', onMenuClick }) {
  const navigate = useNavigate();
  const { notifications } = useWebSocket();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const totalCount = notifications.length;

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
        <button className="hidden sm:block relative p-2 text-gray-600 hover:text-gray-900">
          <Search className="w-5 h-5" />
        </button>
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 text-gray-600 hover:text-gray-900 cursor-pointer"
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
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
