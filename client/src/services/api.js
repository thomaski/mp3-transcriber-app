// ============================================================================
// API Service
// ============================================================================
// Axios-based API calls to backend

import axios from 'axios';
import apiClient from './apiClient'; // Import authenticated client
import logger from '../utils/logger';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 600000, // 10 minutes for long-running operations
  headers: {
    'Content-Type': 'application/json'
  }
});

// Upload file
export const uploadFile = async (file) => {
  logger.log('[api.js] uploadFile called:', file?.name, file?.size);
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    logger.log('[api.js] uploadFile response:', response.data);
    return response.data;
  } catch (error) {
    logger.error('[api.js] ❌ uploadFile error:', error);
    throw new Error(error.response?.data?.error || 'Upload fehlgeschlagen');
  }
};

// Get file
export const getFile = async (filename) => {
  logger.log('[api.js] 📂 getFile called:', filename);
  
  try {
    const response = await api.get(`/files/${filename}`);
    logger.log('[api.js] ✅ getFile response:', response.data);
    return response.data;
  } catch (error) {
    logger.error('[api.js] ❌ getFile error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || 'Datei nicht gefunden');
  }
};

// Delete file
export const deleteFile = async (filename) => {
  logger.log('[api.js] 🗑️ deleteFile called:', filename);
  
  try {
    const response = await api.delete(`/files/${filename}`);
    logger.log('[api.js] ✅ deleteFile response:', response.data);
    return response.data;
  } catch (error) {
    logger.error('[api.js] ❌ deleteFile error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || 'Löschen fehlgeschlagen');
  }
};

// Load local file
export const loadLocalFile = async (filePath, type = 'mp3') => {
  logger.log('[api.js] 📁 loadLocalFile called, path:', filePath, 'type:', type);
  
  try {
    // Für MP3: Verwende Stream-URL vom Backend
    if (type === 'mp3') {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
      const streamUrl = `${backendUrl}/api/files/stream?path=${encodeURIComponent(filePath)}`;
      const filename = filePath.split(/[\\/]/).pop();
      
      logger.log('[api.js] MP3 type - stream URL erstellt:', streamUrl);
      
      return {
        success: true,
        file: {
          name: filename,
          path: filePath,
          url: streamUrl
        }
      };
    }
    
    // Für TXT: Lade Inhalt vom Backend
    if (type === 'txt') {
      logger.log('[api.js] TXT type - lade Inhalt vom Backend...');
      const response = await api.get('/files/load-local', {
        params: { path: filePath, type: 'txt' }
      });
      
      logger.log('[api.js] ✅ TXT content geladen, Länge:', response.data.content?.length || 0);
      
      return {
        success: true,
        content: response.data.content || response.data,
        path: filePath
      };
    }
    
    // Fallback für andere Typen
    const response = await api.get('/files/load-local', {
      params: { path: filePath, type: type }
    });
    
    logger.log('[api.js] ✅ Datei erfolgreich geladen');
    
    return {
      success: true,
      data: response.data,
      path: filePath
    };
  } catch (error) {
    logger.error('[api.js] ❌ loadLocalFile Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message || `Fehler beim Laden der lokalen ${type}-Datei`,
      path: filePath
    };
  }
};

// ============================================================================
// WSL2 Local Python Processing API
// ============================================================================

// List local files (MP3 or TXT)
export const listLocalFiles = async (fileType = 'mp3') => {
  logger.log('[api.js] 📋 listLocalFiles called, type:', fileType);
  
  try {
    const response = await api.get('/local-files/list', {
      params: { type: fileType }
    });
    logger.log('[api.js] ✅ listLocalFiles response:', response.data.files?.length || 0, 'files');
    return response.data;
  } catch (error) {
    logger.error('[api.js] ❌ listLocalFiles error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || 'Fehler beim Laden der Dateiliste');
  }
};

// Get local directory info
export const getLocalDirectoryInfo = async () => {
  logger.log('[api.js] 📂 getLocalDirectoryInfo called');
  
  try {
    const response = await api.get('/local-files/info');
    logger.log('[api.js] ✅ getLocalDirectoryInfo response:', response.data);
    return response.data;
  } catch (error) {
    logger.error('[api.js] ❌ getLocalDirectoryInfo error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || 'Fehler beim Abrufen der Verzeichnis-Info');
  }
};

// Transcribe local MP3 with WSL2 Python
export const transcribeLocal = async (filename, socketId) => {
  logger.log('[api.js] 🎤 transcribeLocal called, filename:', filename);
  
  try {
    const response = await api.post('/transcribe-local', {
      filename,
      socketId
    });
    logger.log('[api.js] ✅ transcribeLocal response:', response.data);
    return response.data;
  } catch (error) {
    logger.error('[api.js] ❌ transcribeLocal error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || 'Lokale Transkription fehlgeschlagen');
  }
};

// Summarize local TXT with WSL2 Python
// filename: TXT-Dateiname (optional, wenn transcription angegeben)
// socketId: Socket-ID für Live-Updates
// transcription: Direkte Transkription als String (optional, wenn filename angegeben)
export const summarizeLocal = async (filename, socketId, transcription = null) => {
  logger.log('[api.js] 📝 summarizeLocal called, filename:', filename, 'hasTranscription:', !!transcription);
  
  try {
    const payload = { socketId };
    
    if (transcription) {
      payload.transcription = transcription;
    } else if (filename) {
      payload.filename = filename;
    } else {
      throw new Error('Entweder filename oder transcription muss angegeben werden');
    }
    
    const response = await api.post('/summarize-local', payload);
    logger.log('[api.js] ✅ summarizeLocal response:', response.data);
    return response.data;
  } catch (error) {
    logger.error('[api.js] ❌ summarizeLocal error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || 'Lokale Zusammenfassung fehlgeschlagen');
  }
};

// Health check
export const healthCheck = async () => {
  logger.log('[api.js] 🏥 healthCheck called');
  
  try {
    const response = await api.get('/health');
    logger.log('[api.js] ✅ healthCheck response:', response.data);
    return response.data;
  } catch (error) {
    logger.error('[api.js] ❌ healthCheck error:', error.message);
    throw new Error('Server nicht erreichbar');
  }
};

// Save transcription to database
export const saveTranscription = async (transcriptionData) => {
  logger.log('[api.js] saveTranscription called', {
    target_user_id: transcriptionData.target_user_id,
    mp3_filename: transcriptionData.mp3_filename,
    mp3_file_present: !!transcriptionData.mp3_file,
    transcription_text_length: transcriptionData.transcription_text?.length || 0,
    has_summary: transcriptionData.has_summary
  });
  
  try {
    // Create FormData for multipart/form-data upload
    const formData = new FormData();
    
    // Add MP3 file if present
    if (transcriptionData.mp3_file) {
      formData.append('mp3File', transcriptionData.mp3_file);
    }
    
    // Add other fields
    formData.append('mp3_filename', transcriptionData.mp3_filename);
    formData.append('transcription_text', transcriptionData.transcription_text || '');
    formData.append('has_summary', transcriptionData.has_summary ? 'true' : 'false');
    
    if (transcriptionData.target_user_id) {
      formData.append('target_user_id', transcriptionData.target_user_id);
    }
    
    // Use apiClient instead of api to include Authorization header
    const response = await apiClient.post('/transcriptions', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    logger.log('[api.js] ✅ saveTranscription response, action:', response.data.action);
    return response.data;
  } catch (error) {
    logger.error('[api.js] ❌ saveTranscription error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || 'Fehler beim Speichern der Transkription');
  }
};

// Get transcription by ID
export const getTranscription = async (transcriptionId) => {
  logger.log('[api.js] getTranscription called:', transcriptionId);
  
  try {
    const response = await apiClient.get(`/transcriptions/${transcriptionId}`);
    logger.log('[api.js] ✅ getTranscription response:', response.data);
    return response.data;
  } catch (error) {
    logger.error('[api.js] ❌ getTranscription error:', error);
    throw error;
  }
};

export default api;
