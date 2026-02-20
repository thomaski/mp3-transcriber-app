/**
 * User Management Service
 * API calls for user CRUD operations (Admin-only)
 */

import apiClient from './apiClient';
import logger from '../utils/logger';

/**
 * Get all users
 * @returns {Promise<Object>} Users list
 */
export async function getAllUsers() {
  logger.log('[userService] getAllUsers aufgerufen');
  const response = await apiClient.get('/users');
  logger.log('[userService] getAllUsers: ', response.data?.users?.length || 0, 'Benutzer geladen');
  return response.data;
}

/**
 * Get single user by ID
 * @param {string} userId 
 * @returns {Promise<Object>} User data
 */
export async function getUser(userId) {
  logger.log('[userService] getUser aufgerufen:', userId);
  const response = await apiClient.get(`/users/${userId}`);
  return response.data;
}

/**
 * Create new user
 * @param {Object} userData { username, password, first_name, last_name, is_admin }
 * @returns {Promise<Object>} Created user
 */
export async function createUser(userData) {
  // Passwort NIEMALS loggen!
  logger.log('[userService] createUser aufgerufen:', { ...userData, password: '***' });
  const response = await apiClient.post('/users', userData);
  logger.log('[userService] ✅ Benutzer erstellt:', response.data?.user?.username);
  return response.data;
}

/**
 * Update user
 * @param {string} userId 
 * @param {Object} userData Partial user data to update
 * @returns {Promise<Object>} Updated user
 */
export async function updateUser(userId, userData) {
  // Passwort NIEMALS loggen!
  logger.log('[userService] updateUser aufgerufen:', userId, userData.password ? { ...userData, password: '***' } : userData);
  const response = await apiClient.put(`/users/${userId}`, userData);
  logger.log('[userService] ✅ Benutzer aktualisiert:', userId);
  return response.data;
}

/**
 * Delete user
 * @param {string} userId 
 * @returns {Promise<Object>} Success message
 */
export async function deleteUser(userId) {
  logger.log('[userService] deleteUser aufgerufen:', userId);
  const response = await apiClient.delete(`/users/${userId}`);
  logger.log('[userService] ✅ Benutzer gelöscht:', userId);
  return response.data;
}

/**
 * Delete transcription by ID
 * @param {string} transcriptionId 
 * @returns {Promise<Object>} Success message
 */
export async function deleteTranscription(transcriptionId) {
  logger.log('[userService] deleteTranscription aufgerufen:', transcriptionId);
  const response = await apiClient.delete(`/transcriptions/${transcriptionId}`);
  logger.log('[userService] ✅ Transkription gelöscht:', transcriptionId);
  return response.data;
}

/**
 * Get user's transcriptions
 * @param {string} userId 
 * @returns {Promise<Object>} Transcriptions list
 */
export async function getUserTranscriptions(userId) {
  logger.log('[userService] getUserTranscriptions aufgerufen:', userId);
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
  logger.log('[userService] updateUploadDirectory aufgerufen:', userId);
  const response = await apiClient.patch(`/users/${userId}/upload-directory`, { directory });
  return response.data;
}

/**
 * Get user's last upload directory
 * @param {string} userId 
 * @returns {Promise<Object>} Directory path
 */
export async function getUploadDirectory(userId) {
  logger.log('[userService] getUploadDirectory aufgerufen:', userId);
  const response = await apiClient.get(`/users/${userId}/upload-directory`);
  return response.data;
}

/**
 * Get user's last/most recent transcription
 * @param {string} userId 
 * @returns {Promise<Object>} Last transcription
 */
export async function getLastTranscription(userId) {
  logger.log('[userService] getLastTranscription aufgerufen:', userId);
  const response = await apiClient.get(`/users/${userId}/last-transcription`);
  return response.data;
}

export default {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  deleteTranscription,
  getUserTranscriptions,
  updateUploadDirectory,
  getUploadDirectory,
  getLastTranscription
};
