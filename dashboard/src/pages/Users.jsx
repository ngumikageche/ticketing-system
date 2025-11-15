const users = [
  { name: 'James Anderson', email: 'james@company.com', role: 'Agent', status: 'Active' },
  { name: 'Lisa Brown', email: 'lisa@company.com', role: 'Admin', status: 'Active' },
  { name: 'David Williams', email: 'david@company.com', role: 'Agent', status: 'Inactive' },
];

export default function Users() {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h2 className="text-xl font-semibold">Team Members</h2>
      </div>
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            {['Name', 'Email', 'Role', 'Status'].map(h => (
              <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map((u, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-medium text-gray-900">{u.name}</td>
              <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
              <td className="px-6 py-4 text-sm">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  u.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {u.role}
                </span>
              </td>
              <td className="px-6 py-4 text-sm">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  u.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {u.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
