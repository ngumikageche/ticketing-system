import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { setNavigate } from '../navigation.js';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useSettings } from '../contexts/SettingsContext.jsx';

const pageTitles = {
  '/': 'Dashboard',
  '/tickets': 'Tickets',
  '/chat': 'Chat',
  '/notifications': 'Notifications',
  '/knowledge-base': 'Knowledge Base',
  '/reports': 'Reports',
  '/users': 'Users',
  '/testing': 'Testing',
  '/settings': 'Settings',
};

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { currentUser, loading } = useAuth();
  const { settings } = useSettings();

  const currentPath = location.pathname;
  const title = pageTitles[currentPath] || 'Dashboard';

  useEffect(() => {
    // expose the router navigate function to other modules for SPA navigation
    setNavigate(navigate);

    if (!loading && !currentUser) {
      navigate('/login');
    }
  }, [navigate, loading, currentUser]);

  // Determine the effective theme
  const getEffectiveTheme = () => {
    if (settings.theme === 'auto') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return settings.theme;
  };

  const effectiveTheme = getEffectiveTheme();

  // Apply theme to document immediately when settings change
  useEffect(() => {
    const root = document.documentElement;
    const effectiveTheme = getEffectiveTheme();

    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (settings.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        const root = document.documentElement;
        if (mediaQuery.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      };

      // Apply initial state
      handleChange();

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings.theme]);

  // Map path to sidebar active label
  const pathToLabel = {
    '/': 'Dashboard',
    '/tickets': 'Tickets',
    '/chat': 'Chat',
    '/notifications': 'Notifications',
    '/knowledge-base': 'Knowledge Base',
    '/reports': 'Reports',
    '/users': 'Users',
    '/testing': 'Testing',
    '/settings': 'Settings',
  };

  return (
    <div className={`flex h-screen ${settings.compact_mode ? 'text-sm' : ''} bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200`}>
      <Sidebar
        active={pathToLabel[currentPath]}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={settings.sidebar_collapsed}
      />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <Topbar
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className={`flex-1 overflow-auto p-4 sm:p-6 ${settings.compact_mode ? 'p-2 sm:p-3' : ''} bg-gray-50 dark:bg-gray-900`}>
          <div className={`max-w-7xl mx-auto ${settings.compact_mode ? 'max-w-full' : ''}`}>
            <Outlet /> {/* Page content goes here */}
          </div>
        </main>
      </div>
    </div>
  );
}
