const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

export const login = async (email, password) => {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error('Login failed');
  }
  const data = await response.json();
  // Token is stored in httpOnly cookie (and may be returned in body for dev tooling),
  // but we do NOT write tokens to localStorage to avoid exposing them.
  return data;
};

export const signup = async (name, email, password, securityAnswers) => {
  const response = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ name, email, password, security_answers: securityAnswers }),
  });
  if (!response.ok) {
    throw new Error('Signup failed');
  }
  const data = await response.json();
  // Do not write token to localStorage; rely on httpOnly cookie
  return data;
};

export const getSecurityQuestions = async () => {
  const response = await fetch(`${API_BASE}/auth/security-questions`);
  if (!response.ok) {
    throw new Error('Failed to fetch security questions');
  }
  return await response.json();
};

export const logout = async () => {
  // Call the backend to clear cookies and invalidate tokens
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch (err) {
    // ignore
  }
  // Do not store token in localStorage; logout clears cookies server-side
};

export const getToken = () => null;

export const refreshAccess = async () => {
  const resp = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
  if (!resp.ok) throw new Error('Failed to refresh access token');
  return await resp.json();
};