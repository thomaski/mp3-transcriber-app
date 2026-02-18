// ============================================================================
// API Service
// ============================================================================
// Axios-based API calls to backend

import axios from 'axios';
import apiClient from './apiClient'; // Import authenticated client

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
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Upload fehlgeschlagen');
  }
};

// Get file
export const getFile = async (filename) => {
  try {
    const response = await api.get(`/files/${filename}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Datei nicht gefunden');
  }
};

// Delete file
export const deleteFile = async (filename) => {
  try {
    const response = await api.delete(`/files/${filename}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Löschen fehlgeschlagen');
  }
};

// Load local file
export const loadLocalFile = async (filePath, type = 'mp3') => {
  try {
    // Für MP3: Verwende Stream-URL vom Backend
    if (type === 'mp3') {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
      const streamUrl = `${backendUrl}/api/files/stream?path=${encodeURIComponent(filePath)}`;
      const filename = filePath.split(/[\\/]/).pop();
      
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
      const response = await api.get('/files/load-local', {
        params: { path: filePath, type: 'txt' }
      });
      
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
    
    return {
      success: true,
      data: response.data,
      path: filePath
    };
  } catch (error) {
    console.error('❌ loadLocalFile Error:', error);
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
  try {
    const response = await api.get('/local-files/list', {
      params: { type: fileType }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Fehler beim Laden der Dateiliste');
  }
};

// Get local directory info
export const getLocalDirectoryInfo = async () => {
  try {
    const response = await api.get('/local-files/info');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Fehler beim Abrufen der Verzeichnis-Info');
  }
};

// Transcribe local MP3 with WSL2 Python
export const transcribeLocal = async (filename, socketId) => {
  try {
    const response = await api.post('/transcribe-local', {
      filename,
      socketId
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Lokale Transkription fehlgeschlagen');
  }
};

// Summarize local TXT with WSL2 Python
// filename: TXT-Dateiname (optional, wenn transcription angegeben)
// socketId: Socket-ID für Live-Updates
// transcription: Direkte Transkription als String (optional, wenn filename angegeben)
export const summarizeLocal = async (filename, socketId, transcription = null) => {
  try {
    const payload = { socketId };
    
    if (transcription) {
      // Direkte Transkription verwenden
      payload.transcription = transcription;
    } else if (filename) {
      // Dateiname verwenden
      payload.filename = filename;
    } else {
      throw new Error('Entweder filename oder transcription muss angegeben werden');
    }
    
    const response = await api.post('/summarize-local', payload);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Lokale Zusammenfassung fehlgeschlagen');
  }
};

// Health check
export const healthCheck = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    throw new Error('Server nicht erreichbar');
  }
};

// Save transcription to database
export const saveTranscription = async (transcriptionData) => {
  console.log('[api.js] saveTranscription called');
  console.log('[api.js] transcriptionData:', {
    target_user_id: transcriptionData.target_user_id,
    mp3_filename: transcriptionData.mp3_filename,
    mp3_file_present: !!transcriptionData.mp3_file,
    transcription_text_length: transcriptionData.transcription_text?.length || 0,
    has_summary: transcriptionData.has_summary
  });
  
  try {
    console.log('[api.js] Preparing FormData...');
    
    // Create FormData for multipart/form-data upload
    const formData = new FormData();
    
    // Add MP3 file if present
    if (transcriptionData.mp3_file) {
      formData.append('mp3File', transcriptionData.mp3_file);
      console.log('[api.js] Added MP3 file to FormData:', transcriptionData.mp3_file.name);
    }
    
    // Add other fields
    formData.append('mp3_filename', transcriptionData.mp3_filename);
    formData.append('transcription_text', transcriptionData.transcription_text || '');
    formData.append('has_summary', transcriptionData.has_summary ? 'true' : 'false');
    
    if (transcriptionData.target_user_id) {
      formData.append('target_user_id', transcriptionData.target_user_id);
      console.log('[api.js] Added target_user_id to FormData:', transcriptionData.target_user_id);
    }
    
    console.log('[api.js] Sending POST request to /api/transcriptions with FormData...');
    
    // Use apiClient instead of api to include Authorization header
    const response = await apiClient.post('/transcriptions', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log('[api.js] saveTranscription response:', response.data);
    console.log('[api.js] Action:', response.data.action);
    console.log('[api.js] Transcription ID:', response.data.transcriptionId || response.data.id);
    
    return response.data;
  } catch (error) {
    console.error('[api.js] saveTranscription error:', error);
    console.error('[api.js] Error response:', error.response);
    console.error('[api.js] Error response data:', error.response?.data);
    throw new Error(error.response?.data?.error || 'Fehler beim Speichern der Transkription');
  }
};

export default api;

