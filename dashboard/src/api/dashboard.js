import { getToken } from './auth.js';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`,
});

export const getDashboard = async () => {
  const response = await fetch(`${API_BASE}/dashboard/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch dashboard data');
  return response.json();
};

export const getTicketsByStatus = async () => {
  const response = await fetch(`${API_BASE}/dashboard/reports/tickets-by-status`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch tickets by status');
  return response.json();
};

export const getAgentPerformance = async () => {
  const response = await fetch(`${API_BASE}/dashboard/reports/agent-performance`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch agent performance');
  return response.json();
};

export const getTicketTrends = async () => {
  const response = await fetch(`${API_BASE}/dashboard/reports/ticket-trends`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch ticket trends');
  return response.json();
};