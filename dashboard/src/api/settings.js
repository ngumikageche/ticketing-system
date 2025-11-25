import { fetchWithAuth } from './fetchWithAuth.js';

const API_BASE =
    import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

export const getSettings = async() => {
    const response = await fetchWithAuth(`${API_BASE}/settings/`);
    return response.json();
};

export const updateSettings = async(settings) => {
    const response = await fetchWithAuth(`${API_BASE}/settings/`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
    });
    return response.json();
};

export const getSetting = async(key) => {
    const response = await fetchWithAuth(`${API_BASE}/settings/${key}`);
    return response.json();
};

export const setSetting = async(key, value) => {
    const response = await fetchWithAuth(`${API_BASE}/settings/${key}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value }),
    });
    return response.json();
};