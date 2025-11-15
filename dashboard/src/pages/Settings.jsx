export default function Settings() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">General Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input type="text" defaultValue="SupportDesk Inc." className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
            <input type="email" defaultValue="support@company.com" className="w-full px-3 py-2 border rounded-lg" />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Notifications</h2>
        <label className="flex items-center gap-3">
          <input type="checkbox" defaultChecked className="w-4 h-4 text-primary" />
          <span>Email me when new ticket is created</span>
        </label>
      </div>

      <button className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700">
        Save Changes
      </button>
    </div>
  );
}
