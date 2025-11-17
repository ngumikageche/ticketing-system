import { useState, useEffect } from 'react';
import { setWebhookUrl, getWebhookUrl, testWebhook } from '../api/notifications.js';

export default function Settings() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const fetchWebhook = async () => {
      try {
        const data = await getWebhookUrl();
        setWebhookUrl(data.webhook_url || '');
      } catch (error) {
        console.error('Failed to fetch webhook URL:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchWebhook();
  }, []);

  const handleSaveWebhook = async () => {
    setSaving(true);
    try {
      await setWebhookUrl(webhookUrl);
      alert('Webhook URL saved successfully!');
    } catch (error) {
      alert('Failed to save webhook URL: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    setTesting(true);
    try {
      await testWebhook();
      alert('Test notification sent! Check your webhook endpoint.');
    } catch (error) {
      alert('Failed to test webhook: ' + error.message);
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div>Loading...</div>;

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
        <label className="flex items-center gap-3 mb-4">
          <input type="checkbox" defaultChecked className="w-4 h-4 text-primary" />
          <span>Email me when new ticket is created</span>
        </label>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-app.com/api/webhooks/notifications"
              className="w-full px-3 py-2 border rounded-lg"
            />
            <p className="text-sm text-gray-600 mt-1">
              Receive real-time notifications via webhook. Leave blank to disable.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSaveWebhook}
              disabled={saving}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Webhook'}
            </button>
            <button
              onClick={handleTestWebhook}
              disabled={testing || !webhookUrl}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
            >
              {testing ? 'Testing...' : 'Test Webhook'}
            </button>
          </div>
        </div>
      </div>

      <button className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700">
        Save Changes
      </button>
    </div>
  );
}
