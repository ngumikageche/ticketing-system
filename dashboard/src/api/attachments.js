import { getToken } from './auth.js';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`,
});

export const getAttachments = async () => {
  const response = await fetch(`${API_BASE}/attachments/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch attachments');
  return response.json();
};

export const createAttachment = async (attachmentData) => {
  const response = await fetch(`${API_BASE}/attachments/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(attachmentData),
  });
  if (!response.ok) throw new Error('Failed to create attachment');
  return response.json();
};

export const getAttachment = async (id) => {
  const response = await fetch(`${API_BASE}/attachments/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch attachment');
  return response.json();
};

export const deleteAttachment = async (id) => {
  const response = await fetch(`${API_BASE}/attachments/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete attachment');
};