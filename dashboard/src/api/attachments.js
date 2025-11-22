// Use cookie-based auth; do not rely on localStorage tokens.
import fetchWithAuth from './fetchWithAuth.js';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';


const getAuthHeaders = () => {
  // Keep for explicit Content-Type but fetchWithAuth will attach Authorization if token is present
  return { 'Content-Type': 'application/json' };
};

export const getAttachments = async (params = {}) => {
  const url = new URL(`${API_BASE}/attachments/`);
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) url.searchParams.append(key, params[key]);
  });
  const response = await fetchWithAuth(url.toString(), { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to fetch attachments');
  return response.json();
};

export const createAttachment = async (attachmentData) => {
  const response = await fetchWithAuth(`${API_BASE}/attachments/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(attachmentData),
  });
  if (!response.ok) throw new Error('Failed to create attachment');
  return response.json();
};

export const getAttachment = async (id) => {
  const response = await fetchWithAuth(`${API_BASE}/attachments/${id}`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to fetch attachment');
  return response.json();
};

export const deleteAttachment = async (id) => {
  const response = await fetchWithAuth(`${API_BASE}/attachments/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to delete attachment');
};