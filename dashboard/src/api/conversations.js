import { getToken } from './auth.js';

const API_BASE = 'http://localhost:5000/api';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`,
});

export const getConversations = async () => {
  const response = await fetch(`${API_BASE}/conversations/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch conversations');
  return response.json();
};

export const getConversation = async (conversationId) => {
  const response = await fetch(`${API_BASE}/conversations/${conversationId}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch conversation');
  return response.json();
};

export const createConversation = async (conversationData) => {
  const response = await fetch(`${API_BASE}/conversations/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(conversationData),
  });
  if (!response.ok) throw new Error('Failed to create conversation');
  return response.json();
};

export const getConversationMessages = async (conversationId) => {
  const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch conversation messages');
  return response.json();
};

export const sendConversationMessage = async (conversationId, messageData) => {
  const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(messageData),
  });
  if (!response.ok) throw new Error('Failed to send message');
  return response.json();
};

export const addConversationParticipant = async (conversationId, userId) => {
  const response = await fetch(`${API_BASE}/conversations/${conversationId}/participants`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ user_id: userId }),
  });
  if (!response.ok) throw new Error('Failed to add participant');
  return response.json();
};

export const getTicketMessages = async (ticketId) => {
  const response = await fetch(`${API_BASE}/tickets/${ticketId}/messages`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch ticket messages');
  return response.json();
};

export const sendTicketMessage = async (ticketId, messageData) => {
  const response = await fetch(`${API_BASE}/tickets/${ticketId}/messages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(messageData),
  });
  if (!response.ok) throw new Error('Failed to send ticket message');
  return response.json();
};