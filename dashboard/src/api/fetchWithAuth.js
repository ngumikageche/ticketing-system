import { refreshAccess } from './auth.js';
import { onAuthFailure } from './authEvents.js';

function getCookie(name) {
  if (!document || !document.cookie) return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export async function fetchWithAuth(url, opts = {}) {
  const options = { credentials: 'include', ...opts };
  // Use cookies for auth; do not add Authorization header from localStorage tokens.
  options.headers = options.headers || {};

  // Add CSRF token header if available for non-GET requests
  try {
    const method = (options.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      const csrf = getCookie('csrf_access_token') || getCookie('csrf_refresh_token') || getCookie('csrf');
      if (csrf) {
        options.headers = options.headers || {};
        options.headers['X-CSRF-TOKEN'] = csrf;
      }
    }
  } catch (err) {
    // ignore cookie access errors
  }

  let response = await fetch(url, options);
  if (response.status !== 401) return response;

  // If already on login page, don't try to refresh, just fail
  if (window.location && window.location.pathname === '/login') {
    try { onAuthFailure(); } catch (e) {}
    return response;
  }

  // Try to refresh once
  try {
  await refreshAccess();
  // If the backend returns a JSON access token (dev-only), we don't persist it
  // locally; fetchWithAuth will retry the request without an Authorization header
    response = await fetch(url, options);
    return response;
  } catch (err) {
    // Refresh failed; notify AuthContext and return original 401 response
    try { onAuthFailure(); } catch (e) {}
    return response;
  }
}

export default fetchWithAuth;
