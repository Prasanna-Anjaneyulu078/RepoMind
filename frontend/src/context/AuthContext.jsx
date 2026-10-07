import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchApi } from '../utils/apiClient.js';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const data = await fetchApi(`${backendUrl}/api/auth/me`, {
        credentials: 'include',
      }, true); // skipPopup for 401 auth checks
      
      if (data.success && data.data) {
        setUser(data.data);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user session', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const loginWithGitHub = (forceConsent = false) => {
    // Redirect to backend OAuth endpoint
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    window.location.href = `${backendUrl}/api/auth/github${forceConsent ? '?prompt=consent' : ''}`;
  };

  const logout = async () => {
    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await fetchApi(`${backendUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      }, true);
    } catch (error) {
      console.error('Failed to logout', error);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, loginWithGitHub, logout, setUser, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
