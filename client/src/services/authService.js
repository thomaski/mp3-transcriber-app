/**
 * Auth Service
 * API calls for authentication with JWT in Authorization header
 */

import apiClient from './apiClient';
import logger from '../utils/logger';

/**
 * Login with username and password
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<Object>} User data and token
 */
export async function login(username, password) {
  logger.log('🔐 [authService] login aufgerufen für Benutzer:', username);
  
  try {
    const response = await apiClient.post('/auth/login', { username, password });
    logger.log('✅ [authService] Login erfolgreich, Status:', response.status);
    
    // Store token in localStorage
    if (response.data.success && response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      logger.log('💾 [authService] Token in localStorage gespeichert');
    }
    
    return response.data;
  } catch (error) {
    logger.error('❌ [authService] Login fehlgeschlagen:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Logout current user
 * @returns {Promise<Object>} Success message
 */
export async function logout() {
  // Remove token from localStorage
  localStorage.removeItem('authToken');
  
  // Inform server (optional, for audit logging)
  try {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  } catch (error) {
    // Even if server call fails, logout is successful (token removed)
    return { success: true, message: 'Erfolgreich ausgeloggt.' };
  }
}

/**
 * Get current user info
 * @returns {Promise<Object>} User data
 */
export async function getCurrentUser() {
  const response = await apiClient.get('/auth/me');
  return response.data;
}

/**
 * Check if user is authenticated (lightweight)
 * @returns {Promise<Object>} Auth status
 */
export async function checkAuth() {
  logger.log('[authService] checkAuth aufgerufen');
  
  const token = localStorage.getItem('authToken');
  logger.log('[authService] authToken vorhanden:', !!token);
  
  try {
    const response = await apiClient.get('/auth/check');
    logger.log('[authService] ✅ checkAuth erfolgreich, Status:', response.status);
    return response.data;
  } catch (error) {
    logger.error('[authService] ❌ checkAuth fehlgeschlagen:', error.response?.data || error.message);
    throw error;
  }
}

export default {
  login,
  logout,
  getCurrentUser,
  checkAuth
};
