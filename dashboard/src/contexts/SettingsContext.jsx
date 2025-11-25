import { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getSettings, updateSettings } from '../api/settings.js';

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    notifications_enabled: true,
    email_notifications: true,
    items_per_page: 20,
    auto_refresh_interval: 30,
    compact_mode: false,
    sidebar_collapsed: false,
    sound_notifications: true,
    browser_notifications: false,
    ticket_sort_order: 'newest',
    ticket_auto_refresh: true,
    default_dashboard_view: 'overview',
    show_chart_animations: true,
    message_preview_length: 100,
    show_read_receipts: true,
    auto_scroll_messages: true,
    kb_view_mode: 'list',
    show_article_previews: true,
    date_format: 'MM/DD/YYYY',
    time_format: '24h',
    settings: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const userSettings = await getSettings();
        setSettings(userSettings);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        toast.error('Failed to load settings');
        // Keep default settings on error
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = async (newSettings) => {
    try {
      const response = await updateSettings(newSettings);
      setSettings(response);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
      throw error;
    }
  };

  const value = {
    settings,
    loading,
    updateSetting,
    saveSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}