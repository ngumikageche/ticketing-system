export default function KnowledgeBase() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Knowledge Base Articles</h2>
        <div className="space-y-4">
          {['How to reset password', 'Checkout troubleshooting', 'API integration guide'].map((title, i) => (
            <div key={i} className="border-b pb-4 last:border-0">
              <h3 className="font-medium text-primary hover:underline cursor-pointer">{title}</h3>
              <p className="text-sm text-gray-600 mt-1">Last updated: Nov {10 + i}, 2025</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
