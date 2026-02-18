/**
 * Public Access Service
 * API calls for public access functionality (password-protected MP3/user access)
 */

import axios from 'axios';

// Use relative /api path (works with reverse proxy)
const API_URL = '/api/public';

/**
 * Check ID type (user or MP3)
 */
export async function checkId(id) {
  console.log('[publicAccessService] checkId called with:', id);
  try {
    const url = `${API_URL}/check/${id}`;
    console.log('[publicAccessService] GET request to:', url);
    const response = await axios.get(url);
    console.log('[publicAccessService] checkId response:', response.data);
    return response.data;
  } catch (error) {
    console.error('[publicAccessService] checkId error:', error);
    if (error.response) {
      console.error('[publicAccessService] Error response:', error.response.data);
      throw error.response.data;
    }
    throw error;
  }
}

export const checkIdType = checkId; // Alias

/**
 * Verify password for ID
 */
export async function verifyPassword(id, password) {
  console.log('[publicAccessService] 🔐🔐🔐 verifyPassword called 🔐🔐🔐');
  console.log('[publicAccessService] ID:', id);
  console.log('[publicAccessService] Password:', password);
  console.log('[publicAccessService] Password length:', password?.length);
  
  try {
    const url = `${API_URL}/verify/${id}`;
    console.log('[publicAccessService] 📡 Sending POST request to:', url);
    console.log('[publicAccessService] Request body:', { password });
    
    const response = await axios.post(url, { password });
    
    console.log('[publicAccessService] ✅✅✅ Response received ✅✅✅');
    console.log('[publicAccessService] Response status:', response.status);
    console.log('[publicAccessService] Response headers:', response.headers);
    console.log('[publicAccessService] Response data:', JSON.stringify(response.data, null, 2));
    console.log('[publicAccessService] Response.data.success:', response.data.success);
    console.log('[publicAccessService] Response.data.type:', response.data.type);
    console.log('[publicAccessService] Response.data.token:', response.data.token ? `EXISTS (${response.data.token.length} chars)` : 'MISSING');
    console.log('[publicAccessService] Response.data.user:', response.data.user ? 'EXISTS' : 'MISSING');
    
    if (response.data.user) {
      console.log('[publicAccessService] User details:', JSON.stringify(response.data.user, null, 2));
    }
    
    return response.data;
  } catch (error) {
    console.error('[publicAccessService] ❌❌❌ verifyPassword ERROR ❌❌❌');
    console.error('[publicAccessService] Error:', error);
    console.error('[publicAccessService] Error message:', error.message);
    
    if (error.response) {
      console.error('[publicAccessService] Error response status:', error.response.status);
      console.error('[publicAccessService] Error response data:', JSON.stringify(error.response.data, null, 2));
      throw error.response.data;
    }
    
    console.error('[publicAccessService] Network error or no response');
    throw error;
  }
}

/**
 * Get all MP3s for a user (public access)
 */
export async function getUserMp3List(userId, password) {
  console.log('[publicAccessService] getUserMp3List called with userId:', userId, 'password length:', password?.length);
  try {
    const url = `${API_URL}/user/${userId}?pw=${encodeURIComponent(password)}`;
    console.log('[publicAccessService] GET request to:', url);
    const response = await axios.get(url);
    console.log('[publicAccessService] getUserMp3List response:', response.data);
    return response.data;
  } catch (error) {
    console.error('[publicAccessService] getUserMp3List error:', error);
    if (error.response) {
      console.error('[publicAccessService] Error response:', error.response.data);
      throw error.response.data;
    }
    throw error;
  }
}

export const getUserMp3sPublic = getUserMp3List; // Alias

/**
 * Get single MP3 transcription (public access)
 */
export async function getMp3Transcription(mp3Id, password) {
  console.log('[publicAccessService] getMp3Transcription called with mp3Id:', mp3Id, 'password length:', password?.length);
  try {
    const url = `${API_URL}/mp3/${mp3Id}?pw=${encodeURIComponent(password)}`;
    console.log('[publicAccessService] GET request to:', url);
    const response = await axios.get(url);
    console.log('[publicAccessService] getMp3Transcription response:', response.data);
    return response.data;
  } catch (error) {
    console.error('[publicAccessService] getMp3Transcription error:', error);
    if (error.response) {
      console.error('[publicAccessService] Error response:', error.response.data);
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
