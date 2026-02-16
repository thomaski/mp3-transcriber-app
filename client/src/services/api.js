// ============================================================================
// API Service
// ============================================================================
// Axios-based API calls to backend

import axios from 'axios';

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

// Transcribe audio
export const transcribeAudio = async (filename, socketId) => {
  try {
    const response = await api.post('/transcribe', {
      filePath: filename,
      socketId
    });
    
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Transkription fehlgeschlagen');
  }
};

// Summarize text
export const summarizeText = async (transcription, promptType = 'durchgabe', socketId) => {
  try {
    const response = await api.post('/summarize', {
      transcription,
      promptType,
      socketId
    });
    
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Zusammenfassung fehlgeschlagen');
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
      const backendUrl = process.env.REACT_APP_BACKEND_URL || window.location.protocol + '//' + window.location.hostname + ':5000';
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

export default api;
