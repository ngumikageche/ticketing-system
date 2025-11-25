import { Home, Ticket, MessageCircle, BookOpen, BarChart3, Users, Settings as SettingsIcon, ChevronLeft, ChevronRight, X, FlaskConical, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext.jsx';

const menu = [
  { label: 'Dashboard', icon: Home, path: '/' },
  { label: 'Tickets', icon: Ticket, path: '/tickets' },
  { label: 'Chat', icon: MessageCircle, path: '/chat' },
  { label: 'Notifications', icon: Bell, path: '/notifications' },
  { label: 'Knowledge Base', icon: BookOpen, path: '/knowledge-base' },
  { label: 'Reports', icon: BarChart3, path: '/reports' },
  { label: 'Users', icon: Users, path: '/users' },
  { label: 'Testing', icon: FlaskConical, path: '/testing' },
  { label: 'Settings', icon: SettingsIcon, path: '/settings' },
];

export default function Sidebar({ active = 'Dashboard', isOpen, onClose, collapsed = false }) {
  const { settings, updateSetting } = useSettings();
  const [localCollapsed, setLocalCollapsed] = useState(collapsed);

  // Update local collapsed state when prop changes
  useEffect(() => {
    setLocalCollapsed(collapsed);
  }, [collapsed]);

  // Also update when global setting changes
  useEffect(() => {
    setLocalCollapsed(settings.sidebar_collapsed);
  }, [settings.sidebar_collapsed]);

  // Auto-collapse on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setLocalCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggleCollapse = () => {
    const newCollapsed = !localCollapsed;
    setLocalCollapsed(newCollapsed);
    updateSetting('sidebar_collapsed', newCollapsed);
  };

  const sidebarClasses = `
    bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    lg:translate-x-0
    ${localCollapsed ? 'lg:w-16' : 'lg:w-64'}
    w-64
    fixed lg:relative
    inset-y-0 left-0
    z-50
  `;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={sidebarClasses}>
        <div className="p-6 flex items-center justify-between">
          <Link to="/" className={`flex items-center gap-2 ${localCollapsed && !isOpen ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 bg-primary rounded-md flex-shrink-0"></div>
            {(!localCollapsed || isOpen) && <h1 className="text-2xl font-bold text-primary">SupportDesk</h1>}
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleCollapse}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hidden lg:block"
              title={localCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {localCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors lg:hidden"
              title="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className={`flex-1 ${localCollapsed && !isOpen ? 'px-2' : 'px-4'}`}>
          {menu.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.label;
            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={onClose}
                className={`flex items-center ${localCollapsed && !isOpen ? 'justify-center px-3' : 'gap-3 px-4'} py-3 rounded-lg mb-1 transition-colors ${isActive ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                title={localCollapsed && !isOpen ? item.label : ''}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {(!localCollapsed || isOpen) && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
