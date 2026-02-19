/**
 * Public Access Service
 * API calls for public access functionality (password-protected MP3/user access)
 */

import axios from 'axios';
import logger from '../utils/logger';

// Use relative /api path (works with reverse proxy)
const API_URL = '/api/public';

/**
 * Check ID type (user or MP3)
 * @param {string} id - Public access ID
 * @returns {Promise<Object>} ID type info
 */
export async function checkId(id) {
  logger.log('[publicAccessService] checkId aufgerufen:', id);
  try {
    const response = await axios.get(`${API_URL}/check/${id}`);
    logger.log('[publicAccessService] checkId Ergebnis:', response.data?.type);
    return response.data;
  } catch (error) {
    logger.error('[publicAccessService] checkId Fehler:', error.response?.data || error.message);
    if (error.response) {
      throw error.response.data;
    }
    throw error;
  }
}

export const checkIdType = checkId; // Alias

/**
 * Verify password for ID
 * @param {string} id - Public access ID
 * @param {string} password - Access password (NIEMALS loggen!)
 * @returns {Promise<Object>} Auth token and access data
 */
export async function verifyPassword(id, password) {
  // Passwort NIEMALS loggen - nur die ID
  logger.log('[publicAccessService] verifyPassword aufgerufen für ID:', id);
  
  try {
    const response = await axios.post(`${API_URL}/verify/${id}`, { password });
    
    logger.log('[publicAccessService] ✅ verifyPassword erfolgreich, type:', response.data?.type);
    return response.data;
  } catch (error) {
    logger.error('[publicAccessService] ❌ verifyPassword Fehler:', error.response?.data || error.message);
    
    if (error.response) {
      throw error.response.data;
    }
    
    throw error;
  }
}

/**
 * Get all MP3s for a user (public access)
 * @param {string} userId - User ID
 * @param {string} password - Access password
 * @returns {Promise<Object>} MP3 list
 */
export async function getUserMp3List(userId, password) {
  logger.log('[publicAccessService] getUserMp3List aufgerufen, userId:', userId);
  try {
    const response = await axios.get(`${API_URL}/user/${userId}?pw=${encodeURIComponent(password)}`);
    logger.log('[publicAccessService] getUserMp3List: ', response.data?.mp3s?.length || 0, 'MP3s geladen');
    return response.data;
  } catch (error) {
    logger.error('[publicAccessService] getUserMp3List Fehler:', error.response?.data || error.message);
    if (error.response) {
      throw error.response.data;
    }
    throw error;
  }
}

export const getUserMp3sPublic = getUserMp3List; // Alias

/**
 * Get single MP3 transcription (public access)
 * @param {string} mp3Id - MP3 ID
 * @param {string} password - Access password
 * @returns {Promise<Object>} Transcription data
 */
export async function getMp3Transcription(mp3Id, password) {
  logger.log('[publicAccessService] getMp3Transcription aufgerufen, mp3Id:', mp3Id);
  try {
    const response = await axios.get(`${API_URL}/mp3/${mp3Id}?pw=${encodeURIComponent(password)}`);
    logger.log('[publicAccessService] ✅ getMp3Transcription erfolgreich');
    return response.data;
  } catch (error) {
    logger.error('[publicAccessService] getMp3Transcription Fehler:', error.response?.data || error.message);
    if (error.response) {
      throw error.response.data;
    }
    throw error;
  }
}

export const getMp3Public = getMp3Transcription; // Alias

const publicAccessService = {
  checkId,
  checkIdType,
  verifyPassword,
  getUserMp3List,
  getUserMp3sPublic,
  getMp3Transcription,
  getMp3Public
};

export default publicAccessService;
