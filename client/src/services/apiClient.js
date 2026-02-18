/**
 * Axios Instance with Authorization Header Interceptor
 * Automatically adds JWT token to all requests
 */

import axios from 'axios';

// WICHTIG: Verwende window.location.origin zur Laufzeit, NICHT zur Build-Zeit!
// Dadurch funktioniert es mit localhost:4000 UND mit ngrok/Cloudflare
const getBaseURL = () => {
  // Falls REACT_APP_API_URL gesetzt ist (z.B. für Tests), verwende es
  if (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.startsWith('http')) {
    return process.env.REACT_APP_API_URL;
  }
  // Ansonsten: Verwende aktuelle Browser-Origin + /api
  return `${window.location.origin}/api`;
};

// Create axios instance
const apiClient = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: Add Authorization header
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('authToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle 401 errors (but NOT for /auth/check)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect if it's an auth check request (handled by AuthContext)
      if (!error.config.url.includes('/auth/check')) {
        // Token expired or invalid - clear it
        localStorage.removeItem('authToken');
        
        // Redirect to login (only if not already on login page)
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
