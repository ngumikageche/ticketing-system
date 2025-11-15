import { getToken } from './auth.js';

const API_BASE = 'http://localhost:5000/api';

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