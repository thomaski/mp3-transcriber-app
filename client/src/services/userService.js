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

/**
 * Update user's last upload directory
 * @param {string} userId 
 * @param {string} directory Path to directory
 * @returns {Promise<Object>} Success response
 */
export async function updateUploadDirectory(userId, directory) {
  console.log('[userService] updateUploadDirectory called:', userId, directory);
  const response = await apiClient.patch(`/users/${userId}/upload-directory`, { directory });
  console.log('[userService] updateUploadDirectory response:', response.data);
  return response.data;
}

/**
 * Get user's last upload directory
 * @param {string} userId 
 * @returns {Promise<Object>} Directory path
 */
export async function getUploadDirectory(userId) {
  console.log('[userService] getUploadDirectory called:', userId);
  const response = await apiClient.get(`/users/${userId}/upload-directory`);
  console.log('[userService] getUploadDirectory response:', response.data);
  return response.data;
}

/**
 * Get user's last/most recent transcription
 * @param {string} userId 
 * @returns {Promise<Object>} Last transcription
 */
export async function getLastTranscription(userId) {
  console.log('[userService] getLastTranscription called:', userId);
  const response = await apiClient.get(`/users/${userId}/last-transcription`);
  console.log('[userService] getLastTranscription response:', response.data);
  return response.data;
}

export default {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserTranscriptions,
  updateUploadDirectory,
  getUploadDirectory,
  getLastTranscription
};
