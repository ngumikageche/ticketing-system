import { Home, Ticket, BookOpen, BarChart3, Users, Settings as SettingsIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

const menu = [
  { label: 'Dashboard', icon: Home, path: '/' },
  { label: 'Tickets', icon: Ticket, path: '/tickets' },
  { label: 'Knowledge Base', icon: BookOpen, path: '/knowledge-base' },
  { label: 'Reports', icon: BarChart3, path: '/reports' },
  { label: 'Users', icon: Users, path: '/users' },
  { label: 'Settings', icon: SettingsIcon, path: '/settings' },
];

export default function Sidebar({ active = 'Dashboard' }) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-md"></div>
          <h1 className="text-2xl font-bold text-primary">SupportDesk</h1>
        </Link>
      </div>

      <nav className="flex-1 px-4">
        {menu.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.label;
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${isActive ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
