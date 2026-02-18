/**
 * User Management Service
 * API calls for user CRUD operations (Admin-only)
 */

import apiClient from './apiClient';

/**
 * Get all users
 * @returns {Promise<Object>} Users list
 */
export async function getAllUsers() {
  const response = await apiClient.get('/users');
  return response.data;
}

/**
 * Get single user by ID
 * @param {string} userId 
 * @returns {Promise<Object>} User data
 */
export async function getUser(userId) {
  const response = await apiClient.get(`/users/${userId}`);
  return response.data;
}

/**
 * Create new user
 * @param {Object} userData { username, password, first_name, last_name, is_admin }
 * @returns {Promise<Object>} Created user
 */
export async function createUser(userData) {
  const response = await apiClient.post('/users', userData);
  return response.data;
}

/**
 * Update user
 * @param {string} userId 
 * @param {Object} userData Partial user data to update
 * @returns {Promise<Object>} Updated user
 */
export async function updateUser(userId, userData) {
  const response = await apiClient.put(`/users/${userId}`, userData);
  return response.data;
}

/**
 * Delete user
 * @param {string} userId 
 * @returns {Promise<Object>} Success message
 */
export async function deleteUser(userId) {
  const response = await apiClient.delete(`/users/${userId}`);
  return response.data;
}

/**
 * Get user's transcriptions
 * @param {string} userId 
 * @returns {Promise<Object>} Transcriptions list
 */
export async function getUserTranscriptions(userId) {
  const response = await apiClient.get(`/users/${userId}/transcriptions`);
  return response.data;
}

export default {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserTranscriptions
};
