/**
 * Auth Service
 * API calls for authentication with JWT in Authorization header
 */

import apiClient from './apiClient';

/**
 * Login with username and password
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<Object>} User data and token
 */
export async function login(username, password) {
  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('🔐 [FRONTEND] authService.login aufgerufen:', { username });
  console.log('📡 [FRONTEND] API Request URL:', `${window.location.origin}/api/auth/login`);
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  
  try {
    console.log('📤 [FRONTEND] Sende POST Request...');
    const response = await apiClient.post('/auth/login', { username, password });
    console.log('✅ [FRONTEND] Login Response Status:', response.status);
    console.log('✅ [FRONTEND] Login Response Data:', response.data);
    
    // Store token in localStorage
    if (response.data.success && response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      console.log('💾 [FRONTEND] Token gespeichert in localStorage');
      console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    }
    
    return response.data;
  } catch (error) {
    console.error('\n❌❌❌ [FRONTEND] LOGIN FEHLER ❌❌❌');
    console.error('Error:', error);
    console.error('Error Message:', error.message);
    console.error('Error Response Status:', error.response?.status);
    console.error('Error Response Data:', error.response?.data);
    console.error('Error Config:', error.config);
    console.error('═══════════════════════════════════════════════════════════════════════════════\n');
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
  const response = await apiClient.get('/auth/check');
  return response.data;
}

export default {
  login,
  logout,
  getCurrentUser,
  checkAuth
};
