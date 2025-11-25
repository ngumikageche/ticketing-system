import { useState, useEffect } from 'react';
import { setWebhookUrl, getWebhookUrl } from '../api/users.js';
import { testWebhook } from '../api/notifications.js';
import { getSettings, updateSettings } from '../api/settings.js';
import { useSettings as useSettingsContext } from '../contexts/SettingsContext.jsx';
import { toast } from 'react-hot-toast';

export default function Settings() {
  const { settings, updateSetting, saveSettings } = useSettingsContext();
  const [activeTab, setActiveTab] = useState('general');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const webhookData = await getWebhookUrl();
        setWebhookUrl(webhookData.webhook_url || '');
      } catch (error) {
        console.error('Failed to fetch webhook URL:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSaveWebhook = async () => {
    setSaving(true);
    try {
      await setWebhookUrl(webhookUrl);
      toast.success('Webhook URL saved successfully!');
    } catch (error) {
      toast.error('Failed to save webhook URL: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await saveSettings(settings);
    } catch (error) {
      // Error toast is already shown by the context
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    setTesting(true);
    try {
      await testWebhook();
      toast.success('Test notification sent! Check your webhook endpoint.');
    } catch (error) {
      toast.error('Failed to test webhook: ' + error.message);
    } finally {
      setTesting(false);
    }
  };

  const handleSettingChange = (key, value) => {
    updateSetting(key, value);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'interface', label: 'Interface', icon: '🎨' },
    { id: 'tickets', label: 'Tickets', icon: '🎫' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'messages', label: 'Messages', icon: '💬' },
    { id: 'knowledge', label: 'Knowledge Base', icon: '📚' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'integrations', label: 'Integrations', icon: '🔗' }
  ];

  if (loading) return <div className="flex justify-center items-center h-64"><div className="text-lg">Loading...</div></div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Customize your experience and preferences</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">General Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Theme</label>
                  <select
                    value={settings.theme}
                    onChange={(e) => handleSettingChange('theme', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
                  <select
                    value={settings.language}
                    onChange={(e) => handleSettingChange('language', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => handleSettingChange('timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Items per page</label>
                  <input
                    type="number"
                    value={settings.items_per_page}
                    onChange={(e) => handleSettingChange('items_per_page', parseInt(e.target.value))}
                    min="5"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Format</label>
                  <select
                    value={settings.date_format}
                    onChange={(e) => handleSettingChange('date_format', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time Format</label>
                  <select
                    value={settings.time_format}
                    onChange={(e) => handleSettingChange('time_format', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="12h">12 Hour</option>
                    <option value="24h">24 Hour</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'interface' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Interface Preferences</h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-white dark:bg-gray-800">
                  <input
                    type="checkbox"
                    checked={settings.compact_mode}
                    onChange={(e) => handleSettingChange('compact_mode', e.target.checked)}
                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Compact mode</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Use a more compact interface with smaller spacing</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-white dark:bg-gray-800">
                  <input
                    type="checkbox"
                    checked={settings.sidebar_collapsed}
                    onChange={(e) => handleSettingChange('sidebar_collapsed', e.target.checked)}
                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Collapse sidebar by default</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Start with the navigation sidebar collapsed</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Ticket Preferences</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Sort Order</label>
                  <select
                    value={settings.ticket_sort_order}
                    onChange={(e) => handleSettingChange('ticket_sort_order', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="priority">Priority</option>
                    <option value="status">Status</option>
                  </select>
                </div>
                <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-white dark:bg-gray-800">
                  <input
                    type="checkbox"
                    checked={settings.ticket_auto_refresh}
                    onChange={(e) => handleSettingChange('ticket_auto_refresh', e.target.checked)}
                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Auto-refresh ticket lists</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Automatically refresh ticket lists based on your interval setting</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Dashboard Preferences</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default View</label>
                  <select
                    value={settings.default_dashboard_view}
                    onChange={(e) => handleSettingChange('default_dashboard_view', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="overview">Overview</option>
                    <option value="tickets">Tickets</option>
                    <option value="analytics">Analytics</option>
                  </select>
                </div>
                <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-white dark:bg-gray-800">
                  <input
                    type="checkbox"
                    checked={settings.show_chart_animations}
                    onChange={(e) => handleSettingChange('show_chart_animations', e.target.checked)}
                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Show chart animations</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Enable smooth animations for dashboard charts</p>
                  </div>
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Auto refresh interval (seconds)</label>
                  <input
                    type="number"
                    value={settings.auto_refresh_interval}
                    onChange={(e) => handleSettingChange('auto_refresh_interval', parseInt(e.target.value))}
                    min="10"
                    max="300"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">How often to refresh dashboard data automatically</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Messages & Conversations</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message Preview Length</label>
                  <input
                    type="number"
                    value={settings.message_preview_length}
                    onChange={(e) => handleSettingChange('message_preview_length', parseInt(e.target.value))}
                    min="50"
                    max="500"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Maximum characters to show in message previews</p>
                </div>
                <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-white dark:bg-gray-800">
                  <input
                    type="checkbox"
                    checked={settings.show_read_receipts}
                    onChange={(e) => handleSettingChange('show_read_receipts', e.target.checked)}
                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Show read receipts</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Display when messages have been read by recipients</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-white dark:bg-gray-800">
                  <input
                    type="checkbox"
                    checked={settings.auto_scroll_messages}
                    onChange={(e) => handleSettingChange('auto_scroll_messages', e.target.checked)}
                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Auto-scroll to bottom in conversations</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Automatically scroll to the latest message in conversations</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Knowledge Base Preferences</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">View Mode</label>
                  <select
                    value={settings.kb_view_mode}
                    onChange={(e) => handleSettingChange('kb_view_mode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="list">List</option>
                    <option value="grid">Grid</option>
                  </select>
                </div>
                <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-white dark:bg-gray-800">
                  <input
                    type="checkbox"
                    checked={settings.show_article_previews}
                    onChange={(e) => handleSettingChange('show_article_previews', e.target.checked)}
                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Show article previews</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Display article content previews in the knowledge base</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-white dark:bg-gray-800">
                  <input
                    type="checkbox"
                    checked={settings.notifications_enabled}
                    onChange={(e) => handleSettingChange('notifications_enabled', e.target.checked)}
                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Enable notifications</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Receive notifications for important events</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-white dark:bg-gray-800">
                  <input
                    type="checkbox"
                    checked={settings.email_notifications}
                    onChange={(e) => handleSettingChange('email_notifications', e.target.checked)}
                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Email notifications</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Receive notifications via email</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-white dark:bg-gray-800">
                  <input
                    type="checkbox"
                    checked={settings.sound_notifications}
                    onChange={(e) => handleSettingChange('sound_notifications', e.target.checked)}
                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Sound notifications</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Play sounds when receiving notifications</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-white dark:bg-gray-800">
                  <input
                    type="checkbox"
                    checked={settings.browser_notifications}
                    onChange={(e) => handleSettingChange('browser_notifications', e.target.checked)}
                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Browser notifications</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Show browser push notifications</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">External Integrations</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Webhook URL</label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-app.com/api/webhooks/notifications"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Receive real-time notifications via webhook. Leave blank to disable.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSaveWebhook}
                    disabled={saving}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? 'Saving...' : 'Save Webhook'}
                  </button>
                  <button
                    onClick={handleTestWebhook}
                    disabled={testing || !webhookUrl}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    {testing ? 'Testing...' : 'Test Webhook'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button - Only show for non-integration tabs */}
      {activeTab !== 'integrations' && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}
    </div>
  );
}
