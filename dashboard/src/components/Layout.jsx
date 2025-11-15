import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useLocation } from 'react-router-dom';

const pageTitles = {
  '/': 'Dashboard',
  '/tickets': 'Tickets',
  '/knowledge-base': 'Knowledge Base',
  '/reports': 'Reports',
  '/users': 'Users',
  '/settings': 'Settings',
};

export default function Layout() {
  const location = useLocation();
  const currentPath = location.pathname;
  const title = pageTitles[currentPath] || 'Dashboard';

  // Map path to sidebar active label
  const pathToLabel = {
    '/': 'Dashboard',
    '/tickets': 'Tickets',
    '/knowledge-base': 'Knowledge Base',
    '/reports': 'Reports',
    '/users': 'Users',
    '/settings': 'Settings',
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar active={pathToLabel[currentPath]} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={title} />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet /> {/* Page content goes here */}
          </div>
        </main>
      </div>
    </div>
  );
}
