import { useState, useEffect } from 'react';
import { getArticles } from '../api/kb.js';

export default function KnowledgeBase() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const data = await getArticles();
        setArticles(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Knowledge Base Articles</h2>
        <div className="space-y-4">
          {articles.length === 0 ? (
            <p className="text-gray-600">No articles found.</p>
          ) : (
            articles.map((article, i) => (
              <div key={article.id || i} className="border-b pb-4 last:border-0">
                <h3 className="font-medium text-primary hover:underline cursor-pointer">{article.title}</h3>
                <p className="text-sm text-gray-600 mt-1">Views: {article.views || 0}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
