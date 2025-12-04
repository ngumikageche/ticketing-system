// Use cookie-based auth; do not import `getToken`.
import fetchWithAuth from './fetchWithAuth.js';

const API_BASE =
    import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const getAuthHeaders = () => ({ 'Content-Type': 'application/json' });

export const getModules = async() => {
    const response = await fetchWithAuth(`${API_BASE}/modules/`, {
        headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch modules');
    return response.json();
};

export const createModule = async(moduleData) => {
    const response = await fetchWithAuth(`${API_BASE}/modules/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(moduleData),
    });
    if (!response.ok) throw new Error('Failed to create module');
    return response.json();
};

export const getModule = async(id) => {
    const response = await fetchWithAuth(`${API_BASE}/modules/${id}`, {
        headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch module');
    return response.json();
};

export const updateModule = async(id, moduleData) => {
    const response = await fetchWithAuth(`${API_BASE}/modules/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(moduleData),
    });
    if (!response.ok) throw new Error('Failed to update module');
    return response.json();
};

export const deleteModule = async(id) => {
    const response = await fetchWithAuth(`${API_BASE}/modules/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete module');
};