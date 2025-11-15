import { Search, Bell, User } from 'lucide-react';

export default function Topbar({ title = 'Dashboard' }) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-600 hover:text-gray-900">
          <Search className="w-5 h-5" />
        </button>
        <button className="relative p-2 text-gray-600 hover:text-gray-900">
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <button className="flex items-center gap-2 p-2 text-gray-600 hover:text-gray-900">
          <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
        </button>
      </div>
    </header>
  );
}
