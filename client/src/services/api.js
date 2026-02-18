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
  console.log('[api.js] uploadFile called:', file?.name, file?.size);
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log('[api.js] uploadFile response:', response.data);
    return response.data;
  } catch (error) {
    console.error('[api.js] ❌ uploadFile error:', error);
    throw new Error(error.response?.data?.error || 'Upload fehlgeschlagen');
  }
};

// Get file
export const getFile = async (filename) => {
  console.log('[api.js] 📂 getFile called:', filename);
  
  try {
    console.log('[api.js] Sending GET request to /files/' + filename);
    const response = await api.get(`/files/${filename}`);
    console.log('[api.js] ✅ getFile response:', response.data);
    return response.data;
  } catch (error) {
    console.error('[api.js] ❌ getFile error:', error);
    console.error('[api.js] Error response:', error.response?.data);
    throw new Error(error.response?.data?.error || 'Datei nicht gefunden');
  }
};

// Delete file
export const deleteFile = async (filename) => {
  console.log('[api.js] 🗑️ deleteFile called:', filename);
  
  try {
    console.log('[api.js] Sending DELETE request to /files/' + filename);
    const response = await api.delete(`/files/${filename}`);
    console.log('[api.js] ✅ deleteFile response:', response.data);
    return response.data;
  } catch (error) {
    console.error('[api.js] ❌ deleteFile error:', error);
    console.error('[api.js] Error response:', error.response?.data);
    throw new Error(error.response?.data?.error || 'Löschen fehlgeschlagen');
  }
};

// Load local file
export const loadLocalFile = async (filePath, type = 'mp3') => {
  console.log('[api.js] 📁 loadLocalFile called');
  console.log('[api.js] File path:', filePath);
  console.log('[api.js] File type:', type);
  
  try {
    // Für MP3: Verwende Stream-URL vom Backend
    if (type === 'mp3') {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
      const streamUrl = `${backendUrl}/api/files/stream?path=${encodeURIComponent(filePath)}`;
      const filename = filePath.split(/[\\/]/).pop();
      
      console.log('[api.js] MP3 type - creating stream URL:', streamUrl);
      
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
      console.log('[api.js] TXT type - loading content from backend...');
      const response = await api.get('/files/load-local', {
        params: { path: filePath, type: 'txt' }
      });
      
      console.log('[api.js] ✅ TXT content loaded, length:', response.data.content?.length || 0);
      
      return {
        success: true,
        content: response.data.content || response.data,
        path: filePath
      };
    }
    
    // Fallback für andere Typen
    console.log('[api.js] Other type - loading from backend...');
    const response = await api.get('/files/load-local', {
      params: { path: filePath, type: type }
    });
    
    console.log('[api.js] ✅ File loaded successfully');
    
    return {
      success: true,
      data: response.data,
      path: filePath
    };
  } catch (error) {
    console.error('[api.js] ❌ loadLocalFile Error:', error);
    console.error('[api.js] Error response:', error.response?.data);
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
  console.log('[api.js] 📋 listLocalFiles called, type:', fileType);
  
  try {
    console.log('[api.js] Sending GET request to /local-files/list');
    const response = await api.get('/local-files/list', {
      params: { type: fileType }
    });
    console.log('[api.js] ✅ listLocalFiles response:', response.data.files?.length || 0, 'files');
    return response.data;
  } catch (error) {
    console.error('[api.js] ❌ listLocalFiles error:', error);
    console.error('[api.js] Error response:', error.response?.data);
    throw new Error(error.response?.data?.error || 'Fehler beim Laden der Dateiliste');
  }
};

// Get local directory info
export const getLocalDirectoryInfo = async () => {
  console.log('[api.js] 📂 getLocalDirectoryInfo called');
  
  try {
    console.log('[api.js] Sending GET request to /local-files/info');
    const response = await api.get('/local-files/info');
    console.log('[api.js] ✅ getLocalDirectoryInfo response:', response.data);
    return response.data;
  } catch (error) {
    console.error('[api.js] ❌ getLocalDirectoryInfo error:', error);
    console.error('[api.js] Error response:', error.response?.data);
    throw new Error(error.response?.data?.error || 'Fehler beim Abrufen der Verzeichnis-Info');
  }
};

// Transcribe local MP3 with WSL2 Python
export const transcribeLocal = async (filename, socketId) => {
  console.log('[api.js] 🎤 transcribeLocal called');
  console.log('[api.js] Filename:', filename);
  console.log('[api.js] Socket ID:', socketId);
  
  try {
    console.log('[api.js] Sending POST request to /transcribe-local');
    const response = await api.post('/transcribe-local', {
      filename,
      socketId
    });
    console.log('[api.js] ✅ transcribeLocal response:', response.data);
    return response.data;
  } catch (error) {
    console.error('[api.js] ❌ transcribeLocal error:', error);
    console.error('[api.js] Error response:', error.response?.data);
    throw new Error(error.response?.data?.error || 'Lokale Transkription fehlgeschlagen');
  }
};

// Summarize local TXT with WSL2 Python
// filename: TXT-Dateiname (optional, wenn transcription angegeben)
// socketId: Socket-ID für Live-Updates
// transcription: Direkte Transkription als String (optional, wenn filename angegeben)
export const summarizeLocal = async (filename, socketId, transcription = null) => {
  console.log('[api.js] 📝 summarizeLocal called');
  console.log('[api.js] Filename:', filename);
  console.log('[api.js] Socket ID:', socketId);
  console.log('[api.js] Has transcription:', !!transcription);
  
  try {
    const payload = { socketId };
    
    if (transcription) {
      // Direkte Transkription verwenden
      payload.transcription = transcription;
      console.log('[api.js] Using direct transcription, length:', transcription.length);
    } else if (filename) {
      // Dateiname verwenden
      payload.filename = filename;
      console.log('[api.js] Using filename:', filename);
    } else {
      console.error('[api.js] ❌ Neither filename nor transcription provided!');
      throw new Error('Entweder filename oder transcription muss angegeben werden');
    }
    
    console.log('[api.js] Sending POST request to /summarize-local');
    const response = await api.post('/summarize-local', payload);
    console.log('[api.js] ✅ summarizeLocal response:', response.data);
    return response.data;
  } catch (error) {
    console.error('[api.js] ❌ summarizeLocal error:', error);
    console.error('[api.js] Error response:', error.response?.data);
    throw new Error(error.response?.data?.error || 'Lokale Zusammenfassung fehlgeschlagen');
  }
};

// Health check
export const healthCheck = async () => {
  console.log('[api.js] 🏥 healthCheck called');
  
  try {
    console.log('[api.js] Sending GET request to /health');
    const response = await api.get('/health');
    console.log('[api.js] ✅ healthCheck response:', response.data);
    return response.data;
  } catch (error) {
    console.error('[api.js] ❌ healthCheck error:', error);
    console.error('[api.js] Error response:', error.response?.data);
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

