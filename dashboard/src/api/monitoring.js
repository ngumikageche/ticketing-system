// Server monitoring API calls
import fetchWithAuth from './fetchWithAuth.js';

const API_BASE =
    import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const getAuthHeaders = () => ({ 'Content-Type': 'application/json' });

export const getServerMonitors = async() => {
    const response = await fetchWithAuth(`${API_BASE}/monitoring/`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch server monitors');
    return response.json();
};

export const createServerMonitor = async(monitorData) => {
    const response = await fetchWithAuth(`${API_BASE}/monitoring/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(monitorData)
    });
    if (!response.ok) throw new Error('Failed to create server monitor');
    return response.json();
};

export const updateServerMonitor = async(monitorId, monitorData) => {
    const response = await fetchWithAuth(`${API_BASE}/monitoring/${monitorId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(monitorData)
    });
    if (!response.ok) throw new Error('Failed to update server monitor');
    return response.json();
};

export const deleteServerMonitor = async(monitorId) => {
    const response = await fetchWithAuth(`${API_BASE}/monitoring/${monitorId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete server monitor');
    return response.json();
};

export const getMonitorStatus = async(monitorId) => {
    const response = await fetchWithAuth(`${API_BASE}/monitoring/${monitorId}/status`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch monitor status');
    return response.json();
};

export const startMonitoring = async(monitorId) => {
    const response = await fetchWithAuth(`${API_BASE}/monitoring/${monitorId}/start`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to start monitoring');
    return response.json();
};

export const stopMonitoring = async(monitorId) => {
    const response = await fetchWithAuth(`${API_BASE}/monitoring/${monitorId}/stop`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to stop monitoring');
    return response.json();
};