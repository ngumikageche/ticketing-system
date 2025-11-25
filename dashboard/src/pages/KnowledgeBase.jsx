import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getArticles, createArticle, updateArticle, deleteArticle, getTags, createTag, updateTag, deleteTag } from '../api/kb.js';
import { getUsers } from '../api/users.js';
import { useSettings } from '../contexts/SettingsContext.jsx';

export default function KnowledgeBase() {
  const { settings } = useSettings();
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
        toast.success('Article deleted successfully!');
      } catch (err) {
        toast.error('Error deleting article: ' + err.message);
      }
    }
  };

  const handleArticleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingArticle) {
        await updateArticle(editingArticle.id, articleForm);
        toast.success('Article updated successfully!');
      } else {
        await createArticle(articleForm);
        toast.success('Article created successfully!');
      }
      setShowArticleModal(false);
      fetchArticles();
    } catch (err) {
      toast.error('Error saving article: ' + err.message);
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
        toast.success('Tag deleted successfully!');
      } catch (err) {
        toast.error('Error deleting tag: ' + err.message);
      }
    }
  };

  const handleTagSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTag) {
        await updateTag(editingTag.id, tagForm);
        toast.success('Tag updated successfully!');
      } else {
        await createTag(tagForm);
        toast.success('Tag created successfully!');
      }
      setShowTagModal(false);
      fetchTags();
    } catch (err) {
      toast.error('Error saving tag: ' + err.message);
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
      <div className="flex border-b border-gray-200 dark:border-gray-600">
        <button
          onClick={() => setActiveTab('articles')}
          className={`px-4 py-2 transition-colors ${activeTab === 'articles' ? 'border-b-2 border-primary text-primary dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
        >
          Articles
        </button>
        <button
          onClick={() => setActiveTab('tags')}
          className={`px-4 py-2 transition-colors ${activeTab === 'tags' ? 'border-b-2 border-primary text-primary dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
        >
          Tags
        </button>
      </div>

      {/* Articles Tab */}
      {activeTab === 'articles' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Knowledge Base Articles</h1>
            <button
              onClick={handleCreateArticle}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              Add Article
            </button>
          </div>

          {settings.kb_view_mode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <div key={article.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md dark:hover:shadow-lg transition">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">{article.title}</h3>
                    <div className="flex gap-2 ml-2">
                      <button
                        onClick={() => handleEditArticle(article)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteArticle(article)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <span>By {userMap[article.author_id] || article.author_id}</span>
                    <span>{article.views || 0} views</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      article.is_public ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                    }`}>
                      {article.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>
                  {settings.show_article_previews && (
                    <div className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">
                      {article.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {article.tags?.map(tag => (
                      <span key={tag.id} className="inline-block bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded">
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {['Title', 'Author', 'Views', 'Public', 'Tags', 'Actions'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {articles.map((article) => (
                    <tr key={article.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">{article.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{userMap[article.author_id] || article.author_id}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{article.views || 0}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          article.is_public ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                        }`}>
                          {article.is_public ? 'Public' : 'Private'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {article.tags?.map(tag => (
                          <span key={tag.id} className="inline-block bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded mr-1">
                            {tag.name}
                          </span>
                        ))}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditArticle(article)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteArticle(article)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
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
          )}
        </>
      )}

      {/* Tags Tab */}
      {activeTab === 'tags' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Knowledge Base Tags</h1>
            <button
              onClick={handleCreateTag}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              Add Tag
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {['Name', 'Color', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {tags.map((tag) => (
                  <tr key={tag.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">{tag.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: tag.color }}
                        ></div>
                        <span className="text-gray-700 dark:text-gray-300">{tag.color}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditTag(tag)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTag(tag)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">{editingArticle ? 'Edit Article' : 'Add Article'}</h2>
            <form onSubmit={handleArticleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                <input
                  type="text"
                  required
                  value={articleForm.title}
                  onChange={e => setArticleForm({ ...articleForm, title: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-primary focus:border-primary placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Content</label>
                <textarea
                  required
                  rows={6}
                  value={articleForm.content}
                  onChange={e => setArticleForm({ ...articleForm, content: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-primary focus:border-primary placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              <div>
                <label className="flex items-center text-gray-700 dark:text-gray-300">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tags</label>
                <select
                  multiple
                  value={articleForm.tags}
                  onChange={e => setArticleForm({ ...articleForm, tags: Array.from(e.target.selectedOptions, option => option.value) })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-primary focus:border-primary"
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
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">{editingTag ? 'Edit Tag' : 'Add Tag'}</h2>
            <form onSubmit={handleTagSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <input
                  type="text"
                  required
                  value={tagForm.name}
                  onChange={e => setTagForm({ ...tagForm, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-primary focus:border-primary placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Color</label>
                <input
                  type="color"
                  value={tagForm.color}
                  onChange={e => setTagForm({ ...tagForm, color: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:outline-none focus:ring-primary focus:border-primary"
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
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
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
