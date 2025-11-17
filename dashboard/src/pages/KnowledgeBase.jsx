import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { getArticles, createArticle, updateArticle, deleteArticle, getTags, createTag, updateTag, deleteTag } from '../api/kb.js';
import { getUsers } from '../api/users.js';

export default function KnowledgeBase() {
  const [articles, setArticles] = useState([]);
  const [tags, setTags] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('articles');
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [editingTag, setEditingTag] = useState(null);
  const [articleForm, setArticleForm] = useState({
    title: '',
    content: '',
    is_public: true,
    tags: []
  });
  const [tagForm, setTagForm] = useState({
    name: '',
    color: '#3B82F6'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [articlesData, tagsData, usersData] = await Promise.all([getArticles(), getTags(), getUsers()]);
        setArticles(articlesData);
        setTags(tagsData);
        setUsers(usersData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchArticles = async () => {
    try {
      const data = await getArticles();
      setArticles(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchTags = async () => {
    try {
      const data = await getTags();
      setTags(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateArticle = () => {
    setEditingArticle(null);
    setArticleForm({ title: '', content: '', is_public: true, tags: [] });
    setShowArticleModal(true);
  };

  const handleEditArticle = (article) => {
    setEditingArticle(article);
    setArticleForm({
      title: article.title,
      content: article.content,
      is_public: article.is_public,
      tags: article.tags?.map(t => t.id) || []
    });
    setShowArticleModal(true);
  };

  const handleDeleteArticle = async (article) => {
    if (window.confirm(`Are you sure you want to delete "${article.title}"?`)) {
      try {
        await deleteArticle(article.id);
        fetchArticles();
      } catch (err) {
        alert('Error deleting article: ' + err.message);
      }
    }
  };

  const handleArticleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingArticle) {
        await updateArticle(editingArticle.id, articleForm);
      } else {
        await createArticle(articleForm);
      }
      setShowArticleModal(false);
      fetchArticles();
    } catch (err) {
      alert('Error saving article: ' + err.message);
    }
  };

  const handleCreateTag = () => {
    setEditingTag(null);
    setTagForm({ name: '', color: '#3B82F6' });
    setShowTagModal(true);
  };

  const handleEditTag = (tag) => {
    setEditingTag(tag);
    setTagForm({ name: tag.name, color: tag.color });
    setShowTagModal(true);
  };

  const handleDeleteTag = async (tag) => {
    if (window.confirm(`Are you sure you want to delete "${tag.name}"?`)) {
      try {
        await deleteTag(tag.id);
        fetchTags();
      } catch (err) {
        alert('Error deleting tag: ' + err.message);
      }
    }
  };

  const handleTagSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTag) {
        await updateTag(editingTag.id, tagForm);
      } else {
        await createTag(tagForm);
      }
      setShowTagModal(false);
      fetchTags();
    } catch (err) {
      alert('Error saving tag: ' + err.message);
    }
  };

  const userMap = useMemo(() => {
    const map = {};
    users.forEach(user => {
      map[user.id] = user.name;
    });
    return map;
  }, [users]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('articles')}
          className={`px-4 py-2 ${activeTab === 'articles' ? 'border-b-2 border-primary text-primary' : 'text-gray-600'}`}
        >
          Articles
        </button>
        <button
          onClick={() => setActiveTab('tags')}
          className={`px-4 py-2 ${activeTab === 'tags' ? 'border-b-2 border-primary text-primary' : 'text-gray-600'}`}
        >
          Tags
        </button>
      </div>

      {/* Articles Tab */}
      {activeTab === 'articles' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Knowledge Base Articles</h1>
            <button
              onClick={handleCreateArticle}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              Add Article
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Title', 'Author', 'Views', 'Public', 'Tags', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {articles.map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{article.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{userMap[article.author_id] || article.author_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{article.views || 0}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        article.is_public ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {article.is_public ? 'Public' : 'Private'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {article.tags?.map(tag => (
                        <span key={tag.id} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1">
                          {tag.name}
                        </span>
                      ))}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditArticle(article)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteArticle(article)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Tags Tab */}
      {activeTab === 'tags' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Knowledge Base Tags</h1>
            <button
              onClick={handleCreateTag}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              Add Tag
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Name', 'Color', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tags.map((tag) => (
                  <tr key={tag.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{tag.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: tag.color }}
                        ></div>
                        {tag.color}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditTag(tag)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTag(tag)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Article Modal */}
      {showArticleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingArticle ? 'Edit Article' : 'Add Article'}</h2>
            <form onSubmit={handleArticleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  required
                  value={articleForm.title}
                  onChange={e => setArticleForm({ ...articleForm, title: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Content</label>
                <textarea
                  required
                  rows={6}
                  value={articleForm.content}
                  onChange={e => setArticleForm({ ...articleForm, content: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={articleForm.is_public}
                    onChange={e => setArticleForm({ ...articleForm, is_public: e.target.checked })}
                    className="mr-2"
                  />
                  Public
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tags</label>
                <select
                  multiple
                  value={articleForm.tags}
                  onChange={e => setArticleForm({ ...articleForm, tags: Array.from(e.target.selectedOptions, option => option.value) })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                >
                  {tags.map(tag => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700"
                >
                  {editingArticle ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowArticleModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tag Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">{editingTag ? 'Edit Tag' : 'Add Tag'}</h2>
            <form onSubmit={handleTagSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  required
                  value={tagForm.name}
                  onChange={e => setTagForm({ ...tagForm, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Color</label>
                <input
                  type="color"
                  value={tagForm.color}
                  onChange={e => setTagForm({ ...tagForm, color: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700"
                >
                  {editingTag ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTagModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
