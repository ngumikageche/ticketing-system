import { getToken } from './auth.js';

const API_BASE = 'http://localhost:5000/api';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`,
});

export const getArticles = async () => {
  const response = await fetch(`${API_BASE}/kb/articles`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch articles');
  return response.json();
};

export const createArticle = async (articleData) => {
  const response = await fetch(`${API_BASE}/kb/articles`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(articleData),
  });
  if (!response.ok) throw new Error('Failed to create article');
  return response.json();
};

export const getArticle = async (id) => {
  const response = await fetch(`${API_BASE}/kb/articles/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch article');
  return response.json();
};

export const updateArticle = async (id, articleData) => {
  const response = await fetch(`${API_BASE}/kb/articles/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(articleData),
  });
  if (!response.ok) throw new Error('Failed to update article');
  return response.json();
};

export const deleteArticle = async (id) => {
  const response = await fetch(`${API_BASE}/kb/articles/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete article');
};

export const getTags = async () => {
  const response = await fetch(`${API_BASE}/kb/tags`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch tags');
  return response.json();
};

export const createTag = async (tagData) => {
  const response = await fetch(`${API_BASE}/kb/tags`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(tagData),
  });
  if (!response.ok) throw new Error('Failed to create tag');
  return response.json();
};

export const getTag = async (id) => {
  const response = await fetch(`${API_BASE}/kb/tags/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch tag');
  return response.json();
};

export const updateTag = async (id, tagData) => {
  const response = await fetch(`${API_BASE}/kb/tags/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(tagData),
  });
  if (!response.ok) throw new Error('Failed to update tag');
  return response.json();
};

export const deleteTag = async (id) => {
  const response = await fetch(`${API_BASE}/kb/tags/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete tag');
};