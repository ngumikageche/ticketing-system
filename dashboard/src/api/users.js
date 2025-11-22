import { refreshAccess } from './auth.js';
import fetchWithAuth from './fetchWithAuth.js';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const getAuthHeaders = () => ({ 'Content-Type': 'application/json' });

export const getUsers = async () => {
  const response = await fetchWithAuth(`${API_BASE}/users/`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
};

export const createUser = async (userData) => {
  const response = await fetchWithAuth(`${API_BASE}/users/`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(userData) });
  if (!response.ok) throw new Error('Failed to create user');
  return response.json();
};

export const getUser = async (id) => {
  const response = await fetchWithAuth(`${API_BASE}/users/${id}`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to fetch user');
  return response.json();
};

export const updateUser = async (id, userData) => {
  const response = await fetchWithAuth(`${API_BASE}/users/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(userData) });
  if (!response.ok) throw new Error('Failed to update user');
  return response.json();
};

export const deleteUser = async (id) => {
  const response = await fetchWithAuth(`${API_BASE}/users/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to delete user');
};

export const getCurrentUser = async () => {
  let response = await fetchWithAuth(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch current user');
  return response.json();
};

export const setWebhookUrl = async (webhookUrl) => {
  const response = await fetchWithAuth(`${API_BASE}/users/me/webhook`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ webhook_url: webhookUrl }) });
  if (!response.ok) throw new Error('Failed to set webhook URL');
  return response.json();
};

export const getWebhookUrl = async () => {
  const response = await fetchWithAuth(`${API_BASE}/users/me/webhook`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to get webhook URL');
  return response.json();
};