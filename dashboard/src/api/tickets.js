// Use cookie-based auth; do not import `getToken`.
import fetchWithAuth from './fetchWithAuth.js';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const getAuthHeaders = () => ({ 'Content-Type': 'application/json' });

export const getTickets = async () => {
  const response = await fetchWithAuth(`${API_BASE}/tickets/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch tickets');
  return response.json();
};

export const createTicket = async (ticketData) => {
  const response = await fetchWithAuth(`${API_BASE}/tickets/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(ticketData),
  });
  if (!response.ok) throw new Error('Failed to create ticket');
  return response.json();
};

export const getTicket = async (id) => {
  const response = await fetchWithAuth(`${API_BASE}/tickets/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch ticket');
  return response.json();
};

export const updateTicket = async (id, ticketData) => {
  const response = await fetchWithAuth(`${API_BASE}/tickets/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(ticketData),
  });
  if (!response.ok) throw new Error('Failed to update ticket');
  return response.json();
};

export const deleteTicket = async (id) => {
  const response = await fetchWithAuth(`${API_BASE}/tickets/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete ticket');
};