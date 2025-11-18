import { getToken } from './auth.js';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`,
});

export const getComments = async () => {
  const response = await fetch(`${API_BASE}/comments/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch comments');
  return response.json();
};

export const createComment = async (commentData) => {
  const response = await fetch(`${API_BASE}/comments/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(commentData),
  });
  if (!response.ok) throw new Error('Failed to create comment');
  return response.json();
};

export const getComment = async (id) => {
  const response = await fetch(`${API_BASE}/comments/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch comment');
  return response.json();
};

export const updateComment = async (id, commentData) => {
  const response = await fetch(`${API_BASE}/comments/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(commentData),
  });
  if (!response.ok) throw new Error('Failed to update comment');
  return response.json();
};

export const deleteComment = async (id) => {
  const response = await fetch(`${API_BASE}/comments/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete comment');
};