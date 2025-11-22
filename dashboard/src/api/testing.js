// Avoid localStorage tokens; rely on cookie-based auth
import fetchWithAuth from './fetchWithAuth.js';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const getAuthHeaders = () => ({ 'Content-Type': 'application/json' });

export const getTestingSessions = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.ticket_id) queryParams.append('ticket_id', filters.ticket_id);
  if (filters.user_id) queryParams.append('user_id', filters.user_id);
  if (filters.status) queryParams.append('status', filters.status);

  const response = await fetchWithAuth(`${API_BASE}/testing/?${queryParams}`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to fetch testing sessions');
  return response.json();
};

export const createTestingSession = async (testingData) => {
  const response = await fetchWithAuth(`${API_BASE}/testing/`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(testingData) });
  if (!response.ok) throw new Error('Failed to create testing session');
  return response.json();
};

export const getTestingSession = async (id) => {
  const response = await fetchWithAuth(`${API_BASE}/testing/${id}`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to fetch testing session');
  return response.json();
};

export const updateTestingSession = async (id, updateData) => {
  const response = await fetchWithAuth(`${API_BASE}/testing/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(updateData) });
  if (!response.ok) throw new Error('Failed to update testing session');
  return response.json();
};

export const deleteTestingSession = async (id) => {
  const response = await fetchWithAuth(`${API_BASE}/testing/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to delete testing session');
};