import { getToken } from './auth.js';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`,
});

export const getNotifications = async () => {
  const response = await fetch(`${API_BASE}/notifications/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch notifications');
  return response.json();
};

export const markNotificationAsRead = async (id) => {
  const response = await fetch(`${API_BASE}/notifications/${id}/read`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to mark notification as read');
  return response.json();
};

export const setWebhookUrl = async (webhookUrl) => {
  const response = await fetch(`${API_BASE}/users/me/webhook`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ webhook_url: webhookUrl }),
  });
  if (!response.ok) throw new Error('Failed to set webhook URL');
  return response.json();
};

export const getWebhookUrl = async () => {
  const response = await fetch(`${API_BASE}/users/me/webhook`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to get webhook URL');
  return response.json();
};

export const testWebhook = async () => {
  const response = await fetch(`${API_BASE}/notifications/webhooks/test`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to test webhook');
  return response.json();
};

// Webhook payload handler for processing incoming webhook data
export const processWebhookPayload = (payload) => {
  const { event, notification, data } = payload;

  // Validate payload structure
  if (!notification) {
    throw new Error('Invalid webhook payload: missing notification');
  }

  // Return processed data for UI updates
  return {
    event,
    notification: {
      id: notification.id,
      type: notification.type,
      message: notification.message,
      related_id: notification.related_id,
      related_type: notification.related_type,
      created_at: notification.created_at,
      is_read: false
    },
    data // Full entity data for real-time updates
  };
};

// Webhook event types for type safety
export const WEBHOOK_EVENTS = {
  NOTIFICATION_CREATED: 'notification.created',
  TICKET_UPDATED: 'ticket.updated',
  COMMENT_CREATED: 'comment.created',
  COMMENT_UPDATED: 'comment.updated',
  USER_UPDATED: 'user.updated',
  WEBHOOK_TEST: 'webhook_test'
};