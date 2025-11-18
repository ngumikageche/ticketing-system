const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

export const login = async (email, password) => {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error('Login failed');
  }
  const data = await response.json();
  localStorage.setItem('access_token', data.access_token);
  return data;
};

export const signup = async (name, email, password, securityAnswers) => {
  const response = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password, security_answers: securityAnswers }),
  });
  if (!response.ok) {
    throw new Error('Signup failed');
  }
  const data = await response.json();
  localStorage.setItem('access_token', data.access_token);
  return data;
};

export const getSecurityQuestions = async () => {
  const response = await fetch(`${API_BASE}/auth/security-questions`);
  if (!response.ok) {
    throw new Error('Failed to fetch security questions');
  }
  return await response.json();
};

export const logout = () => {
  localStorage.removeItem('access_token');
};

export const getToken = () => {
  return localStorage.getItem('access_token');
};