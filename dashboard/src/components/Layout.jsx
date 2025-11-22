import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { setNavigate } from '../navigation.js';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from '../contexts/AuthContext.jsx';

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
  useEffect(() => {
    // expose the router navigate function to other modules for SPA navigation
    setNavigate(navigate);
    
    if (!loading && !currentUser) {
      navigate('/login');
    }
  }, [navigate, loading, currentUser]);

  const currentPath = location.pathname;
  const title = pageTitles[currentPath] || 'Dashboard';

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
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        active={pathToLabel[currentPath]}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <Topbar
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet /> {/* Page content goes here */}
          </div>
        </main>
      </div>
    </div>
  );
}
