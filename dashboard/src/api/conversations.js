// Use cookie-based auth; do not import getToken
import fetchWithAuth from './fetchWithAuth.js';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const getAuthHeaders = () => ({ 'Content-Type': 'application/json' });

export const getConversations = async () => {
  const response = await fetchWithAuth(`${API_BASE}/conversations/`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to fetch conversations');
  return response.json();
};

export const getConversation = async (conversationId) => {
  const response = await fetchWithAuth(`${API_BASE}/conversations/${conversationId}`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to fetch conversation');
  return response.json();
};

export const createConversation = async (conversationData) => {
  const response = await fetchWithAuth(`${API_BASE}/conversations/`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(conversationData) });
  if (!response.ok) throw new Error('Failed to create conversation');
  return response.json();
};

export const getConversationMessages = async (conversationId) => {
  const response = await fetchWithAuth(`${API_BASE}/conversations/${conversationId}/messages`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to fetch conversation messages');
  return response.json();
};

export const sendConversationMessage = async (conversationId, messageData) => {
  const response = await fetchWithAuth(`${API_BASE}/conversations/${conversationId}/messages`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(messageData) });
  if (!response.ok) throw new Error('Failed to send message');
  return response.json();
};

export const deleteConversation = async (conversationId) => {
  const response = await fetchWithAuth(`${API_BASE}/conversations/${conversationId}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to delete conversation');
  // 204 No Content doesn't have a body, so don't try to parse JSON
  return;
};

export const markMessageAsRead = async (conversationId, messageId) => {
  const response = await fetchWithAuth(`${API_BASE}/conversations/${conversationId}/messages/${messageId}/read`, { method: 'POST', headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to mark message as read');
  return response.json();
};

export const markConversationAsRead = async (conversationId) => {
  const response = await fetchWithAuth(`${API_BASE}/conversations/${conversationId}/read`, { method: 'POST', headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to mark conversation as read');
  return response.json();
};

export const markConversationReadUpTo = async (conversationId, messageId) => {
  const response = await fetchWithAuth(`${API_BASE}/conversations/${conversationId}/read-up-to/${messageId}`, { method: 'POST', headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to mark conversation read up to message');
  return response.json();
};

export const getTicketMessages = async (ticketId) => {
  const response = await fetchWithAuth(`${API_BASE}/tickets/${ticketId}/messages`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to fetch ticket messages');
  return response.json();
};

export const sendTicketMessage = async (ticketId, messageData) => {
  const response = await fetchWithAuth(`${API_BASE}/tickets/${ticketId}/messages`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(messageData) });
  if (!response.ok) throw new Error('Failed to send ticket message');
  return response.json();
};