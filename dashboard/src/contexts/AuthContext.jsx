import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { login as apiLogin, logout as apiLogout, refreshAccess as apiRefresh, getSecurityQuestions } from '../api/auth.js';
import { getCurrentUser as apiGetCurrentUser } from '../api/users.js';
import fetchWithAuth from '../api/fetchWithAuth.js';
import { registerAuthFailureHandler } from '../api/authEvents.js';
import { navigateTo } from '../navigation.js';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// small helper to decode JWT without external lib
function decodeJwtPayload(token) {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch (err) {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch (e) {
      return null;
    }
  }
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpiring, setSessionExpiring] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);

  // Load current user on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // Skip loading if on login page
      if (window.location && window.location.pathname === '/login') {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const user = await apiGetCurrentUser();
        if (!cancelled) setCurrentUser(user);
      } catch (err) {
        // not logged in
        setCurrentUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Register global auth failure handler (if fetchWithAuth returns 401 after refresh)
  useEffect(() => {
    const handleFailure = () => {
      // Clear state and navigate to login
      setCurrentUser(null);
      // Only navigate if not already on login page
      if (window.location.pathname !== '/login') {
        navigateTo('/login');
      }
    };
    registerAuthFailureHandler(handleFailure);
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const data = await apiLogin(email, password);
      // data.user returned; set current user
      setCurrentUser(data.user);
      toast.success('Login successful');
      // determine expiry from returned access token if available
      if (data.access_token) {
        const payload = decodeJwtPayload(data.access_token);
        if (payload && payload.exp) {
          const exp = payload.exp * 1000;
          setExpiresAt(exp);
          // start timer for session expiry warning
          scheduleExpiryTimer(exp);
        }
      }
      return data.user;
    } catch (error) {
      toast.error('Login failed: ' + (error.message || 'Invalid credentials'));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch (err) {
      // ignore
    }
    setCurrentUser(null);
    toast.success('Logged out successfully');
    // redirect to login via SPA navigation helper
    navigateTo('/login');
  }, []);

  const scheduleExpiryTimer = (expMs) => {
    const now = Date.now();
    const msUntilExp = expMs - now;
    const warnBefore = 5 * 60 * 1000; // 5 minutes
    if (msUntilExp <= 0) {
      setSessionExpiring(true);
      return;
    }
    if (msUntilExp <= warnBefore) {
      setSessionExpiring(true);
      return;
    }
    // Set timer to warn
    setTimeout(() => setSessionExpiring(true), msUntilExp - warnBefore);
  };

  const refresh = useCallback(async () => {
    try {
      const resp = await apiRefresh();
      // refresh returns json; fetchWithAuth handles cookie update
      // If we get a new access_token in response, update expiresAt
      if (resp.access_token) {
        const payload = decodeJwtPayload(resp.access_token);
        if (payload && payload.exp) {
          const exp = payload.exp * 1000;
          setExpiresAt(exp);
          scheduleExpiryTimer(exp);
        }
      }
      // reload user
      const user = await apiGetCurrentUser();
      setCurrentUser(user);
      setSessionExpiring(false);
      return true;
    } catch (err) {
      setCurrentUser(null);
      toast.error('Session expired, please login again');
      return false;
    }
  }, []);

  const value = {
    currentUser,
    setCurrentUser,
    loading,
    login,
    logout,
    refresh,
    sessionExpiring,
    expiresAt,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
